'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface StorySection {
  photoId: string;
  narrationText: string;
  speakerName: string;
}

interface PhotoData {
  id: string;
  url: string;
  animatedUrl: string | null;
  summary: string | null;
  duration?: number; // clip duration for film mode
}

type ViewMode = 'watch' | 'read' | 'film';

// ============================================================================
// LIVING STORYBOOK PAGE
// ============================================================================

export default function LivingStorybookPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const initialMode = (searchParams.get('mode') as ViewMode) || 'watch';

  // Data states
  const [albumTitle, setAlbumTitle] = useState('');
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [sections, setSections] = useState<StorySection[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string; relationship?: string; voice_clone_id?: string | null }>>([]);

  // Refs that always hold the latest data — avoids stale closures in playback
  const sectionsRef = useRef<StorySection[]>([]);
  sectionsRef.current = sections;
  const photosRef = useRef<PhotoData[]>([]);
  photosRef.current = photos;

  // UI states
  const [phase, setPhase] = useState<'loading' | 'playing' | 'ended'>('loading');
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [fadeState, setFadeState] = useState<'in' | 'out' | 'visible'>('in');
  const [error, setError] = useState<string | null>(null);
  const [generatingStory, setGeneratingStory] = useState(false);

  // Book mode voice playback
  const [bookPlayingIdx, setBookPlayingIdx] = useState<number | null>(null);
  const [bookVoiceLoading, setBookVoiceLoading] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (!eventId) return;

    const load = async () => {
      try {
        // Fetch event info, photos, members, and saved narration in parallel
        const [eventRes, photosRes, membersRes, narrationRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/photos`),
          fetch('/api/auth/members'),
          fetch(`/api/events/${eventId}/narration`),
        ]);

        let title = 'Family Memories';
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          title = eventData.title || title;
          setAlbumTitle(title);
        }

        let photoList: PhotoData[] = [];
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          const rawPhotos = photosData.photos || [];
          photoList = rawPhotos.map((p: any) => ({
            id: p.id,
            url: p.thumbnail_url || p.original_url || '/testphoto.jpg',
            animatedUrl: p.animated_url || null,
            summary: p.summary || null,
            duration: 5,
          }));
          setPhotos(photoList);
        }

        let memberList: any[] = [];
        if (membersRes.ok) {
          memberList = await membersRes.json();
          setMembers(memberList);
        }

        if (photoList.length === 0) {
          setError('No photos found in this album');
          return;
        }

        // Try saved narration first (consistent, persisted from editor)
        let loadedSections: StorySection[] = [];
        if (narrationRes.ok) {
          const narrationData = await narrationRes.json();
          if (narrationData.segments && narrationData.segments.length > 0) {
            loadedSections = narrationData.segments
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((seg: any) => ({
                photoId: seg.photo_id,
                narrationText: seg.text || '',
                speakerName: 'Narrator',
              }));
          }
        }

        // Fallback: generate with Gemini if no saved narration
        if (loadedSections.length === 0) {
          setGeneratingStory(true);
          try {
            const storyRes = await fetch(`/api/events/${eventId}/storybook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                photos: photoList,
                albumTitle: title,
                members: memberList.map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  relationship: m.relationship,
                })),
              }),
            });

            if (storyRes.ok) {
              const storyData = await storyRes.json();
              loadedSections = storyData.sections || [];
            }
          } catch { /* fall through */ }
          setGeneratingStory(false);
        }

        // Final fallback: simple captions
        if (loadedSections.length === 0) {
          loadedSections = photoList.map((p, i) => ({
            photoId: p.id,
            narrationText: p.summary || `A cherished moment, number ${i + 1} in this collection.`,
            speakerName: 'Narrator',
          }));
        }

        // Store in both state AND ref, then start playback directly
        setSections(loadedSections);
        sectionsRef.current = loadedSections;
        photosRef.current = photoList;

        // Go straight to playing — no intermediate 'ready' phase
        isStopped.current = false;
        setViewMode(initialMode);
        setCurrentIndex(0);
        setFadeState('in');
        setPhase('playing');

        // Kick off playback after a frame so React has painted the playing UI
        requestAnimationFrame(() => {
          if (initialMode === 'watch') {
            narrateSectionDirect(0, loadedSections);
          } else if (initialMode === 'film') {
            playFilmSectionDirect(0, loadedSections, photoList);
          }
        });
      } catch (err) {
        console.error('Storybook load error:', err);
        setError('Failed to load storybook');
      }
    };

    load();
  }, [eventId, initialMode]);

  // ============================================================================
  // VOICE HELPERS
  // ============================================================================

  const getVoiceId = useCallback(() => {
    const localVoice = typeof window !== 'undefined' ? localStorage.getItem('clonedVoiceId') : null;
    if (localVoice) return localVoice;
    const memberWithVoice = members.find(m => m.voice_clone_id);
    return memberWithVoice?.voice_clone_id || null;
  }, [members]);

  const playVoiceTTS = useCallback(async (text: string, onEnd?: () => void): Promise<void> => {
    // Always stop any existing audio first
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (isStopped.current) return;

    const voiceId = getVoiceId();
    if (voiceId) {
      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId, options: { stability: 0.5, similarityBoost: 0.75 } }),
        });
        if (isStopped.current) return;
        const data = await res.json();
        if (data.success && data.audioUrl) {
          if (!audioRef.current) audioRef.current = new Audio();
          audioRef.current.src = data.audioUrl;
          audioRef.current.onended = () => { if (!isStopped.current) onEnd?.(); };
          audioRef.current.onerror = () => { if (!isStopped.current) onEnd?.(); };
          await audioRef.current.play();
          return;
        }
      } catch { /* fall through */ }
    }
    if (isStopped.current) return;
    // Fallback: timed display
    const words = text.split(/\s+/).length;
    const readingTimeMs = Math.max(4000, words * 400);
    autoAdvanceTimerRef.current = setTimeout(() => { if (!isStopped.current) onEnd?.(); }, readingTimeMs);
  }, [getVoiceId]);

  const isStopped = useRef(false);

  const stopAudio = useCallback(() => {
    isStopped.current = true;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  // ============================================================================
  // WATCH MODE PLAYBACK — uses refs to avoid stale closures
  // ============================================================================

  const narrateSectionDirect = useCallback(async (sectionIndex: number, secs?: StorySection[]) => {
    const currentSections = secs || sectionsRef.current;
    if (isStopped.current) return;
    if (sectionIndex >= currentSections.length) {
      setPhase('ended');
      return;
    }

    const section = currentSections[sectionIndex];
    setCurrentIndex(sectionIndex);
    setFadeState('in');
    setIsNarrating(true);

    await new Promise(r => setTimeout(r, 600));
    if (isStopped.current) return;
    setFadeState('visible');

    await playVoiceTTS(section.narrationText, () => {
      if (isStopped.current) return;
      setIsNarrating(false);
      setFadeState('out');
      autoAdvanceTimerRef.current = setTimeout(() => {
        if (!isStopped.current) narrateSectionDirect(sectionIndex + 1);
      }, 1200);
    });
  }, [playVoiceTTS]);

  // ============================================================================
  // FILM MODE PLAYBACK — uses refs to avoid stale closures
  // ============================================================================

  const playFilmSectionDirect = useCallback((sectionIndex: number, secs?: StorySection[], phs?: PhotoData[]) => {
    const currentSections = secs || sectionsRef.current;
    const currentPhotos = phs || photosRef.current;
    if (isStopped.current) return;
    if (sectionIndex >= currentSections.length) {
      setPhase('ended');
      return;
    }

    setCurrentIndex(sectionIndex);
    setFadeState('in');
    setTimeout(() => { if (!isStopped.current) setFadeState('visible'); }, 300);

    const photo = currentPhotos.find(p => p.id === currentSections[sectionIndex]?.photoId) || currentPhotos[sectionIndex];
    const duration = (photo?.duration || 5) * 1000;

    autoAdvanceTimerRef.current = setTimeout(() => {
      if (isStopped.current) return;
      setFadeState('out');
      setTimeout(() => { if (!isStopped.current) playFilmSectionDirect(sectionIndex + 1); }, 800);
    }, duration);
  }, []);

  // ============================================================================
  // CONTROLS
  // ============================================================================

  const handleReplay = useCallback((mode: ViewMode) => {
    isStopped.current = false;
    setViewMode(mode);
    setCurrentIndex(0);
    setFadeState('in');
    setPhase('playing');

    if (mode === 'watch') {
      narrateSectionDirect(0);
    } else if (mode === 'film') {
      playFilmSectionDirect(0);
    }
  }, [narrateSectionDirect, playFilmSectionDirect]);

  const handleStop = useCallback(() => {
    // Stop audio immediately and synchronously before navigating
    isStopped.current = true;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    stopAudio();
    // Small delay to ensure audio is fully stopped before navigation
    setTimeout(() => router.back(), 50);
  }, [stopAudio, router]);

  // handleExit is same as handleStop
  const handleExit = handleStop;

  const handleNext = useCallback(() => {
    stopAudio();
    const secs = sectionsRef.current;
    const next = Math.min(currentIndex + 1, secs.length - 1);
    if (viewMode === 'watch') narrateSectionDirect(next);
    else if (viewMode === 'film') playFilmSectionDirect(next);
    else setCurrentIndex(next);
  }, [currentIndex, viewMode, narrateSectionDirect, playFilmSectionDirect, stopAudio]);

  const handlePrev = useCallback(() => {
    stopAudio();
    const prev = Math.max(currentIndex - 1, 0);
    if (viewMode === 'watch') narrateSectionDirect(prev);
    else if (viewMode === 'film') playFilmSectionDirect(prev);
    else setCurrentIndex(prev);
  }, [currentIndex, viewMode, narrateSectionDirect, playFilmSectionDirect, stopAudio]);

  // Book mode: play single page voice
  const handleBookVoice = useCallback(async (idx: number) => {
    if (bookPlayingIdx === idx) {
      stopAudio();
      setBookPlayingIdx(null);
      return;
    }
    stopAudio();
    setBookVoiceLoading(idx);
    setBookPlayingIdx(idx);
    const secs = sectionsRef.current;
    await playVoiceTTS(secs[idx]?.narrationText || '', () => setBookPlayingIdx(null));
    setBookVoiceLoading(null);
  }, [bookPlayingIdx, playVoiceTTS, stopAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isStopped.current = true;
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, []);

  // Current photo
  const currentSection = sections[currentIndex];
  const currentPhoto = currentSection
    ? photos.find(p => p.id === currentSection.photoId) || photos[currentIndex]
    : photos[0];

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[300]">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full border-2 border-cyan-400/30 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
        </div>
        <h2 className="text-white text-2xl font-light mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
          {generatingStory ? 'EVA is weaving your story...' : 'Loading album...'}
        </h2>
        <p className="text-white/40 text-sm">
          {generatingStory ? 'Creating a narrative from your memories and perspectives' : 'Gathering photos and stories'}
        </p>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR
  // ============================================================================

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[300]">
        <p className="text-white/60 text-lg mb-4">{error}</p>
        <button onClick={() => router.back()} className="px-6 py-3 rounded-full text-white font-medium" style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)' }}>
          Go Back
        </button>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ENDED
  // ============================================================================

  if (phase === 'ended') {
    return (
      <div className="fixed inset-0 bg-black z-[300]">
        <div className="absolute inset-0 opacity-20">
          {currentPhoto && <img src={currentPhoto.url} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-400/30 flex items-center justify-center mb-8">
            <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
          </div>
          <h2 className="text-white text-3xl font-light mb-3" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>The End</h2>
          <p className="text-white/40 mb-8">{albumTitle}</p>
          <div className="flex gap-4">
            <button onClick={() => handleReplay(viewMode)} className="flex items-center gap-2 px-8 py-3 rounded-full text-white font-medium" style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)' }}>
              Replay
            </button>
            <button onClick={handleStop} className="flex items-center gap-2 px-8 py-3 rounded-full text-white/70 font-medium bg-white/10 border border-white/20 hover:bg-white/15 transition-colors">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: READ / BOOK MODE
  // ============================================================================

  if (viewMode === 'read') {
    const section = sections[currentIndex];
    const photo = section ? photos.find(p => p.id === section.photoId) || photos[currentIndex] : photos[0];
    const isVoicePlaying = bookPlayingIdx === currentIndex;
    const isVoiceLoading = bookVoiceLoading === currentIndex;

    return (
      <div className="fixed inset-0 z-[300] overflow-hidden" style={{ background: '#f5f0e8' }}>
        {/* Parchment texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <button onClick={handleStop} className="flex items-center gap-2 text-[#6b5e4e] hover:text-[#3d3428] transition-colors text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            Close
          </button>
          <span className="text-[#8a7e6e] text-sm">{currentIndex + 1} / {sections.length}</span>
          <div className="w-16" />
        </div>

        {/* Book spread */}
        <div className="h-full flex items-center justify-center p-8 pt-16 pb-20">
          <div className="w-full max-w-6xl h-full max-h-[80vh] flex rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#faf7f2', boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            {/* Left: Photo */}
            <div className="w-1/2 relative bg-black">
              {photo?.animatedUrl ? (
                <video src={photo.animatedUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : photo ? (
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>

            {/* Right: Story text */}
            <div className="w-1/2 flex flex-col p-10 md:p-14 overflow-y-auto">
              {/* Chapter number */}
              <p className="text-[#b0a690] text-xs tracking-[0.3em] uppercase mb-6">Chapter {currentIndex + 1}</p>

              {/* Narration text */}
              <p className="text-[#3d3428] text-xl md:text-2xl leading-relaxed flex-1" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {section?.narrationText}
              </p>

              {/* Voice play button */}
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid #e8e0d4' }}>
                <button
                  onClick={() => handleBookVoice(currentIndex)}
                  disabled={isVoiceLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    isVoicePlaying
                      ? 'bg-cyan-500/10 text-cyan-700 border border-cyan-400/40'
                      : 'bg-[#ebe5d9] text-[#6b5e4e] hover:bg-[#e0d8c8] border border-[#d4cbb8]'
                  }`}
                >
                  {isVoiceLoading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                  ) : isVoicePlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                  )}
                  {isVoicePlaying ? 'Stop' : 'Listen'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 shadow-lg flex items-center justify-center text-[#6b5e4e] hover:bg-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
        )}
        {currentIndex < sections.length - 1 && (
          <button onClick={() => { stopAudio(); setBookPlayingIdx(null); setCurrentIndex(currentIndex + 1); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 shadow-lg flex items-center justify-center text-[#6b5e4e] hover:bg-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        )}
        {currentIndex === sections.length - 1 && (
          <button onClick={() => setPhase('ended')} className="absolute right-4 top-1/2 -translate-y-1/2 px-5 py-3 rounded-full bg-white/80 shadow-lg text-[#6b5e4e] hover:bg-white transition-colors text-sm font-medium">
            Finish
          </button>
        )}

        {/* Page dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => { stopAudio(); setBookPlayingIdx(null); setCurrentIndex(i); }}
              className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-[#6b5e4e] scale-125' : 'bg-[#c4baa8] hover:bg-[#a89a86]'}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: WATCH & FILM MODE (full-screen cinematic)
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black z-[300] overflow-hidden">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-white/10">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-500" style={{ width: `${((currentIndex + 1) / sections.length) * 100}%` }} />
      </div>

      {/* Photo */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${fadeState === 'out' ? 'opacity-0' : 'opacity-100'}`}>
        {currentPhoto?.animatedUrl ? (
          <video key={currentPhoto.id + '-v'} src={currentPhoto.animatedUrl} autoPlay loop muted={false} playsInline className="w-full h-full object-cover" />
        ) : currentPhoto ? (
          <img key={currentPhoto.id + '-i'} src={currentPhoto.url} alt="" className="w-full h-full object-cover animate-kenburns" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={handleStop} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          Close
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${viewMode === 'watch' ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white/50'}`}>
            {viewMode === 'watch' ? 'Narrated' : 'Slideshow'}
          </span>
          <span className="text-white/40 text-sm">{currentIndex + 1} / {sections.length}</span>
        </div>
        {viewMode === 'watch' && (
          <button onClick={() => setShowSubtitle(prev => !prev)} className={`text-sm px-3 py-1 rounded-full transition-colors ${showSubtitle ? 'text-white/80 bg-white/10' : 'text-white/30'}`}>
            CC
          </button>
        )}
        {viewMode === 'film' && <div className="w-8" />}
      </div>

      {/* Nav zones */}
      {currentIndex > 0 && (
        <button onClick={handlePrev} className="absolute left-0 top-1/4 bottom-1/4 w-1/5 z-20 flex items-center justify-start pl-6 opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </div>
        </button>
      )}
      {currentIndex < sections.length - 1 && (
        <button onClick={handleNext} className="absolute right-0 top-1/4 bottom-1/4 w-1/5 z-20 flex items-center justify-end pr-6 opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </div>
        </button>
      )}

      {/* Subtitles (watch mode only) */}
      {viewMode === 'watch' && showSubtitle && currentSection && (
        <div className={`absolute bottom-0 left-0 right-0 z-20 p-8 md:p-12 transition-opacity duration-700 ${fadeState === 'out' ? 'opacity-0' : fadeState === 'in' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="max-w-3xl mx-auto">
            <p className="text-white text-xl md:text-2xl leading-relaxed text-center" style={{ fontFamily: 'var(--font-crimson), Georgia, serif', textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)' }}>
              {currentSection.narrationText}
            </p>
            {isNarrating && viewMode === 'watch' && getVoiceId() && (
              <div className="flex items-center justify-center gap-1 mt-4">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="w-0.5 bg-cyan-400/60 rounded-full animate-pulse" style={{ height: `${6 + Math.random() * 14}px`, animationDelay: `${i * 0.08}s`, animationDuration: `${0.3 + Math.random() * 0.5}s` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes kenburns {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.08) translate(-1%, -1%); }
          100% { transform: scale(1.12) translate(1%, -0.5%); }
        }
        .animate-kenburns {
          animation: kenburns 12s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}
