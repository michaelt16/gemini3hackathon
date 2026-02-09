'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUserName } from '@/hooks/use-user-name';
import { useTheme } from '@/contexts/ThemeContext';

const VideoPlayerWithTime = dynamic(
  () => import('@/components/VideoPlayerWithTime'),
  { ssr: false }
);

// EVA orb and capture are now provided globally by EVAPanel in the main layout

const ScrapbookModal = dynamic(
  () => import('@/components/ScrapbookModal'),
  { ssr: false }
);

// ============================================================================
// TYPES
// ============================================================================

interface AlbumMember {
  id: string;
  name: string;
  relationship?: string;
  avatar_color: string;
  voice_clone_id?: string | null;
}

interface Photo {
  id: string;
  original_url: string | null;
  thumbnail_url: string | null;
  animated_url: string | null;
  has_story: boolean;
  summary: string | null;
  order_in_album: number | null;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  date_start: string | null;
  location: string | null;
  video_url: string | null;
}

interface Perspective {
  memberId: string;
  memberName: string;
  relationship: string;
  avatarColor: string;
  quote: string;
  voiceCloneId?: string | null;
}

interface PhotoWithPerspectives extends Photo {
  perspectives: Perspective[];
  combinedStory: string;
}

// ============================================================================
// ICONS
// ============================================================================

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

  // ============================================================================
// PERSPECTIVE TEMPLATES
  // ============================================================================

const PERSPECTIVE_QUOTES = [
  "I remember this moment so clearly! It was right after we finished setting up.",
  "Look at everyone's faces here - pure joy. This was such a special day.",
  "I was probably 5 or 6 here? I don't remember much but I remember feeling so loved.",
  "This was right before the big surprise. We were all trying so hard not to give it away.",
  "Grandma made her famous pie that day. I can still taste it.",
  "That old house in the background - so many memories there before we moved.",
  "Uncle Joe told the funniest joke right before this was taken. That's why everyone's smiling.",
  "Mom always made us pose for photos. We complained then, but I'm so grateful now.",
  "This was the trip where we got lost for 3 hours. Best adventure ever.",
  "I think this was taken right after we got the news. Everyone was so happy.",
];

const COMBINED_STORY_TEMPLATES = [
  "This moment captured more than just a scene - it captured a feeling. {member1} remembers the anticipation in the air, while {member2} recalls the warmth of being together. What makes this memory special isn't just what happened, but how each person experienced it differently, yet felt the same love.",
  "A photograph freezes time, but the stories around it keep the moment alive. {member1}'s memory of this day focuses on the small details, while {member2} remembers the big picture. Together, they paint a complete portrait of this treasured moment.",
  "Some moments become family legend. {member1} was there to witness it firsthand, and {member2} carries their own piece of this memory. Each perspective adds a thread to the story, weaving something richer than any single viewpoint could capture.",
];

  // ============================================================================
  // HELPERS
  // ============================================================================

function getPhotoPerspectives(photoIndex: number, members: AlbumMember[]): Perspective[] {
  const numPerspectives = 1 + (photoIndex % 3);
  const perspectives: Perspective[] = [];
  
  for (let i = 0; i < numPerspectives && i < members.length; i++) {
    const memberIndex = (photoIndex + i) % members.length;
    const member = members[memberIndex];
    const quoteIndex = (photoIndex * 3 + i * 7) % PERSPECTIVE_QUOTES.length;
    perspectives.push({
      memberId: member.id,
      memberName: member.name,
      relationship: member.relationship || '',
      avatarColor: member.avatar_color,
      quote: PERSPECTIVE_QUOTES[quoteIndex],
      voiceCloneId: member.voice_clone_id || null,
    });
  }
  
  return perspectives;
}

function getCombinedStory(perspectives: Perspective[]): string {
  if (perspectives.length === 0) return "No perspectives shared yet. Be the first to share your memory of this moment.";
  if (perspectives.length === 1) {
    return `${perspectives[0].memberName} shared their memory of this moment: "${perspectives[0].quote}" Their perspective helps keep this memory alive for the whole family.`;
  }
  
  const template = COMBINED_STORY_TEMPLATES[perspectives.length % COMBINED_STORY_TEMPLATES.length];
  return template
    .replace('{member1}', perspectives[0].memberName)
    .replace('{member2}', perspectives[1]?.memberName || perspectives[0].memberName);
}

  // ============================================================================
// MAIN COMPONENT
  // ============================================================================

export default function AlbumViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const { userName } = useUserName();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [members, setMembers] = useState<AlbumMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrapbook, setShowScrapbook] = useState(searchParams.get('scrapbook') === '1');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Copy-to-album state
  const [contextMenuPhotoId, setContextMenuPhotoId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showCopyToAlbumModal, setShowCopyToAlbumModal] = useState(false);
  const [copyToPhotoId, setCopyToPhotoId] = useState<string | null>(null);
  const [allAlbums, setAllAlbums] = useState<{ id: string; title: string }[]>([]);
  const [isCopyingPhoto, setIsCopyingPhoto] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  // Voice playback state for perspectives
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState<string | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const playPerspectiveVoice = useCallback(async (memberId: string, voiceCloneId: string, text: string) => {
    // Stop any currently playing voice
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.src = '';
    }

    // If clicking the same one that's playing, just stop
    if (playingVoiceId === memberId) {
      setPlayingVoiceId(null);
      return;
    }

    setVoiceLoading(memberId);
    setPlayingVoiceId(null);

    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: voiceCloneId,
          options: { stability: 0.5, similarityBoost: 0.75 },
        }),
      });

      const data = await res.json();
      if (data.success && data.audioUrl) {
        if (!voiceAudioRef.current) {
          voiceAudioRef.current = new Audio();
        }
        voiceAudioRef.current.src = data.audioUrl;
        voiceAudioRef.current.onended = () => setPlayingVoiceId(null);
        voiceAudioRef.current.onerror = () => setPlayingVoiceId(null);
        await voiceAudioRef.current.play();
        setPlayingVoiceId(memberId);
      }
    } catch (err) {
      console.error('Voice TTS error:', err);
    } finally {
      setVoiceLoading(null);
    }
  }, [playingVoiceId]);

  // Fetch event data + members
  useEffect(() => {
    if (!eventId) return;
    
    let cancelled = false;
    
    const fetchData = async () => {
      try {
        const [eventRes, photosRes, membersRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/photos`),
          fetch(`/api/events/${eventId}/members`).catch(() => null),
        ]);
        
        if (!cancelled) {
          if (eventRes.ok) {
            const eventData = await eventRes.json();
            setEvent(eventData);
          }
          if (photosRes.ok) {
            const photosData = await photosRes.json();
            setPhotos(photosData.photos || []);
          }
          // Load members from album_members or fallback to family_members
          let membersLoaded = false;
          if (membersRes && membersRes.ok) {
            const membersData = await membersRes.json();
            if (Array.isArray(membersData) && membersData.length > 0) {
              // Deduplicate members by id AND name to prevent duplicates
              const seenIds = new Set<string>();
              const seenNames = new Set<string>();
              const uniqueMembers = membersData
                .map((m: any, i: number) => ({
                  id: m.member_id || m.id || `member-${i}`,
                  name: m.name,
                  relationship: m.relationship || '',
                  avatar_color: m.avatar_color || '#06b6d4',
                  voice_clone_id: m.voice_clone_id || null,
                }))
                .filter((m: { id: string; name: string }) => {
                  const nameKey = m.name?.toLowerCase().trim();
                  if (seenIds.has(m.id) || seenNames.has(nameKey)) return false;
                  seenIds.add(m.id);
                  if (nameKey) seenNames.add(nameKey);
                  return true;
                });
              setMembers(uniqueMembers);
              membersLoaded = true;
            }
          }
          // If no members found, try family_members table (includes voice_clone_id)
          if (!membersLoaded) {
            try {
              const fmRes = await fetch('/api/auth/members');
              if (fmRes.ok) {
                const fmData = await fmRes.json();
                if (Array.isArray(fmData) && fmData.length > 0) {
                  setMembers(fmData.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    relationship: m.relationship || '',
                    avatar_color: m.avatar_color || '#06b6d4',
                    voice_clone_id: m.voice_clone_id || null,
                  })));
                }
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.error('Failed to fetch album data:', err);
    } finally {
        if (!cancelled) setLoading(false);
    }
    };
    
    fetchData();
    return () => { cancelled = true; };
  }, [eventId]);

  // Fetch all albums for copy-to-album
  useEffect(() => {
    async function fetchAlbums() {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAllAlbums(data.map((e: { id: string; title: string }) => ({ id: e.id, title: e.title })));
          }
        }
      } catch { /* ignore */ }
    }
    fetchAlbums();
  }, []);

  const handleCopyToAlbum = async (photoId: string, targetEventId: string) => {
    setIsCopyingPhoto(true);
    try {
      const res = await fetch(`/api/photos/${photoId}/copy-to-album`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEventId }),
      });
      if (res.ok) {
        setShowCopyToAlbumModal(false);
        setCopyToPhotoId(null);
      }
    } catch { /* ignore */ }
    finally { setIsCopyingPhoto(false); }
  };

  const handleCreateAlbumAndCopy = async (photoId: string, albumName: string) => {
    if (!albumName.trim()) return;
    setIsCreatingAlbum(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: albumName.trim() }),
      });
      if (res.ok) {
        const newEvent = await res.json();
        setAllAlbums(prev => [...prev, { id: newEvent.id, title: newEvent.title }]);
        await handleCopyToAlbum(photoId, newEvent.id);
        setNewAlbumName('');
      }
    } catch { /* ignore */ }
    finally { setIsCreatingAlbum(false); }
  };

  // Build photos with perspectives
  const albumPhotos: PhotoWithPerspectives[] = photos.map((p, i) => ({ ...p, order: i + 1 })).map((photo, index) => {
    const familyPerspectives = getPhotoPerspectives(index, members);
    
    // Add user's own perspective if they have a summary/story
    const userPerspective: Perspective | null = photo.summary ? {
      memberId: 'user',
      memberName: userName || 'You',
      avatarColor: '#8b5cf6', // Purple for user
      relationship: 'You',
      quote: photo.summary,
    } : null;
    
    // Combine user's perspective with family perspectives
    const perspectives = userPerspective 
      ? [userPerspective, ...familyPerspectives]
      : familyPerspectives;
    
        return {
      ...photo,
      perspectives,
      combinedStory: getCombinedStory(perspectives),
        };
      });

  const selectedPhoto = selectedPhotoIndex !== null ? albumPhotos[selectedPhotoIndex] : null;

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < albumPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedPhotoIndex !== null) {
        if (e.key === 'Escape') {
          setSelectedPhotoIndex(null);
        } else if (e.key === 'ArrowLeft') {
          handlePrevPhoto();
        } else if (e.key === 'ArrowRight') {
          handleNextPhoto();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhotoIndex, albumPhotos.length]);

  if (loading) {
  return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading album...</p>
        </div>
      </div>
    );
  }

  const photoCount = albumPhotos.length;
  const storiesCount = albumPhotos.filter(p => p.has_story).length;
  const perspectivesCount = albumPhotos.reduce((sum, p) => sum + p.perspectives.length, 0);
                
                return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero Header */}
      <div className="relative h-[400px] md:h-[500px] lg:h-[550px]">
        {/* Background image */}
        {albumPhotos[0] && (
          <img
            src={albumPhotos[0].thumbnail_url || albumPhotos[0].original_url || '/testphoto.jpg'}
                        alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] ${isDark ? 'via-black/60 to-black/30' : 'via-[#5c4a35]/40 to-[#5c4a35]/20'}`} />
        
        {/* Header buttons */}
        <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between">
          <button
            onClick={() => router.push('/album')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white/80 hover:text-white transition-colors"
            style={{ background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(90,75,55,0.5)' }}
          >
            <BackIcon />
            <span className="text-sm font-medium">Back to Albums</span>
          </button>
          
          {/* Editor pencil icon */}
          <Link
            href={`/album/${eventId}/editor`}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white/80 hover:text-white transition-colors"
            style={{ background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(90,75,55,0.5)' }}
            title="Story Editor"
          >
            <EditIcon />
            <span className="text-sm font-medium">Editor</span>
          </Link>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 lg:p-16">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
              {event?.title || 'Family Album'}
            </h1>
            
            {event?.description && (
              <p className="text-white/70 text-lg max-w-2xl mb-4">{event.description}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm mb-8">
              {event?.location && <span className="text-base">{event.location}</span>}
              {event?.date_start && (
                <>
                  <span>·</span>
                  <span className="text-base">{new Date(event.date_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </>
          )}
        </div>

            {/* Stats */}
            <div className="flex items-center gap-10 mb-8">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-light text-white">{photoCount}</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-1">Photos</p>
          </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-light text-white">{perspectivesCount}</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-1">Perspectives</p>
                      </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-light text-white">{storiesCount}</p>
                <p className="text-white/40 text-xs uppercase tracking-wider mt-1">Stories</p>
          </div>
        </div>

            {/* Hero Play CTA */}
            <Link
              href={`/album/${eventId}/storybook?mode=watch`}
              className="flex items-center justify-center gap-3 w-full max-w-md px-8 py-4 rounded-2xl text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-cyan-500/20"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)' }}
            >
              <PlayIcon className="w-6 h-6 ml-0.5" />
              <span className="text-lg font-semibold tracking-wide">Play Living Storybook</span>
            </Link>

            {/* Secondary row */}
            <div className="flex items-center gap-4 mt-4">
              <Link href={`/album/${eventId}/storybook?mode=read`} className="text-white/50 hover:text-white text-sm font-medium transition-colors">Read</Link>
              <span className="text-white/20">·</span>
              <Link href={`/album/${eventId}/storybook?mode=film`} className="text-white/50 hover:text-white text-sm font-medium transition-colors">Slideshow</Link>
              <span className="text-white/20">·</span>
              <button onClick={() => setShowScrapbook(true)} className="text-white/50 hover:text-white text-sm font-medium transition-colors">Scrapbook</button>
            </div>

                          </div>
                        </div>
          </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-12">
        {/* Family Members */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white/40 text-sm uppercase tracking-wider flex items-center gap-2">
              <UsersIcon />
              Family Members in this Album
            </h2>
                    </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-5 py-3 rounded-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-medium"
                  style={{ backgroundColor: member.avatar_color }}
                >
                  {member.name.charAt(0)}
                      </div>
                <div>
                  <p className="text-white text-base font-medium">{member.name}</p>
                  {member.relationship && (
                    <p className="text-white/40 text-sm">{member.relationship}</p>
                  )}
                </div>
                          </div>
            ))}
              </div>
                </div>
                
        {/* Photos Section */}
                <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white text-xl font-medium">Photos</h2>
            <p className="text-white/40 text-base">Click any photo to see family perspectives</p>
                    </div>

          {/* Photos Grid - Full Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {albumPhotos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => { setContextMenuPhotoId(null); setSelectedPhotoIndex(index); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenuPhotoId(photo.id);
                  setContextMenuPos({ x: e.clientX, y: e.clientY });
                }}
                className="group relative overflow-hidden rounded-2xl cursor-pointer"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <img
                  src={photo.original_url || photo.thumbnail_url || '/testphoto.jpg'}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                />
                
                {/* Overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-black/80 via-black/10' : 'from-[#3d3428]/70 via-[#3d3428]/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* Perspectives indicator */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex -space-x-2">
                    {photo.perspectives.slice(0, 4).map((p) => (
                      <div
                        key={p.memberId}
                        className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center text-white text-xs font-medium shadow-lg"
                        style={{ backgroundColor: p.avatarColor }}
                      >
                        {p.memberName.charAt(0)}
                </div>
                    ))}
            </div>
                  <span className="text-white text-sm font-medium bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    {photo.perspectives.length} {photo.perspectives.length === 1 ? 'perspective' : 'perspectives'}
                  </span>
      </div>

                {/* Photo number */}
                <div className="absolute top-4 left-4 text-white/70 text-sm font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Photo {index + 1}
            </div>

                {/* Animated badge */}
                {photo.animated_url && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-xs text-white font-medium">Animated</span>
            </div>
          )}

                {/* Has story badge */}
                {photo.has_story && !photo.animated_url && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/90">
                    <MicIcon />
                    <span className="text-xs text-white font-medium">Story</span>
            </div>
          )}
                  </div>
            ))}
                  </div>
                </div>
              </div>

      {/* Photo Detail Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(60,52,42,0.92)' }}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-6 right-6 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <CloseIcon />
          </button>

          {/* Navigation arrows */}
          {selectedPhotoIndex !== null && selectedPhotoIndex > 0 && (
            <button
              onClick={handlePrevPhoto}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeftIcon />
            </button>
          )}
          
          {selectedPhotoIndex !== null && selectedPhotoIndex < albumPhotos.length - 1 && (
            <button
              onClick={handleNextPhoto}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRightIcon />
            </button>
          )}

          {/* Content */}
          <div className="w-full max-w-[95vw] xl:max-w-[1600px] max-h-[90vh] flex flex-col md:flex-row gap-0 md:gap-8 p-6">
            {/* Left: Photo */}
            <div className="md:w-3/5 flex items-center justify-center">
              {selectedPhoto.animated_url ? (
                <video
                  src={selectedPhoto.animated_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="max-w-full max-h-[50vh] md:max-h-[80vh] rounded-xl object-contain"
                />
              ) : (
                <img
                  src={selectedPhoto.thumbnail_url || selectedPhoto.original_url || '/testphoto.jpg'}
                  alt=""
                  className="max-w-full max-h-[50vh] md:max-h-[80vh] rounded-xl object-contain"
                />
              )}
            </div>
                            
            {/* Right: Perspectives */}
            <div className="md:w-2/5 flex flex-col max-h-[40vh] md:max-h-[80vh] overflow-hidden rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              {/* Header */}
              <div className="p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex -space-x-2">
                    {selectedPhoto.perspectives.map((p) => (
                      <div
                        key={p.memberId}
                        className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: p.avatarColor, borderColor: 'var(--bg-secondary)' }}
                      >
                        {p.memberName.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
                <h3 className="text-white font-medium text-lg">Photo {(selectedPhotoIndex ?? 0) + 1} of {albumPhotos.length}</h3>
                <p className="text-white/50 text-sm">{selectedPhoto.perspectives.length} family {selectedPhoto.perspectives.length === 1 ? 'perspective' : 'perspectives'}</p>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Individual Perspectives */}
                <div className="p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h4 className="text-white/40 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <UsersIcon />
                    Family Perspectives
                  </h4>
                  
                  <div className="space-y-5">
                    {selectedPhoto.perspectives.map((p) => {
                      const isPlaying = playingVoiceId === p.memberId;
                      const isLoading = voiceLoading === p.memberId;
                      return (
                      <div key={p.memberId} className="flex gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                          style={{ backgroundColor: p.avatarColor }}
                        >
                          {p.memberName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{p.memberName}</span>
                            {p.relationship && (
                              <span className="text-white/40 text-sm">({p.relationship})</span>
                            )}
                            {p.voiceCloneId && (
                              <button
                                onClick={() => playPerspectiveVoice(p.memberId, p.voiceCloneId!, p.quote)}
                                className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                  isPlaying
                                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                                    : isLoading
                                    ? 'bg-white/10 text-white/50 border border-white/10'
                                    : 'bg-white/10 text-white/70 border border-white/15 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-400/30'
                                }`}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                                ) : isPlaying ? (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                )}
                                {isPlaying ? 'Playing' : isLoading ? 'Loading...' : 'Listen'}
                              </button>
                            )}
                          </div>
                          <p className="text-white/80 leading-relaxed italic">
                            &ldquo;{p.quote}&rdquo;
                          </p>
                          {isPlaying && (
                            <div className="flex items-center gap-1 mt-2">
                              {[...Array(12)].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-1 bg-cyan-400 rounded-full animate-pulse"
                                  style={{
                                    height: `${8 + Math.random() * 12}px`,
                                    animationDelay: `${i * 0.1}s`,
                                    animationDuration: `${0.4 + Math.random() * 0.4}s`,
                                  }}
                                />
                              ))}
                              <span className="text-cyan-400/60 text-xs ml-2">in {p.memberName}&apos;s voice</span>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* EVA's Woven Story */}
                <div className="p-6">
                  <h4 className="text-cyan-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <SparklesIcon />
                    EVA&apos;s Woven Story
                  </h4>
                  
                  <p className="text-white/70 leading-relaxed italic">
                    {selectedPhoto.combinedStory}
                  </p>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="p-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <Link
                  href={`/album/${eventId}/editor?photo=${selectedPhoto.id}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                >
                  <MicIcon />
                  Add Your Perspective
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Theater */}
      {isVideoPlaying && event?.video_url && (
        <div
          className="fixed inset-0 bg-black z-[200] flex flex-col"
          onClick={() => setIsVideoPlaying(false)}
        >
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div>
              <h2 className="text-xl font-medium text-white">{event.title}</h2>
              <p className="text-white/50 text-sm">Memory Film</p>
              </div>
                  <button
              onClick={() => setIsVideoPlaying(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
              <CloseIcon />
                </button>
              </div>
              
          <div className="flex-1 flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-5xl">
              <VideoPlayerWithTime
                src={event.video_url}
                autoPlay
                className="max-w-full max-h-full rounded-lg shadow-2xl"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
              />
              </div>
            </div>
              </div>
      )}

      {/* Scrapbook Modal */}
      <ScrapbookModal
        isOpen={showScrapbook}
        onClose={() => setShowScrapbook(false)}
        eventId={eventId}
        eventTitle={event?.title || 'Album'}
        eventDate={event?.date_start || new Date().toISOString()}
      />

      {/* Right-click context menu */}
      {contextMenuPhotoId && (
        <>
          <div className="fixed inset-0 z-[500]" onClick={() => setContextMenuPhotoId(null)} />
          <div
            className="fixed z-[501] rounded-xl py-1.5 shadow-2xl min-w-[200px]"
            style={{
              left: contextMenuPos.x,
              top: contextMenuPos.y,
              background: 'linear-gradient(180deg, rgba(30,30,32,0.98) 0%, rgba(20,20,22,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <button
              onClick={() => {
                setCopyToPhotoId(contextMenuPhotoId);
                setShowCopyToAlbumModal(true);
                setContextMenuPhotoId(null);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
              Copy to Album...
            </button>
            <div className="mx-3 my-1 h-px bg-white/5" />
            <button
              onClick={async () => {
                const photoId = contextMenuPhotoId;
                setContextMenuPhotoId(null);
                if (!photoId) return;
                try {
                  await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
                  setPhotos(prev => prev.filter(p => p.id !== photoId));
                  if (selectedPhotoIndex !== null) {
                    const currentPhoto = photos[selectedPhotoIndex];
                    if (currentPhoto?.id === photoId) setSelectedPhotoIndex(null);
                  }
                } catch { /* ignore */ }
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Remove from Album
            </button>
          </div>
        </>
      )}

      {/* Copy to Album modal */}
      {showCopyToAlbumModal && copyToPhotoId && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[600]"
          onClick={(e) => e.target === e.currentTarget && setShowCopyToAlbumModal(false)}
        >
          <div className="rounded-2xl max-w-md w-full mx-4 overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(20,20,22,1) 0%, rgba(12,12,14,1) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white text-lg font-medium" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>Copy to Album</h3>
                  <p className="text-white/30 text-sm">Photo and all versions will be copied</p>
                </div>
              </div>
            </div>

            {/* Preview */}
            {(() => {
              const photo = photos.find(p => p.id === copyToPhotoId);
              return photo ? (
                <div className="px-6 pb-4">
                  <div className="h-20 w-32 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.original_url || photo.thumbnail_url || ''} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : null;
            })()}

            {/* Create New Album */}
            <div className="px-6 pb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Create new album</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newAlbumName.trim() && copyToPhotoId) {
                      handleCreateAlbumAndCopy(copyToPhotoId, newAlbumName);
                    }
                  }}
                  placeholder="New album name..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button
                  onClick={() => copyToPhotoId && handleCreateAlbumAndCopy(copyToPhotoId, newAlbumName)}
                  disabled={!newAlbumName.trim() || isCreatingAlbum || isCopyingPhoto}
                  className="px-4 py-2.5 rounded-xl text-sm text-white font-medium transition-all disabled:opacity-40 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)' }}
                >
                  {isCreatingAlbum ? '...' : 'Create & Copy'}
                </button>
              </div>
            </div>

            {/* Existing albums */}
            <div className="px-6 pb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Or select existing album</p>
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {allAlbums.filter(a => a.id !== eventId).map(album => (
                  <button
                    key={album.id}
                    onClick={() => handleCopyToAlbum(copyToPhotoId, album.id)}
                    disabled={isCopyingPhoto}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm text-white/80 hover:text-white transition-all flex items-center justify-between group disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="font-medium">{album.title}</span>
                    <svg className="w-4 h-4 text-white/20 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                ))}
                {allAlbums.filter(a => a.id !== eventId).length === 0 && (
                  <p className="text-white/30 text-sm text-center py-6">No other albums yet</p>
                )}
              </div>
            </div>

            {/* Cancel */}
            <div className="px-6 pb-6">
              <button
                onClick={() => { setShowCopyToAlbumModal(false); setCopyToPhotoId(null); setNewAlbumName(''); }}
                className="w-full py-3 text-white/50 text-sm font-medium rounded-xl transition-all hover:text-white hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
