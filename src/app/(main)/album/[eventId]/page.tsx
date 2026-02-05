'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';

// Lazy load the story conversation modal (uses browser APIs)
const StoryConversationModal = dynamic(
  () => import('@/components/StoryConversationModal'),
  { ssr: false }
);

// Lazy load the video exporter (uses browser MediaRecorder API)
const VideoExporter = dynamic(
  () => import('@/components/VideoExporter'),
  { ssr: false }
);

// EVA - AI Companion
const EVAOrb = dynamic(
  () => import('@/components/EVAOrb'),
  { ssr: false }
);

// Aurora Wave for tutorial
const AuroraWave = dynamic(
  () => import('@/components/capture/AuroraWave').then(mod => ({ default: mod.AuroraWave })),
  { ssr: false }
);

// Capture Modal (opened via EVA orb)
const CaptureModal = dynamic(
  () => import('@/components/CaptureModal'),
  { ssr: false }
);

// Scrapbook Modal
const ScrapbookModal = dynamic(
  () => import('@/components/ScrapbookModal'),
  { ssr: false }
);

// ============================================================================
// TYPES
// ============================================================================

interface Photo {
  id: string;
  original_url: string | null;
  thumbnail_url: string | null;
  animated_url: string | null;
  animation_type: string | null;
  order_in_album: number | null;
  has_story: boolean;
  summary: string | null;
  created_at: string;
}

interface AnimationVersion {
  id: string;
  url: string;
  type: 'veo3' | 'grok-imagine';
  createdAt: Date;
}

interface TimelineClip {
  id: string;
  photoId: string;
  duration: number;
  order: number;
  narration: string; // Voiceover script for this clip
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  date_start: string | null;
  location: string | null;
  video_url: string | null;
}

type AlbumContext = 'single_event' | 'memory_collection' | 'theme';

const ALBUM_CONTEXT_OPTIONS: { value: AlbumContext; label: string; description: string }[] = [
  { value: 'single_event', label: 'Single Event', description: 'Wedding, birthday, vacation - one cohesive story' },
  { value: 'memory_collection', label: 'Memory Collection', description: 'Unrelated moments over time' },
  { value: 'theme', label: 'Theme-Based', description: 'Photos grouped by theme (family, travel, etc.)' },
];

// Mock album members for Ask Question (demo - matches album page)
interface AlbumMember {
  id: string;
  name: string;
  relationship?: string;
  avatar_color: string;
}
const MOCK_ALBUM_MEMBERS: AlbumMember[] = [
  { id: 'm1', name: 'Sarah', relationship: 'daughter', avatar_color: '#f472b6' },
  { id: 'm2', name: 'Michael', relationship: 'son', avatar_color: '#60a5fa' },
  { id: 'm3', name: 'Emma', relationship: 'granddaughter', avatar_color: '#a78bfa' },
  { id: 'm4', name: 'Mom', relationship: 'mother', avatar_color: '#fbbf24' },
  { id: 'm5', name: 'Dad', relationship: 'father', avatar_color: '#34d399' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AlbumPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  
  // Check if we should show the video exporter (from export=true query param)
  const shouldShowExporter = searchParams.get('export') === 'true';
  
  // Tutorial mode state
  const isTutorialMode = searchParams.get('tutorial') === 'true';
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialText, setTutorialText] = useState('');
  
  // Live API for tutorial voice
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [isTutorialSpeaking, setIsTutorialSpeaking] = useState(false);
  const pendingTutorialTextRef = useRef<string | null>(null);
  const pendingTutorialCallbackRef = useRef<(() => void) | null>(null);
  const tutorialTypewriterRef = useRef<NodeJS.Timeout | null>(null);
  const tutorialStartedRef = useRef(false);

  // Data state
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedPoolPhotoId, setSelectedPoolPhotoId] = useState<string | null>(null);
  
  // Preview state
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'single' | 'timeline'>('single');
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [playheadPosition, setPlayheadPosition] = useState(0); // seconds
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Animation state
  const [animatingPhotoId, setAnimatingPhotoId] = useState<string | null>(null);
  const [animationVersions, setAnimationVersions] = useState<Record<string, AnimationVersion[]>>({});
  const [selectedVersionId, setSelectedVersionId] = useState<Record<string, string>>({});
  const [enhancingPhotoId, setEnhancingPhotoId] = useState<string | null>(null);

  // Album context & narration state
  const [albumContext, setAlbumContext] = useState<AlbumContext>('single_event');
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showVideoExporter, setShowVideoExporter] = useState(false);
  const [editingNarrationClipId, setEditingNarrationClipId] = useState<string | null>(null);
  const [editingSummaryPhotoId, setEditingSummaryPhotoId] = useState<string | null>(null);
  
  // Story conversation modal state
  const [storyModalPhotoId, setStoryModalPhotoId] = useState<string | null>(null);

  // Ask Question modal state
  const [showAskQuestionModal, setShowAskQuestionModal] = useState(false);
  
  // Scrapbook modal state
  const [showScrapbookModal, setShowScrapbookModal] = useState(false);
  const [askQuestionPhotoId, setAskQuestionPhotoId] = useState<string | null>(null);
  const [askQuestionMemberId, setAskQuestionMemberId] = useState<string | null>(null);
  const [askQuestionText, setAskQuestionText] = useState('');
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);

  // EVA capture modal state
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showCaptureTutorial, setShowCaptureTutorial] = useState(false);

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDate, setSettingsDate] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag state - unified for pool and timeline
  const [dragSource, setDragSource] = useState<'pool' | 'timeline' | null>(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [poolDragOverPhotoId, setPoolDragOverPhotoId] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventRes, photosRes] = await Promise.all([
          fetch(`/api/events/${eventId}`, { cache: 'no-store' }),
          fetch(`/api/events/${eventId}/photos`, { cache: 'no-store' }),
        ]);

        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvent(eventData);
        }

        if (photosRes.ok) {
          const photosData = await photosRes.json();
          const loadedPhotos = photosData.photos || [];
          setPhotos(loadedPhotos);
          
          // Check if a specific photo should be pre-selected (from query param)
          const photoParam = searchParams.get('photo');
          if (photoParam && loadedPhotos.some((p: Photo) => p.id === photoParam)) {
            setSelectedPoolPhotoId(photoParam);
            setPreviewPhotoId(photoParam);
            setPreviewMode('single');
          }
          
          // Initialize timeline with photos that have order_in_album
          const orderedPhotos = (photosData.photos || [])
            .filter((p: Photo) => p.order_in_album !== null)
            .sort((a: Photo, b: Photo) => (a.order_in_album || 0) - (b.order_in_album || 0));
          
          // Load saved narration from database
          let savedNarration: Record<string, string> = {};
          try {
            const narrationRes = await fetch(`/api/events/${eventId}/narration`);
            if (narrationRes.ok) {
              const narrationData = await narrationRes.json();
              if (narrationData.segments && Array.isArray(narrationData.segments)) {
                savedNarration = narrationData.segments.reduce(
                  (acc: Record<string, string>, seg: { photo_id: string; text: string }) => {
                    acc[seg.photo_id] = seg.text;
                    return acc;
                  },
                  {}
                );
              }
            }
          } catch (e) {
            console.error('Failed to load narration:', e);
          }
          
          setTimelineClips(orderedPhotos.map((p: Photo, i: number) => ({
            id: `clip-${p.id}`,
            photoId: p.id,
            duration: 5,
            order: i,
            narration: savedNarration[p.id] || '', // Use saved narration or empty
          })));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [eventId, searchParams]);

  // Tutorial steps - extended to cover all features
  // Steps 0-7: Initial tour, ends with "click EVA to capture"
  // Steps 8+: Post-capture continuation (photo editing, animation, export)
  const TUTORIAL_STEPS = [
    // Initial tour
    {
      text: "Welcome to your album! This is where all your memories come together. Let me show you around.",
      highlight: null,
      position: 'center'
    },
    {
      text: "Photos you capture with me appear here in the Media Pool. You can drag them to reorder or add to your timeline.",
      highlight: 'photo-pool',
      position: 'left'
    },
    {
      text: "Click on any photo to see details in the Inspector panel. This is where you'll see the story I captured, and options to enhance or animate your photos.",
      highlight: 'inspector',
      position: 'right'
    },
    {
      text: "In the Inspector, you can animate photos using AI, crop and enhance them, or add them to your timeline.",
      highlight: 'inspector',
      position: 'right'
    },
    {
      text: "The Timeline at the bottom is where you build your film. Drag photos here from the Media Pool to sequence your story.",
      highlight: 'timeline',
      position: 'bottom'
    },
    {
      text: "Once you have photos in the timeline, you can generate AI narration and export your memory as a video to share.",
      highlight: 'timeline',
      position: 'bottom'
    },
    {
      text: "Click on me anytime to add new photos or tell me stories about existing ones. I'm always here to help.",
      highlight: 'eva-orb',
      position: 'bottom-right'
    },
    {
      text: "Let's capture your first memory! Click on me to get started.",
      highlight: 'eva-orb',
      position: 'bottom-right',
      action: 'click-eva'
    },
    // Post-capture continuation (step 8+)
    {
      text: "Great! You've captured your first memory. Now click on the photo in the Media Pool to select it.",
      highlight: 'photo-pool',
      position: 'left',
      action: 'select-photo'
    },
    {
      text: "With a photo selected, you can see its details in the Inspector. Before animating, I recommend using Nano Banana to crop and enhance your photo for best results.",
      highlight: 'inspector',
      position: 'left'
    },
    {
      text: "For animation, you have two options. Veo 3 creates stunning cinematic animations, but note: it has content policies that may reject photos with minors or certain subjects.",
      highlight: 'inspector',
      position: 'left'
    },
    {
      text: "Grok Imagine is a great alternative - it's more flexible with content and produces creative animated results. Try whichever works best for your photos!",
      highlight: 'inspector',
      position: 'left'
    },
    {
      text: "Once your photo is ready, click 'Add to Timeline' in the Inspector, or simply drag it from the Media Pool to the Timeline below.",
      highlight: 'timeline',
      position: 'bottom'
    },
    {
      text: "With photos in your timeline, you can reorder them, adjust durations, and when ready, click Export to create your video memory.",
      highlight: 'timeline',
      position: 'bottom'
    },
    {
      text: "That's the editor! When you're done, click the back arrow to return to your album list. I'll show you one more thing there.",
      highlight: null,
      position: 'center',
      action: 'go-back'
    }
  ];
  
  // Connect to Live API for tutorial voice
  const connectLiveAPI = useCallback(async (): Promise<boolean> => {
    if (isLiveConnecting || isLiveConnected) return isLiveConnected;
    
    setIsLiveConnecting(true);
    
    try {
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      if (!apiKey) throw new Error('Failed to get API credentials');
      
      return new Promise((resolve) => {
        const client = new GeminiLiveClient(apiKey, {
          responseModalities: ['AUDIO'],
          systemInstruction: `You are EVA, a warm AI companion for Living Memory. 
When asked to say something, speak it exactly as written with natural, warm delivery.
Keep responses brief. Do not add any extra commentary.`,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        }, {
          onConnect: () => {
            console.log('[Album Tutorial] Live API connected');
            setIsLiveConnected(true);
            setIsLiveConnecting(false);
            liveClientRef.current = client;
            resolve(true);
          },
          onDisconnect: () => {
            setIsLiveConnected(false);
          },
          onAudio: () => {
            setIsTutorialSpeaking(true);
            // Start typewriter when audio starts
            if (pendingTutorialTextRef.current) {
              const text = pendingTutorialTextRef.current;
              pendingTutorialTextRef.current = null;
              // Clear any existing typewriter
              if (tutorialTypewriterRef.current) {
                clearInterval(tutorialTypewriterRef.current);
                tutorialTypewriterRef.current = null;
              }
              // Typewriter synced with voice
              setTutorialText('');
              const chars = text.split('');
              let i = 0;
              const duration = Math.max(3000, text.length * 60);
              const msPerChar = Math.max(15, duration / chars.length);
              tutorialTypewriterRef.current = setInterval(() => {
                if (i < chars.length) {
                  const char = chars[i];
                  setTutorialText(prev => prev + char);
                  i++;
                } else {
                  if (tutorialTypewriterRef.current) {
                    clearInterval(tutorialTypewriterRef.current);
                    tutorialTypewriterRef.current = null;
                  }
                }
              }, msPerChar);
            }
          },
          onTurnComplete: () => {
            setIsTutorialSpeaking(false);
            // Call pending callback if any
            if (pendingTutorialCallbackRef.current) {
              const cb = pendingTutorialCallbackRef.current;
              pendingTutorialCallbackRef.current = null;
              cb();
            }
          },
          onError: (error) => {
            console.error('[Album Tutorial] Live API error:', error);
            setIsLiveConnecting(false);
            resolve(false);
          },
        });
        
        client.connect().catch(() => {
          setIsLiveConnecting(false);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Failed to connect Live API:', error);
      setIsLiveConnecting(false);
      return false;
    }
  }, [isLiveConnecting, isLiveConnected]);
  
  // Disconnect Live API
  const disconnectLiveAPI = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsLiveConnected(false);
  }, []);
  
  // Speak tutorial text with Live API
  const speakTutorialText = useCallback((text: string, onComplete?: () => void) => {
    // Clear any existing typewriter first
    if (tutorialTypewriterRef.current) {
      clearInterval(tutorialTypewriterRef.current);
      tutorialTypewriterRef.current = null;
    }
    
    if (!liveClientRef.current?.connected) {
      // Fallback: just typewriter
      setTutorialText('');
      const chars = text.split('');
      let i = 0;
      tutorialTypewriterRef.current = setInterval(() => {
        if (i < chars.length) {
          const char = chars[i];
          setTutorialText(prev => prev + char);
          i++;
        } else {
          if (tutorialTypewriterRef.current) {
            clearInterval(tutorialTypewriterRef.current);
            tutorialTypewriterRef.current = null;
          }
          onComplete?.();
        }
      }, 25);
      return;
    }
    
    // Use Live API
    pendingTutorialTextRef.current = text;
    pendingTutorialCallbackRef.current = onComplete || null;
    liveClientRef.current.sendText(`Say exactly: "${text}"`);
  }, []);
  
  // Initialize tutorial mode - connect to Live API (only once)
  useEffect(() => {
    if (isTutorialMode && !loading && !tutorialStartedRef.current) {
      tutorialStartedRef.current = true;
      const timer = setTimeout(async () => {
        // Try to connect to Live API
        await connectLiveAPI();
        setShowTutorial(true);
        playTutorialStep(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTutorialMode, loading, connectLiveAPI]);
  
  // Cleanup Live API on unmount
  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
    };
  }, []);
  
  // Play tutorial step with Live API voice
  const playTutorialStep = (step: number) => {
    if (step >= TUTORIAL_STEPS.length) {
      setShowTutorial(false);
      disconnectLiveAPI();
      localStorage.removeItem('tutorialMode');
      return;
    }
    
    setTutorialStep(step);
    const stepData = TUTORIAL_STEPS[step];
    setTutorialText('');
    
    // Speak with Live API (falls back to typewriter if not connected)
    speakTutorialText(stepData.text);
  };
  
  // Advance to next tutorial step
  const advanceTutorial = () => {
    const currentStep = TUTORIAL_STEPS[tutorialStep];
    
    // Handle special actions
    if (currentStep?.action === 'go-back') {
      // Navigate back to album list with tutorial continuation
      setShowTutorial(false);
      disconnectLiveAPI();
      localStorage.setItem('albumListTutorial', 'true');
      router.push('/album');
      return;
    }
    
    const nextStep = tutorialStep + 1;
    if (nextStep < TUTORIAL_STEPS.length) {
      playTutorialStep(nextStep);
    } else {
      setShowTutorial(false);
      disconnectLiveAPI();
      localStorage.removeItem('tutorialMode');
    }
  };
  
  // Skip tutorial
  const skipTutorial = () => {
    setShowTutorial(false);
    disconnectLiveAPI();
    localStorage.removeItem('tutorialMode');
    // Remove tutorial query param
    window.history.replaceState({}, '', `/album/${eventId}`);
  };

  // Compute a key that changes when animated photos change
  const animatedPhotosKey = photos
    .filter(p => p.animated_url)
    .map(p => `${p.id}:${p.animated_url}`)
    .join(',');

  // Load animation versions from database for all photos with animations
  useEffect(() => {
    async function loadAnimationVersions() {
      // Only load for photos that have animated_url (at least one animation exists)
      const animatedPhotos = photos.filter(p => p.animated_url);
      if (animatedPhotos.length === 0) return;
      
      const versionsMap: Record<string, AnimationVersion[]> = {};
      const selectedMap: Record<string, string> = {};
      
      await Promise.all(
        animatedPhotos.map(async (photo) => {
          try {
            const res = await fetch(`/api/photos/${photo.id}/animations`);
            if (res.ok) {
              const data = await res.json();
              if (data.versions && data.versions.length > 0) {
                versionsMap[photo.id] = data.versions.map((v: { id: string; url: string; type: string; is_selected: boolean; created_at: string }) => ({
                  id: v.id,
                  url: v.url,
                  type: v.type as 'veo3' | 'grok-imagine',
                  createdAt: new Date(v.created_at),
                }));
                // Find the selected version
                const selected = data.versions.find((v: { is_selected: boolean }) => v.is_selected);
                if (selected) {
                  selectedMap[photo.id] = selected.id;
                } else if (data.versions.length > 0) {
                  // Default to the most recent (first in list, as it's ordered by created_at desc)
                  selectedMap[photo.id] = data.versions[0].id;
                }
              }
            }
          } catch (error) {
            console.error(`Failed to load animation versions for photo ${photo.id}:`, error);
          }
        })
      );
      
      if (Object.keys(versionsMap).length > 0) {
        setAnimationVersions(prev => ({ ...prev, ...versionsMap }));
        setSelectedVersionId(prev => ({ ...prev, ...selectedMap }));
      }
    }
    
    if (!loading && animatedPhotosKey) {
      loadAnimationVersions();
    }
  }, [loading, animatedPhotosKey]); // Re-run when animated photos change

  // Open video exporter when navigating with export=true query param
  useEffect(() => {
    if (shouldShowExporter) {
      setShowVideoExporter(true);
    }
  }, [shouldShowExporter]);

  // Populate settings form when modal opens
  useEffect(() => {
    if (showSettingsModal && event) {
      setSettingsTitle(event.title);
      setSettingsDate(event.date_start || '');
      setDeleteConfirmText('');
    }
  }, [showSettingsModal, event]);

  // ============================================================================
  // SETTINGS - Save & Delete
  // ============================================================================

  const handleSaveSettings = async () => {
    if (!event) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: settingsTitle.trim(),
          date_start: settingsDate || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const updated = await res.json();
      setEvent(prev => prev ? { ...prev, title: updated.title, date_start: updated.date_start } : null);
      setShowSettingsModal(false);
    } catch (e) {
      console.error('Failed to save settings:', e);
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!event || deleteConfirmText !== event.title) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      window.location.href = '/album';
    } catch (e) {
      console.error('Failed to delete album:', e);
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendQuestion = async () => {
    if (!askQuestionText.trim() || !askQuestionPhotoId) return;
    setIsSendingQuestion(true);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          photo_id: askQuestionPhotoId,
          from_member_id: null, // Demo: use null; real member IDs require album_members in DB
          question: askQuestionText.trim(),
          question_type: 'photo',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setShowAskQuestionModal(false);
      setAskQuestionPhotoId(null);
      setAskQuestionMemberId(null);
      setAskQuestionText('');
    } catch (e) {
      console.error('Failed to send question:', e);
      alert(e instanceof Error ? e.message : 'Failed to send question');
    } finally {
      setIsSendingQuestion(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getPhoto = useCallback((photoId: string) => {
    return photos.find(p => p.id === photoId);
  }, [photos]);

  const selectedClip = selectedClipId 
    ? timelineClips.find(c => c.id === selectedClipId) 
    : null;

  const selectedPoolPhoto = selectedPoolPhotoId
    ? photos.find(p => p.id === selectedPoolPhotoId)
    : null;

  const totalDuration = timelineClips.reduce((acc, c) => acc + c.duration, 0);

  const isInTimeline = useCallback((photoId: string) => {
    return timelineClips.some(c => c.photoId === photoId);
  }, [timelineClips]);

  // ============================================================================
  // ANIMATION HANDLERS
  // ============================================================================

  const handleAnimatePhoto = async (photoId: string, provider: 'veo3' | 'grok') => {
    const photo = getPhoto(photoId);
    if (!photo || animatingPhotoId) return;

    setAnimatingPhotoId(photoId);

    try {
      const endpoint = provider === 'grok' ? '/api/animate-photo-grok' : '/api/animate-photo';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: photo.original_url,
          storyText: photo.summary || 'Create a subtle, cinematic animation of this photo.',
          duration: 5,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Animation failed');
      }

      const data = await response.json();
      
      // Save the animation
      const saveResponse = await fetch(`/api/photos/${photoId}/animate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64: data.videoBase64,
          animationType: provider === 'grok' ? 'grok-imagine' : 'veo3',
        }),
      });

      if (saveResponse.ok) {
        const savedData = await saveResponse.json();
        const animationType = provider === 'grok' ? 'grok-imagine' : 'veo3';
        
        // Save the animation version to database
        const versionRes = await fetch(`/api/photos/${photoId}/animations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: savedData.animated_url,
            type: animationType,
            select: true,
          }),
        });
        
        const versionData = versionRes.ok ? await versionRes.json() : null;
        const newVersionId = versionData?.version?.id || `${photoId}-${Date.now()}`;
        
        // Update local state with new version
        setAnimationVersions(prev => {
          const existing = prev[photoId] || [];
          const newVersion: AnimationVersion = {
            id: newVersionId,
            url: savedData.animated_url,
            type: animationType as 'veo3' | 'grok-imagine',
            createdAt: new Date(),
          };
          return { ...prev, [photoId]: [...existing, newVersion] };
        });
        
        // Select this version as active
        setSelectedVersionId(prev => ({
          ...prev,
          [photoId]: newVersionId,
        }));
        
        // Update the photo in state
        setPhotos(prev => prev.map(p => 
          p.id === photoId 
            ? { ...p, animated_url: savedData.animated_url, animation_type: animationType }
            : p
        ));
      }
    } catch (error) {
      console.error('Animation error:', error);
      alert(`Animation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAnimatingPhotoId(null);
    }
  };
  
  // Switch to a different animation version
  const selectAnimationVersion = async (photoId: string, versionId: string) => {
    const versions = animationVersions[photoId];
    const version = versions?.find(v => v.id === versionId);
    if (!version) return;
    
    setSelectedVersionId(prev => ({
      ...prev,
      [photoId]: versionId,
    }));
    
    // Update photo to use this version's URL
    setPhotos(prev => prev.map(p => 
      p.id === photoId 
        ? { ...p, animated_url: version.url, animation_type: version.type }
        : p
    ));
    
    // Persist selection to database
    try {
      await fetch(`/api/photos/${photoId}/animations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
    } catch (error) {
      console.error('Failed to save version selection:', error);
    }
  };

  // Delete photo from media pool (and timeline if present)
  const handleDeletePhoto = useCallback(async (photoId: string) => {
    if (!confirm('Delete this photo from the album? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const clipToRemove = timelineClips.find(c => c.photoId === photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setTimelineClips(prev => {
        const filtered = prev.filter(c => c.photoId !== photoId);
        return filtered.map((c, i) => ({ ...c, order: i }));
      });
      if (clipToRemove && selectedClipId === clipToRemove.id) setSelectedClipId(null);
      if (selectedPoolPhotoId === photoId) setSelectedPoolPhotoId(null);
      if (previewPhotoId === photoId) {
        const remaining = photos.filter(p => p.id !== photoId);
        setPreviewPhotoId(remaining.length > 0 ? remaining[0].id : null);
      }
      setAnimationVersions(prev => {
        const next = { ...prev };
        delete next[photoId];
        return next;
      });
      setSelectedVersionId(prev => {
        const next = { ...prev };
        delete next[photoId];
        return next;
      });
    } catch (e) {
      console.error('Delete failed:', e);
      alert(e instanceof Error ? e.message : 'Failed to delete photo');
    }
  }, [selectedClipId, selectedPoolPhotoId, previewPhotoId, timelineClips, photos]);

  // Nano Banana crop - for photos not cropped during capture
  const handleEnhancePhoto = async (photoId: string) => {
    setEnhancingPhotoId(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}/enhance`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const data = await res.json();
      setPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { ...p, original_url: data.original_url, thumbnail_url: data.thumbnail_url }
          : p
      ));
    } catch (e) {
      console.error('Enhance failed:', e);
      alert(e instanceof Error ? e.message : 'Nano Banana crop failed');
    } finally {
      setEnhancingPhotoId(null);
    }
  };

  // ============================================================================
  // TIMELINE ACTIONS
  // ============================================================================

  const addToTimeline = useCallback((photoId: string, insertIndex?: number) => {
    if (timelineClips.some(c => c.photoId === photoId)) return;
    
    const photo = getPhoto(photoId);
    if (!photo) return;

    const newClip: TimelineClip = {
      id: `clip-${photoId}-${Date.now()}`,
      photoId,
      duration: 5,
      order: insertIndex ?? timelineClips.length,
      narration: '', // Empty - will be generated
    };

    setTimelineClips(prev => {
      if (insertIndex !== undefined) {
        const newClips = [...prev];
        newClips.splice(insertIndex, 0, newClip);
        return newClips.map((c, i) => ({ ...c, order: i }));
      }
      return [...prev, newClip];
    });
    setSelectedClipId(newClip.id);
    setSelectedPoolPhotoId(null);
    setPreviewPhotoId(photoId);
    setPreviewMode('single');
  }, [getPhoto, timelineClips]);

  const removeFromTimeline = useCallback((clipId: string) => {
    setTimelineClips(prev => {
      const filtered = prev.filter(c => c.id !== clipId);
      return filtered.map((c, i) => ({ ...c, order: i }));
    });
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  }, [selectedClipId]);

  // Save narration to database
  const saveNarrationToDb = useCallback(async (clips: TimelineClip[]) => {
    if (clips.length === 0) return;
    
    try {
      const segments = clips.map(clip => ({
        photo_id: clip.photoId,
        text: clip.narration,
        order: clip.order,
      }));
      const photoOrder = clips.map(clip => clip.photoId);
      
      await fetch(`/api/events/${eventId}/narration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments, photoOrder }),
      });
    } catch (e) {
      console.error('Failed to save narration:', e);
    }
  }, [eventId]);

  // Debounced narration save
  const narrationSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateClipNarration = useCallback((clipId: string, narration: string) => {
    setTimelineClips(prev => {
      const updated = prev.map(c => 
        c.id === clipId ? { ...c, narration } : c
      );
      
      // Debounce save to database
      if (narrationSaveTimerRef.current) {
        clearTimeout(narrationSaveTimerRef.current);
      }
      narrationSaveTimerRef.current = setTimeout(() => {
        saveNarrationToDb(updated);
      }, 1000); // Save 1 second after last edit
      
      return updated;
    });
  }, [saveNarrationToDb]);

  const updatePhotoSummary = useCallback(async (photoId: string, summary: string) => {
    // Update local state immediately
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, summary } : p
    ));
    
    // Persist to database
    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      if (!res.ok) console.error('Failed to save story');
    } catch (e) {
      console.error('Failed to save story:', e);
    }
  }, []);

  // ============================================================================
  // SAVE TIMELINE ORDER TO DATABASE
  // ============================================================================

  const saveTimelineOrder = useCallback(async (clips: TimelineClip[]) => {
    setIsSavingOrder(true);
    try {
      const photoIds = clips.map(c => c.photoId);
      // Call even when empty - reorder API will clear order_in_album for removed photos
      const response = await fetch(`/api/events/${eventId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: photoIds }),
      });
      
      if (!response.ok) {
        console.error('Failed to save timeline order');
      }
    } catch (error) {
      console.error('Error saving timeline order:', error);
    } finally {
      setIsSavingOrder(false);
    }
  }, [eventId]);

  // Auto-save timeline order when it changes (including when clips removed)
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        saveTimelineOrder(timelineClips);
      }, 1000); // Debounce 1 second
      return () => clearTimeout(timer);
    }
  }, [timelineClips, saveTimelineOrder, loading]);

  // ============================================================================
  // GENERATE NARRATION WITH AI
  // ============================================================================

  const generateNarration = useCallback(async () => {
    if (timelineClips.length === 0) return;

    setIsGeneratingNarration(true);
    try {
      // Build context for AI - use stories from photos, not narration
      const clipsWithStories = timelineClips.map(clip => {
        const photo = getPhoto(clip.photoId);
        return {
          order: clip.order + 1,
          story: photo?.summary || 'No story provided',
          hasAnimation: !!photo?.animated_url,
        };
      });

      const contextDescriptions: Record<AlbumContext, string> = {
        single_event: 'These photos are all from a single event (like a wedding, birthday, or vacation). Create a cohesive narrative that connects them as one continuous story.',
        memory_collection: 'These are separate memories from different times. Treat each as a distinct vignette, but create smooth transitions between them.',
        theme: 'These photos share a common theme. Find the thematic connections and weave them into a unified narrative.',
      };

      const response = await fetch('/api/generate-narration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumTitle: event?.title || 'My Album',
          contextType: albumContext,
          contextDescription: contextDescriptions[albumContext],
          clips: clipsWithStories,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update individual clip narrations
        if (data.clipTexts && Array.isArray(data.clipTexts)) {
          const updatedClips = timelineClips.map((clip, i) => ({
            ...clip,
            narration: data.clipTexts[i] || clip.narration,
          }));
          setTimelineClips(updatedClips);
          
          // Save to database
          await saveNarrationToDb(updatedClips);
        }
      } else {
        console.error('Failed to generate narration');
      }
    } catch (error) {
      console.error('Error generating narration:', error);
    } finally {
      setIsGeneratingNarration(false);
    }
  }, [timelineClips, albumContext, event?.title, getPhoto, saveNarrationToDb]);

  // ============================================================================
  // DRAG & DROP - Pool
  // ============================================================================

  const handlePoolDragStart = (e: React.DragEvent, photoId: string) => {
    setDragSource('pool');
    setDraggedPhotoId(photoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePoolDragEnd = () => {
    setDragSource(null);
    setDraggedPhotoId(null);
    setPoolDragOverPhotoId(null);
    setDragOverTarget(null);
  };

  const handlePoolDragOver = (e: React.DragEvent, photoId: string) => {
    e.preventDefault();
    if (dragSource === 'pool' && draggedPhotoId && photoId !== draggedPhotoId) {
      setPoolDragOverPhotoId(photoId);
    }
  };

  const handlePoolDrop = (e: React.DragEvent, targetPhotoId?: string) => {
    e.preventDefault();
    
    // If dragging from timeline to pool, remove from timeline
    if (dragSource === 'timeline' && draggedClipId) {
      removeFromTimeline(draggedClipId);
    }
    
    // If reordering within pool
    if (dragSource === 'pool' && draggedPhotoId && targetPhotoId && draggedPhotoId !== targetPhotoId) {
      setPhotos(prev => {
        const newPhotos = [...prev];
        const sourceIdx = newPhotos.findIndex(p => p.id === draggedPhotoId);
        const targetIdx = newPhotos.findIndex(p => p.id === targetPhotoId);
        if (sourceIdx !== -1 && targetIdx !== -1) {
          const [removed] = newPhotos.splice(sourceIdx, 1);
          newPhotos.splice(targetIdx, 0, removed);
        }
        return newPhotos;
      });
    }

    handlePoolDragEnd();
  };

  // ============================================================================
  // DRAG & DROP - Timeline
  // ============================================================================

  const handleClipDragStart = (e: React.DragEvent, clipId: string, photoId: string) => {
    setDragSource('timeline');
    setDraggedClipId(clipId);
    setDraggedPhotoId(photoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClipDragEnd = () => {
    setDragSource(null);
    setDraggedClipId(null);
    setDraggedPhotoId(null);
    setDragOverTarget(null);
    setPoolDragOverPhotoId(null);
  };

  const handleClipDragOver = (e: React.DragEvent, clipId: string) => {
    e.preventDefault();
    if (draggedClipId && clipId !== draggedClipId) {
      setDragOverTarget(clipId);
    }
  };

  const handleTimelineDrop = (e: React.DragEvent, targetClipId?: string) => {
    e.preventDefault();

    // From pool to timeline
    if (dragSource === 'pool' && draggedPhotoId) {
      const insertIndex = targetClipId 
        ? timelineClips.findIndex(c => c.id === targetClipId)
        : undefined;
      addToTimeline(draggedPhotoId, insertIndex);
    }
    
    // Reordering within timeline
    if (dragSource === 'timeline' && draggedClipId && targetClipId && draggedClipId !== targetClipId) {
      setTimelineClips(prev => {
        const newClips = [...prev];
        const sourceIdx = newClips.findIndex(c => c.id === draggedClipId);
        const targetIdx = newClips.findIndex(c => c.id === targetClipId);
        if (sourceIdx !== -1 && targetIdx !== -1) {
          const [removed] = newClips.splice(sourceIdx, 1);
          newClips.splice(targetIdx, 0, removed);
        }
        return newClips.map((c, i) => ({ ...c, order: i }));
      });
    }

    handleClipDragEnd();
  };

  const handleTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ============================================================================
  // TEXT-TO-SPEECH NARRATION
  // ============================================================================

  const speakNarration = useCallback((text: string) => {
    if (!text || typeof window === 'undefined') return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.3; // Faster for 5-second clips
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to use a nice voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Samantha') || 
      v.name.includes('Daniel') ||
      v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // ============================================================================
  // PLAY TIMELINE - Sequential playback of all clips
  // ============================================================================

  const handlePlayTimeline = () => {
    if (timelineClips.length === 0) return;
    
    setIsPlayingTimeline(true);
    setCurrentClipIndex(0);
    setPlayheadPosition(0);
    setPreviewMode('timeline');
    
    // Start with first clip
    const firstClip = timelineClips[0];
    setPreviewPhotoId(firstClip.photoId);
    setSelectedClipId(firstClip.id);
    setSelectedPoolPhotoId(null);
    
    // Speak the first clip's narration
    if (firstClip.narration) {
      speakNarration(firstClip.narration);
    }
  };

  const handleStopTimeline = () => {
    setIsPlayingTimeline(false);
    setCurrentClipIndex(0);
    setPlayheadPosition(0);
    setPreviewMode('single');
    if (videoRef.current) {
      videoRef.current.pause();
    }
    // Stop any ongoing narration
    stopSpeaking();
  };

  const handleVideoEnded = () => {
    if (!isPlayingTimeline) return;
    
    const nextIndex = currentClipIndex + 1;
    
    if (nextIndex < timelineClips.length) {
      // Move to next clip
      setCurrentClipIndex(nextIndex);
      const nextClip = timelineClips[nextIndex];
      setPreviewPhotoId(nextClip.photoId);
      setSelectedClipId(nextClip.id);
      // Update playhead to start of next clip
      const completedDuration = timelineClips
        .slice(0, nextIndex)
        .reduce((acc, c) => acc + c.duration, 0);
      setPlayheadPosition(completedDuration);
      
      // Speak the next clip's narration
      if (nextClip.narration) {
        speakNarration(nextClip.narration);
      }
    } else {
      // End of timeline - stop or loop
      handleStopTimeline();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!isPlayingTimeline || !videoRef.current) return;
    const completedDuration = timelineClips
      .slice(0, currentClipIndex)
      .reduce((acc, c) => acc + c.duration, 0);
    setPlayheadPosition(completedDuration + videoRef.current.currentTime);
  };

  const handleStaticImageProgress = (progress: number) => {
    if (!isPlayingTimeline) return;
    const clipDuration = timelineClips[currentClipIndex]?.duration || 5;
    const completedDuration = timelineClips
      .slice(0, currentClipIndex)
      .reduce((acc, c) => acc + c.duration, 0);
    setPlayheadPosition(completedDuration + progress * clipDuration);
  };

  // Auto-play when clip changes during timeline playback
  useEffect(() => {
    if (isPlayingTimeline && videoRef.current) {
      // Small delay to let the video source update
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentClipIndex, isPlayingTimeline, previewPhotoId]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Load voices (needed for some browsers)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Voices may load asynchronously
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
  return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col pt-[88px] md:pt-[96px]">
      {/* ================================================================== */}
      {/* EDITOR TOOLBAR */}
      {/* ================================================================== */}
      <div className="h-7 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link 
            href="/album"
            className="text-white/40 hover:text-white/70 transition-colors text-sm"
          >
            ← Back
            </Link>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-white/70 text-base font-medium">{event?.title || 'Untitled'}</span>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
            title="Album settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {/* Album Context Dropdown */}
          <div className="h-4 w-px bg-white/10" />
          <select
            value={albumContext}
            onChange={(e) => setAlbumContext(e.target.value as AlbumContext)}
            className="bg-[#3d3d3d] text-white/70 text-sm px-3 py-1.5 rounded border border-[#4d4d4d] focus:outline-none focus:border-purple-500"
          >
            {ALBUM_CONTEXT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          {isSavingOrder && (
            <span className="text-yellow-400/70 text-sm animate-pulse">Saving...</span>
          )}
          <span className="text-white/30 text-sm">
            {timelineClips.length} clips • {formatTime(totalDuration)}
          </span>
          <button
            onClick={() => setShowScrapbookModal(true)}
            className="px-4 py-2 bg-amber-600/80 hover:bg-amber-600 text-white text-sm font-medium rounded transition-colors flex items-center gap-1.5"
          >
            📒 Scrapbook
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={timelineClips.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/30 text-white text-sm font-medium rounded transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MAIN EDITOR AREA */}
      {/* ================================================================== */}
      <div className="flex-1 grid grid-cols-[minmax(180px,1fr)_minmax(300px,2fr)_minmax(180px,1fr)] min-h-0">
        
        {/* ---------------------------------------------------------------- */}
        {/* LEFT: MEDIA POOL - Draggable, with animation options */}
        {/* ---------------------------------------------------------------- */}
        <div 
          data-tutorial="photo-pool"
          className={`bg-[#1e1e1e] flex flex-col min-h-0 border-r border-[#3d3d3d] ${
            dragSource === 'timeline' ? 'ring-2 ring-inset ring-purple-500/30' : ''
          } ${showTutorial && TUTORIAL_STEPS[tutorialStep]?.highlight === 'photo-pool' ? 'relative z-[205]' : ''}`}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => handlePoolDrop(e)}
        >
          <div className="h-10 flex-shrink-0 bg-[#2d2d2d] flex items-center px-4 border-b border-[#3d3d3d]">
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Media Pool</span>
            <span className="mx-2 text-white/30 text-sm">{photos.length}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2">
            <div className="grid grid-cols-2 gap-2 min-w-0">
              {photos.map(photo => {
                const inTimeline = isInTimeline(photo.id);
                const isBeingDragged = draggedPhotoId === photo.id;
                const isDragOver = poolDragOverPhotoId === photo.id;
                
                return (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => handlePoolDragStart(e, photo.id)}
                    onDragEnd={handlePoolDragEnd}
                    onDragOver={(e) => handlePoolDragOver(e, photo.id)}
                    onDrop={(e) => handlePoolDrop(e, photo.id)}
                    onDoubleClick={() => !inTimeline && addToTimeline(photo.id)}
                    onClick={() => {
                      setSelectedPoolPhotoId(photo.id);
                      setSelectedClipId(null);
                      setPreviewPhotoId(photo.id);
                      setPreviewMode('single');
                    }}
                    className={`aspect-video rounded overflow-hidden relative group transition-all cursor-grab active:cursor-grabbing ${
                      inTimeline ? 'opacity-70' : ''
                    } ${
                      selectedPoolPhotoId === photo.id 
                        ? 'ring-2 ring-blue-500' 
                        : 'hover:ring-1 hover:ring-white/30'
                    } ${
                      isBeingDragged ? 'opacity-50' : ''
                    } ${
                      isDragOver ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    {photo.thumbnail_url || photo.original_url ? (
                      <img
                        src={photo.thumbnail_url || photo.original_url || ''}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center text-lg">
                        📷
                      </div>
                    )}
                    
                    {/* In timeline indicator */}
                    {inTimeline && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white/70 text-[9px]">In Timeline</span>
                      </div>
                    )}
                    
                    {/* Animation badge */}
                    {photo.animated_url && !inTimeline && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-sm flex items-center justify-center text-xs">
                        🎬
                      </div>
                    )}

                    {/* Animating overlay */}
                    {animatingPhotoId === photo.id && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="text-white text-sm animate-pulse">Animating...</div>
                      </div>
                    )}

                    {/* Enhancing overlay */}
                    {enhancingPhotoId === photo.id && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="text-white text-sm animate-pulse">🍌 Cropping...</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {photos.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-white/30 text-sm py-8">
                No photos in this album
              </div>
            )}
          </div>
          
          {/* Drop zone indicator when dragging from timeline */}
          {dragSource === 'timeline' && (
            <div className="p-3 border-t border-[#3d3d3d]">
              <div className="text-center text-purple-400 text-sm py-3 border-2 border-dashed border-purple-500/50 rounded">
                Drop here to remove from timeline
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* CENTER: PREVIEW MONITOR - Native video controls */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col bg-[#1a1a1a] min-w-0 border-r border-[#3d3d3d]">
          <div className="h-6 bg-[#2d2d2d] flex items-center px-3 border-b border-[#3d3d3d]">
            <span className="text-white/50 text-[10px] font-medium uppercase tracking-wider">Preview</span>
            {previewMode === 'timeline' && (
              <span className="ml-2 text-purple-400 text-sm">• Timeline Playback</span>
            )}
            {isSpeaking && (
              <span className="ml-2 text-amber-400 text-sm flex items-center gap-1">
                <span className="animate-pulse">●</span> Narrating
              </span>
            )}
          </div>
          
          {/* Preview area with native video player */}
          <div className="flex-1 flex items-start justify-center pt-20 px-4 pb-4 min-h-0 overflow-hidden">
            {previewPhotoId ? (
              <div className="relative max-w-full max-h-full aspect-video bg-black rounded overflow-hidden shadow-xl">
                {(() => {
                  const photo = getPhoto(previewPhotoId);
                  if (!photo) return null;
                  
                  if (photo.animated_url) {
                    return (
                      <video
                        ref={videoRef}
                        src={photo.animated_url}
                        controls
                        autoPlay
                        loop={!isPlayingTimeline}
                        onEnded={handleVideoEnded}
                        onTimeUpdate={handleVideoTimeUpdate}
                        className="w-full h-full object-contain"
                        playsInline
                      />
                    );
                  }
                  
                  // Static image - during timeline playback, auto-advance after duration
                  return (
                    <StaticImageWithTimer
                      src={photo.original_url || photo.thumbnail_url || ''}
                      duration={isPlayingTimeline ? (timelineClips[currentClipIndex]?.duration || 5) * 1000 : 0}
                      onComplete={isPlayingTimeline ? handleVideoEnded : undefined}
                      onProgress={isPlayingTimeline ? handleStaticImageProgress : undefined}
                      isPlaying={isPlayingTimeline}
                    />
                  );
                })()}
                
                {/* Animation badge */}
                {(() => {
                  const photo = getPhoto(previewPhotoId);
                  if (photo?.animated_url) {
                    return (
                      <div className="absolute top-2 left-2 px-2.5 py-1 bg-purple-600/80 text-white text-sm rounded">
                        {photo.animation_type === 'grok-imagine' ? 'Grok' : 'VEO 3'}
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Narration subtitle overlay */}
                {isPlayingTimeline && timelineClips[currentClipIndex]?.narration && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-base text-center leading-relaxed drop-shadow-lg">
                      {timelineClips[currentClipIndex].narration}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-white/20 text-sm">
                <div className="text-3xl mb-2 opacity-50">🎬</div>
                <p className="text-sm">Select a clip to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* RIGHT: INSPECTOR - Story & Animation */}
        {/* ---------------------------------------------------------------- */}
        <div 
          data-tutorial="inspector"
          className={`bg-[#1e1e1e] flex flex-col ${showTutorial && TUTORIAL_STEPS[tutorialStep]?.highlight === 'inspector' ? 'relative z-[205]' : ''}`}
        >
          {/* Inspector Header */}
          <div className="h-6 bg-[#2d2d2d] flex items-center px-3 border-b border-[#3d3d3d]">
            <span className="text-white/50 text-[10px] font-medium uppercase tracking-wider">Inspector</span>
          </div>
          
          {/* Inspector Content */}
          <div className="flex-1 overflow-y-auto">
            {selectedClip ? (
              <div className="p-3 space-y-3">
                {/* Clip thumbnail */}
                <div className="aspect-video rounded overflow-hidden bg-black">
                  {(() => {
                    const photo = getPhoto(selectedClip.photoId);
                    if (!photo) return null;
                    return (
                      <img
                        src={photo.original_url || photo.thumbnail_url || ''}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    );
                  })()}
                </div>

                {/* Nano Banana crop - for uncropped photos */}
              <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider">Photo</label>
                  <button
                    onClick={() => handleEnhancePhoto(selectedClip.photoId)}
                    disabled={!!enhancingPhotoId}
                    className="w-full mt-1 py-2 bg-amber-600/60 hover:bg-amber-600 disabled:bg-amber-600/30 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                  >
                    {enhancingPhotoId === selectedClip.photoId ? (
                      <>Processing...</>
                    ) : (
                      <>🍌 Nano Banana Crop</>
                    )}
                  </button>
                  <p className="text-white/30 text-[10px] mt-1">Extract & crop if photo has hands/background</p>
                </div>

                {/* Animation status & options */}
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider">Animation</label>
                  {(() => {
                    const photo = getPhoto(selectedClip.photoId);
                    const versions = animationVersions[selectedClip.photoId] || [];
                    const isAnimating = animatingPhotoId === selectedClip.photoId;
                    
                    if (photo?.animated_url) {
                      return (
                        <div className="space-y-3 mt-2">
                          {/* Current animation status */}
                          <div className="flex items-center justify-between">
                            <p className="text-green-400 text-sm flex items-center gap-1">
                              <span>✓</span>
                              {photo.animation_type === 'grok-imagine' ? 'Grok Imagine' : 'VEO 3'}
                            </p>
                            <span className="text-white/30 text-xs">{versions.length || 1} version{versions.length !== 1 ? 's' : ''}</span>
              </div>
                          
                          {/* Version selector (show all versions) */}
                          {versions.length > 0 && (
                            <div className="space-y-1">
                              <label className="text-white/30 text-[10px] uppercase tracking-wider">Versions</label>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {versions.map((v, i) => (
                                  <button
                                    key={v.id}
                                    onClick={() => selectAnimationVersion(selectedClip.photoId, v.id)}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                                      selectedVersionId[selectedClip.photoId] === v.id
                                        ? 'bg-purple-600/50 text-white'
                                        : 'bg-[#2a2a2a] text-white/60 hover:bg-[#3a3a3a]'
                                    }`}
                                  >
                                    <span>{v.type === 'grok-imagine' ? 'Grok' : 'VEO 3'} #{i + 1}</span>
                                    <span className="text-white/30">{v.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Reanimate options */}
                          <div className="pt-2 border-t border-[#3d3d3d]">
                            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Generate New Version</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAnimatePhoto(selectedClip.photoId, 'veo3')}
                                disabled={isAnimating}
                                className="flex-1 py-1.5 bg-purple-600/60 hover:bg-purple-600 disabled:bg-purple-600/30 text-white text-xs rounded transition-colors"
                              >
                                {isAnimating ? '...' : '+ VEO 3'}
                              </button>
                              <button
                                onClick={() => handleAnimatePhoto(selectedClip.photoId, 'grok')}
                                disabled={isAnimating}
                                className="flex-1 py-1.5 bg-blue-600/60 hover:bg-blue-600 disabled:bg-blue-600/30 text-white text-xs rounded transition-colors"
                              >
                                {isAnimating ? '...' : '+ Grok'}
                              </button>
            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2 mt-1">
                        <p className="text-white/40 text-sm">Ken Burns (default)</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAnimatePhoto(selectedClip.photoId, 'veo3')}
                            disabled={isAnimating}
                            className="flex-1 py-2 bg-purple-600/80 hover:bg-purple-600 disabled:bg-purple-600/30 text-white text-sm rounded"
                          >
                            {isAnimating ? 'Generating...' : 'VEO 3'}
                          </button>
                          <button
                            onClick={() => handleAnimatePhoto(selectedClip.photoId, 'grok')}
                            disabled={isAnimating}
                            className="flex-1 py-2 bg-blue-600/80 hover:bg-blue-600 disabled:bg-blue-600/30 text-white text-sm rounded"
                          >
                            {isAnimating ? 'Generating...' : 'Grok'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
          </div>

                {/* Story (from conversation) - with mic button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white/40 text-[10px] uppercase tracking-wider">Story</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setStoryModalPhotoId(selectedClip.photoId)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-amber-600/80 hover:bg-amber-600 text-white text-[10px] rounded transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Tell Story
                      </button>
                      <button
                        onClick={() => {
                          setAskQuestionPhotoId(selectedClip.photoId);
                          setAskQuestionMemberId(null);
                          setAskQuestionText('');
                          setShowAskQuestionModal(true);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-cyan-600/80 hover:bg-cyan-600 text-white text-[10px] rounded transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        Ask Question
                      </button>
                    </div>
                  </div>
                  {(() => {
                    const photo = getPhoto(selectedClip.photoId);
                    const isEditing = editingSummaryPhotoId === selectedClip.photoId;
                    if (isEditing) {
                      return (
                        <textarea
                          defaultValue={photo?.summary || ''}
                          onBlur={(e) => {
                            updatePhotoSummary(selectedClip.photoId, e.target.value);
                            setEditingSummaryPhotoId(null);
                          }}
                          autoFocus
                          className="w-full h-20 bg-[#2a2a2a] border border-purple-500 rounded px-3 py-2 text-white/80 text-sm resize-none focus:outline-none"
                          placeholder="What happened in this photo..."
                        />
                      );
                    }
                    return (
                      <div 
                        onClick={() => setEditingSummaryPhotoId(selectedClip.photoId)}
                        className="p-3 bg-[#2a2a2a] border border-[#3d3d3d] rounded text-white/60 text-sm min-h-[60px] cursor-pointer hover:border-purple-500/50 transition-colors"
                      >
                        {photo?.summary || <span className="italic text-white/30">Click to edit or use mic to tell your story...</span>}
                      </div>
                    );
                  })()}
                </div>

                {/* Actions */}
                <button
                  onClick={() => removeFromTimeline(selectedClip.id)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded transition-colors"
                >
                  Remove from Timeline
                </button>
                <button
                  onClick={() => handleDeletePhoto(selectedClip.photoId)}
                  className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors"
                >
                  Delete from Album
                </button>
              </div>
            ) : selectedPoolPhoto ? (
              <div className="p-3 space-y-3">
                {/* Photo thumbnail */}
                <div className="aspect-video rounded overflow-hidden bg-black">
                  <img
                    src={selectedPoolPhoto.original_url || selectedPoolPhoto.thumbnail_url || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Nano Banana crop - for uncropped photos */}
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider">Photo</label>
                  <button
                    onClick={() => handleEnhancePhoto(selectedPoolPhoto.id)}
                    disabled={!!enhancingPhotoId}
                    className="w-full mt-1 py-2 bg-amber-600/60 hover:bg-amber-600 disabled:bg-amber-600/30 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                  >
                    {enhancingPhotoId === selectedPoolPhoto.id ? (
                      <>Processing...</>
                    ) : (
                      <>🍌 Nano Banana Crop</>
                    )}
                  </button>
                  <p className="text-white/30 text-[10px] mt-1">Extract & crop if photo has hands/background</p>
                </div>

                {/* Animation status & options */}
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider">Animation</label>
                  {(() => {
                    const versions = animationVersions[selectedPoolPhoto.id] || [];
                    const isAnimating = animatingPhotoId === selectedPoolPhoto.id;
                    
                    if (selectedPoolPhoto.animated_url) {
                      return (
                        <div className="space-y-3 mt-2">
                          {/* Current animation status */}
                          <div className="flex items-center justify-between">
                            <p className="text-green-400 text-sm flex items-center gap-1">
                              <span>✓</span>
                              {selectedPoolPhoto.animation_type === 'grok-imagine' ? 'Grok Imagine' : 'VEO 3'}
                            </p>
                            <span className="text-white/30 text-xs">{versions.length || 1} version{versions.length !== 1 ? 's' : ''}</span>
                          </div>
                          
                          {/* Version selector (show all versions) */}
                          {versions.length > 0 && (
                            <div className="space-y-1">
                              <label className="text-white/30 text-[10px] uppercase tracking-wider">Versions</label>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {versions.map((v, i) => (
                                  <button
                                    key={v.id}
                                    onClick={() => selectAnimationVersion(selectedPoolPhoto.id, v.id)}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                                      selectedVersionId[selectedPoolPhoto.id] === v.id
                                        ? 'bg-purple-600/50 text-white'
                                        : 'bg-[#2a2a2a] text-white/60 hover:bg-[#3a3a3a]'
                                    }`}
                                  >
                                    <span>{v.type === 'grok-imagine' ? 'Grok' : 'VEO 3'} #{i + 1}</span>
                                    <span className="text-white/30">{v.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            ))}
          </div>
                            </div>
                          )}
                          
                          {/* Reanimate options */}
                          <div className="pt-2 border-t border-[#3d3d3d]">
                            <p className="text-amber-400/90 text-[10px] mb-2">⚠️ VEO 3: no minors</p>
                            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Generate New Version</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAnimatePhoto(selectedPoolPhoto.id, 'veo3')}
                                disabled={isAnimating}
                                className="flex-1 py-1.5 bg-purple-600/60 hover:bg-purple-600 disabled:bg-purple-600/30 text-white text-xs rounded transition-colors"
                              >
                                {isAnimating ? '...' : '+ VEO 3'}
                              </button>
                              <button
                                onClick={() => handleAnimatePhoto(selectedPoolPhoto.id, 'grok')}
                                disabled={isAnimating}
                                className="flex-1 py-1.5 bg-blue-600/60 hover:bg-blue-600 disabled:bg-blue-600/30 text-white text-xs rounded transition-colors"
                              >
                                {isAnimating ? '...' : '+ Grok'}
                              </button>
              </div>
                  </div>
                </div>
                      );
                    }
                    return (
                      <div className="space-y-2 mt-1">
                        <p className="text-amber-400/90 text-xs mb-1">⚠️ VEO 3 cannot animate photos with minors (children). Use Grok or Ken Burns for those.</p>
                        <p className="text-white/40 text-sm mb-1">Choose animation:</p>
                        <button
                          onClick={() => handleAnimatePhoto(selectedPoolPhoto.id, 'veo3')}
                          disabled={isAnimating}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white text-sm font-medium rounded transition-colors"
                        >
                          {isAnimating ? 'Generating...' : '🎬 VEO 3'}
                        </button>
                        <button
                          onClick={() => handleAnimatePhoto(selectedPoolPhoto.id, 'grok')}
                          disabled={isAnimating}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-medium rounded transition-colors"
                        >
                          {isAnimating ? 'Generating...' : '🎬 Grok Imagine'}
                        </button>
                        <p className="text-white/30 text-sm text-center">or use Ken Burns (default)</p>
                  </div>
                    );
                  })()}
                </div>
                
                {/* Story (from conversation) - with mic button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white/40 text-[10px] uppercase tracking-wider">Story</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setStoryModalPhotoId(selectedPoolPhoto.id)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-amber-600/80 hover:bg-amber-600 text-white text-[10px] rounded transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Tell Story
                      </button>
                      <button
                        onClick={() => {
                          setAskQuestionPhotoId(selectedPoolPhoto.id);
                          setAskQuestionMemberId(null);
                          setAskQuestionText('');
                          setShowAskQuestionModal(true);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-cyan-600/80 hover:bg-cyan-600 text-white text-[10px] rounded transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        Ask Question
                      </button>
                    </div>
                  </div>
                  {editingSummaryPhotoId === selectedPoolPhoto.id ? (
                    <textarea
                      defaultValue={selectedPoolPhoto.summary || ''}
                      onBlur={(e) => {
                        updatePhotoSummary(selectedPoolPhoto.id, e.target.value);
                        setEditingSummaryPhotoId(null);
                      }}
                      autoFocus
                      className="w-full h-20 bg-[#2a2a2a] border border-purple-500 rounded px-3 py-2 text-white/80 text-sm resize-none focus:outline-none"
                      placeholder="What happened in this photo..."
                    />
                  ) : (
                    <div 
                      onClick={() => setEditingSummaryPhotoId(selectedPoolPhoto.id)}
                      className="p-3 bg-[#2a2a2a] border border-[#3d3d3d] rounded text-white/60 text-sm min-h-[60px] cursor-pointer hover:border-purple-500/50 transition-colors"
                    >
                      {selectedPoolPhoto.summary || <span className="italic text-white/30">Click to edit or use mic to tell your story...</span>}
            </div>
          )}
                </div>

                {/* Add to timeline */}
                {!isInTimeline(selectedPoolPhoto.id) && (
                  <button
                    onClick={() => addToTimeline(selectedPoolPhoto.id)}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    Add to Timeline
                  </button>
                )}

                {/* Delete from album */}
                <button
                  onClick={() => handleDeletePhoto(selectedPoolPhoto.id)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded transition-colors"
                >
                  Delete from Album
                </button>
                </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/20 text-sm p-4 text-center min-h-[120px]">
                Select a clip or photo
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* EXPORT MODAL */}
      {/* ================================================================== */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#2a2a2a] rounded-lg p-6 max-w-md w-full mx-4 border border-[#3d3d3d]">
            <h3 className="text-white text-xl font-medium mb-5">Export Video</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-base">
                <span className="text-white/50">Clips:</span>
                <span className="text-white">{timelineClips.length}</span>
                    </div>
              <div className="flex justify-between text-base">
                <span className="text-white/50">Duration:</span>
                <span className="text-white">{formatTime(totalDuration)}</span>
                  </div>
              <div className="flex justify-between text-base">
                <span className="text-white/50">Context:</span>
                <span className="text-white">{ALBUM_CONTEXT_OPTIONS.find(o => o.value === albumContext)?.label}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-white/50">Animated clips:</span>
                <span className="text-white">
                  {timelineClips.filter(c => getPhoto(c.photoId)?.animated_url).length} / {timelineClips.length}
                </span>
              </div>
            </div>

            <p className="text-white/50 text-sm mb-5">
              This will create a video using your timeline order. Animated clips will use their AI-generated video, 
              others will use Ken Burns effect. Narration will be synthesized from the script.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white text-base rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setShowVideoExporter(true);
                }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white text-base font-medium rounded transition-colors"
              >
                Export Video
              </button>
            </div>
              </div>
            </div>
          )}

      {/* ================================================================== */}
      {/* SETTINGS MODAL */}
      {/* ================================================================== */}
      {showSettingsModal && event && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}
        >
          <div 
            className="bg-[#2a2a2a] rounded-lg p-6 max-w-md w-full mx-4 border border-[#3d3d3d]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white text-xl font-medium mb-5">Album Settings</h3>
            
            <div className="space-y-4 mb-6">
                    <div>
                <label className="block text-white/50 text-sm mb-1.5">Name</label>
                <input
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#3d3d3d] rounded text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
                  placeholder="Album name"
                />
                    </div>
              <div>
                <label className="block text-white/50 text-sm mb-1.5">Date</label>
                <input
                  type="date"
                  value={settingsDate}
                  onChange={(e) => setSettingsDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#3d3d3d] rounded text-white focus:outline-none focus:border-purple-500"
                  style={{ colorScheme: 'dark' }}
                />
                  </div>
                </div>

            <div className="pt-5 border-t border-[#3d3d3d]">
              <p className="text-white/50 text-sm mb-3">Danger zone</p>
              <p className="text-white/40 text-xs mb-3">
                Deleting this album will permanently remove it and all its photos. This cannot be undone.
              </p>
              <div className="space-y-2">
                <label className="block text-white/50 text-xs">
                  Type <span className="text-white font-mono font-medium">{event.title}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={event.title}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-red-500/30 rounded text-white placeholder:text-white/30 focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={handleDeleteAlbum}
                  disabled={deleteConfirmText !== event.title || isDeleting}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Delete album'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white text-base rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={!settingsTitle.trim() || isSavingSettings}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/30 text-white text-base font-medium rounded transition-colors"
              >
                {isSavingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
            </div>
          )}

      {/* ================================================================== */}
      {/* STORY CONVERSATION MODAL */}
      {/* ================================================================== */}
      {storyModalPhotoId && (() => {
        const photo = getPhoto(storyModalPhotoId);
        if (!photo) return null;
        const photoIdToUpdate = photo.id; // Capture in closure
        return (
          <StoryConversationModal
            photoId={photo.id}
            photoUrl={photo.original_url || photo.thumbnail_url || ''}
            existingSummary={photo.summary}
            onClose={() => setStoryModalPhotoId(null)}
            onStoryGenerated={(story) => {
              console.log('Story generated for photo:', photoIdToUpdate, 'Story:', story);
              // Update photo summary
              setPhotos(prev => prev.map(p => 
                p.id === photoIdToUpdate ? { ...p, summary: story, has_story: true } : p
              ));
              setStoryModalPhotoId(null);
            }}
          />
        );
      })()}

      {/* ================================================================== */}
      {/* ASK QUESTION MODAL - Matching app design (AnswerPromptModal, questions page) */}
      {/* ================================================================== */}
      {showAskQuestionModal && askQuestionPhotoId && (() => {
        const photo = getPhoto(askQuestionPhotoId);
        if (!photo) return null;
        return (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAskQuestionModal(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              style={{ background: 'linear-gradient(to bottom, #0d1117 0%, #0a0a0f 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - matching AnswerPromptModal */}
              <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(232, 220, 196, 0.15)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#c9b896' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white font-medium text-base">Ask a Question</h2>
                    <p className="text-white/50 text-xs">You&apos;re asking — select who would know the context</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAskQuestionModal(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Full photo */}
                <div className="rounded-xl overflow-hidden bg-black ring-1 ring-white/10 aspect-video w-full">
                  <img
                    src={photo.original_url || photo.thumbnail_url || ''}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Who to ask (who would know the context) */}
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">Ask who? (they would know the context)</label>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_ALBUM_MEMBERS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setAskQuestionMemberId(askQuestionMemberId === m.id ? null : m.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          askQuestionMemberId === m.id
                            ? 'ring-1 ring-[#c9b896]'
                            : 'bg-white/5 hover:bg-white/[0.08] border border-white/5'
                        }`}
                        style={askQuestionMemberId === m.id ? { background: 'rgba(232, 220, 196, 0.12)' } : {}}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: m.avatar_color }}
                        >
                          {m.name[0]}
                        </div>
                        <span className="text-white/90">{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question input */}
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">Your question</label>
                  <textarea
                    value={askQuestionText}
                    onChange={(e) => setAskQuestionText(e.target.value)}
                    placeholder="e.g. Who's the kid on the left? What was grandma laughing about here?"
                    className="w-full h-28 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-[#c9b896]/50 focus:ring-1 focus:ring-[#c9b896]/30 transition-colors"
                    disabled={isSendingQuestion}
                  />
                </div>
              </div>

              {/* Footer - warm accent button */}
              <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowAskQuestionModal(false)}
                  className="px-4 py-2.5 text-white/60 hover:text-white transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendQuestion}
                  disabled={!askQuestionText.trim() || isSendingQuestion}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    background: askQuestionText.trim() && !isSendingQuestion 
                      ? 'linear-gradient(135deg, #e8dcc4 0%, #c9b896 100%)' 
                      : 'rgba(232, 220, 196, 0.2)',
                    color: '#1a1510'
                  }}
                >
                  {isSendingQuestion ? 'Sending...' : 'Send Question'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================== */}
      {/* VIDEO EXPORTER */}
      {/* ================================================================== */}
      <VideoExporter
        isOpen={showVideoExporter}
        onClose={() => {
          setShowVideoExporter(false);
          // Remove export=true from URL without page reload
          const url = new URL(window.location.href);
          url.searchParams.delete('export');
          window.history.replaceState({}, '', url.toString());
        }}
        photos={photos}
        segments={timelineClips.map(clip => ({
          photo_id: clip.photoId,
          order: clip.order,
          text: clip.narration,
          duration: clip.duration,
        }))}
        eventId={eventId}
        eventTitle={event?.title || 'Untitled Album'}
        onVideoSaved={(videoUrl) => {
          console.log('Video saved:', videoUrl);
          // Update local event state with new video URL
          if (event) {
            setEvent({ ...event, video_url: videoUrl });
          }
        }}
      />

      {/* ================================================================== */}
      {/* SCRAPBOOK MODAL */}
      {/* ================================================================== */}
      <ScrapbookModal
        isOpen={showScrapbookModal}
        onClose={() => setShowScrapbookModal(false)}
        eventId={eventId}
        eventTitle={event?.title || 'Untitled Album'}
        eventDate={event?.date_start}
      />

      {/* ================================================================== */}
      {/* BOTTOM: TIMELINE - Video Track + Narration Track */}
      {/* ================================================================== */}
      <div 
        data-tutorial="timeline"
        className={`h-96 bg-[#1e1e1e] border-t border-[#3d3d3d] flex flex-col flex-shrink-0 ${showTutorial && TUTORIAL_STEPS[tutorialStep]?.highlight === 'timeline' ? 'relative z-[205]' : ''}`}
      >
        {/* Timeline header with play button and regenerate */}
        <div className="h-10 bg-[#252525] border-b border-[#3d3d3d] flex items-center px-4">
          {isPlayingTimeline ? (
            <button
              onClick={handleStopTimeline}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors mr-3"
            >
              ⏹ Stop
            </button>
          ) : (
            <button
              onClick={handlePlayTimeline}
              disabled={timelineClips.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/30 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors mr-3"
            >
              ▶ Play Timeline
              </button>
            )}
          
          {/* Regenerate All Narration Button */}
          <button
            onClick={generateNarration}
            disabled={isGeneratingNarration || timelineClips.length === 0}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/30 text-white text-sm font-medium rounded transition-colors mr-3"
          >
            {isGeneratingNarration ? '✨ Generating...' : '✨ Regenerate All Narration'}
          </button>
          
          {isPlayingTimeline && (
            <span className="text-purple-400 text-sm mr-4">
              Playing clip {currentClipIndex + 1} of {timelineClips.length}
            </span>
          )}
          <div className="flex-1 flex pl-14">
            {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-shrink-0 text-white/50 text-sm font-mono"
                style={{ width: 150 }}
              >
                {formatTime(i * 5)}
          </div>
            ))}
          </div>
        </div>

        {/* Track area - scrollable */}
        <div 
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onDrop={(e) => handleTimelineDrop(e)}
          onDragOver={handleTimelineDragOver}
        >
          <div className="h-full flex flex-col" style={{ minWidth: Math.max(timelineClips.length * 160 + 150, 1000) }}>
            
            {/* VIDEO TRACK */}
            <div className="flex-1 flex min-h-0 border-b border-[#3d3d3d]">
              {/* Track label */}
              <div className="w-28 flex-shrink-0 bg-[#252525] border-r border-[#3d3d3d] flex items-center justify-center">
                <span className="text-white/40 text-xs uppercase tracking-wider">Video</span>
              </div>

              {/* Track content */}
              <div 
                className={`flex-1 relative ${
                  dragSource === 'pool' ? 'bg-purple-500/5 ring-2 ring-inset ring-purple-500/30' : ''
                }`}
              >
                {/* Track background lines */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: Math.ceil(totalDuration / 5) + 5 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-shrink-0 border-l border-white/5 h-full"
                      style={{ width: 150 }}
                    />
                  ))}
                </div>

                {/* Clips */}
                <div className="absolute inset-0 flex items-center px-3 gap-2">
                  {                    timelineClips.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-white/20 text-base">
                      {dragSource === 'pool' ? (
                        <span className="text-purple-400">Drop here to add to timeline</span>
                      ) : (
                        <span>Drag photos here or double-click in Media Pool</span>
                      )}
                    </div>
                  ) : (
                    timelineClips.map((clip, index) => {
                      const photo = getPhoto(clip.photoId);
                      const isBeingDragged = draggedClipId === clip.id;
                      const isDragOver = dragOverTarget === clip.id;
                      const isCurrentlyPlaying = isPlayingTimeline && currentClipIndex === index;
                      
                      return (
                        <div
                          key={clip.id}
                          draggable={!isPlayingTimeline}
                          onDragStart={(e) => {
                            if (!isPlayingTimeline) {
                              e.dataTransfer.effectAllowed = 'move';
                              handleClipDragStart(e, clip.id, clip.photoId);
                            }
                          }}
                          onDragEnd={handleClipDragEnd}
                          onDragOver={(e) => handleClipDragOver(e, clip.id)}
                          onDrop={(e) => handleTimelineDrop(e, clip.id)}
                          onClick={() => {
                            if (isPlayingTimeline) {
                              setCurrentClipIndex(index);
                              setPreviewPhotoId(clip.photoId);
                              setSelectedClipId(clip.id);
                              const completedDuration = timelineClips
                                .slice(0, index)
                                .reduce((acc, c) => acc + c.duration, 0);
                              setPlayheadPosition(completedDuration);
                            } else {
                              setSelectedClipId(clip.id);
                              setSelectedPoolPhotoId(null);
                              setPreviewPhotoId(clip.photoId);
                              setPreviewMode('single');
                            }
                          }}
                          className={`flex-shrink-0 h-[90%] rounded cursor-pointer overflow-hidden transition-all ${
                            isCurrentlyPlaying
                              ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-[#1e1e1e]'
                              : selectedClipId === clip.id
                              ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-[#1e1e1e]'
                              : 'hover:ring-1 hover:ring-white/30'
                          } ${
                            !isPlayingTimeline ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${
                            isBeingDragged ? 'opacity-50' : ''
                          } ${
                            isDragOver ? 'ml-4 ring-2 ring-purple-500' : ''
                          }`}
                          style={{ width: 150 }}
                        >
                          <div className="relative h-full bg-gradient-to-b from-[#3a3a4a] to-[#2a2a3a] border border-[#4a4a5a] rounded pointer-events-none select-none">
                            {/* Top bar */}
                            <div className={`h-4 flex items-center px-2 ${
                              isCurrentlyPlaying ? 'bg-green-600/80' : 'bg-purple-600/80'
                            }`}>
                              <span className="text-white text-[10px] font-medium truncate">
                                {isCurrentlyPlaying ? '▶ ' : ''}Clip {index + 1}
                              </span>
                              {photo?.animated_url && (
                                <span className="ml-auto text-[9px]">🎬</span>
                              )}
                            </div>
                            
                            {/* Thumbnail */}
                            <div className="flex-1 relative">
                              {photo && (photo.thumbnail_url || photo.original_url) ? (
                                <img
                                  src={photo.thumbnail_url || photo.original_url || ''}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  draggable={false}
                                />
                              ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center text-lg">
                                  📷
                                </div>
                              )}
                            </div>
                            
                            {/* Duration bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/60 flex items-center justify-center">
                              <span className="text-white/70 text-xs font-mono">{clip.duration}s</span>
        </div>
      </div>
    </div>
  );
                    })
                  )}
                </div>

                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10 transition-[left] duration-75"
                  style={{ 
                    left: `${12 + Math.floor((isPlayingTimeline ? playheadPosition : 0) / 5) * 158 + ((isPlayingTimeline ? playheadPosition : 0) % 5) * 30}px` 
                  }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
                </div>
              </div>
            </div>

            {/* NARRATION TRACK */}
            <div className="flex-1 flex min-h-0">
              {/* Track label */}
              <div className="w-28 flex-shrink-0 bg-[#252525] border-r border-[#3d3d3d] flex items-center justify-center">
                <span className="text-amber-400/70 text-xs uppercase tracking-wider">Narration</span>
              </div>

              {/* Narration clips */}
              <div className="flex-1 relative bg-[#1a1a1a]">
                {/* Track background lines */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: Math.ceil(totalDuration / 5) + 5 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-shrink-0 border-l border-white/5 h-full"
                      style={{ width: 150 }}
                    />
                  ))}
                </div>

                {/* Narration text boxes */}
                <div className="absolute inset-0 flex items-center px-3 gap-2">
                  {timelineClips.map((clip, index) => {
                    const isEditing = editingNarrationClipId === clip.id;
                    const isCurrentlyPlaying = isPlayingTimeline && currentClipIndex === index;
                    
                    return (
                      <div
                        key={`narration-${clip.id}`}
                        onClick={() => {
                          if (!isEditing) {
                            setEditingNarrationClipId(clip.id);
                            setSelectedClipId(clip.id);
                            setSelectedPoolPhotoId(null);
                          }
                        }}
                        className={`flex-shrink-0 h-[85%] rounded overflow-hidden transition-all cursor-text ${
                          isCurrentlyPlaying
                            ? 'ring-2 ring-green-500'
                            : selectedClipId === clip.id
                            ? 'ring-2 ring-amber-500'
                            : 'ring-1 ring-amber-500/30 hover:ring-amber-500/60'
                        }`}
                        style={{ width: 150 }}
                      >
                        <div className="h-full bg-amber-900/30 border border-amber-500/20 rounded p-2">
                          {isEditing ? (
                            <textarea
                              defaultValue={clip.narration}
                              onBlur={(e) => {
                                updateClipNarration(clip.id, e.target.value);
                                setEditingNarrationClipId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingNarrationClipId(null);
                                }
                              }}
                              autoFocus
                              placeholder="Voiceover text..."
                              className="w-full h-full bg-transparent text-amber-100 text-sm resize-none focus:outline-none placeholder:text-amber-500/50"
                            />
                          ) : (
                            <div className="h-full overflow-hidden">
                              {clip.narration ? (
                                <p className="text-amber-100/80 text-sm leading-tight line-clamp-4">
                                  {clip.narration}
                                </p>
                              ) : (
                                <p className="text-amber-500/50 text-sm italic">
                                  Click to add voiceover...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Playhead for narration track */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10 transition-[left] duration-75"
                  style={{ 
                    left: `${12 + Math.floor((isPlayingTimeline ? playheadPosition : 0) / 5) * 158 + ((isPlayingTimeline ? playheadPosition : 0) % 5) * 30}px` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* EVA ORB - Floating AI companion */}
      {/* ================================================================== */}
      <div 
        className="fixed bottom-6 right-6 z-50"
        style={showTutorial && TUTORIAL_STEPS[tutorialStep]?.highlight === 'eva-orb' ? { zIndex: 205 } : {}}
      >
        <div className={showTutorial && TUTORIAL_STEPS[tutorialStep]?.highlight === 'eva-orb' ? 'eva-tutorial-highlight' : ''}>
          <EVAOrb 
            onClick={() => {
              setShowCaptureModal(true);
              // If tutorial is on click-eva step, show capture tutorial
              if (showTutorial && TUTORIAL_STEPS[tutorialStep]?.action === 'click-eva') {
                setShowCaptureTutorial(true);
                setTimeout(() => {
                  setShowTutorial(false);
                }, 500);
              }
            }} 
            size={120}
          />
        </div>
      </div>
      
      {/* ================================================================== */}
      {/* TUTORIAL OVERLAY - EVA Modal Style with Positioning */}
      {/* ================================================================== */}
      {showTutorial && (
        <>
          {/* Semi-transparent backdrop - separate z-index */}
          <div className="fixed inset-0 z-[200] bg-black/60" />
          
          {/* Positioned tutorial card - higher z-index to be above highlighted elements */}
          <div 
            className={`fixed z-[220] w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a0a0f] to-[#0f0a15] border border-cyan-500/30 shadow-2xl flex flex-col transition-all duration-300 ${
              TUTORIAL_STEPS[tutorialStep]?.position === 'center' 
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
              TUTORIAL_STEPS[tutorialStep]?.position === 'left' 
                ? 'top-1/2 left-8 -translate-y-1/2' :
              TUTORIAL_STEPS[tutorialStep]?.position === 'right' 
                ? 'top-1/2 right-8 -translate-y-1/2' :
              TUTORIAL_STEPS[tutorialStep]?.position === 'bottom' 
                ? 'bottom-[420px] left-1/2 -translate-x-1/2' :
              TUTORIAL_STEPS[tutorialStep]?.position === 'bottom-right' 
                ? 'bottom-32 right-32' :
              'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-green-500' : isLiveConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-white/30'}`} />
                <span className="text-white/70 text-xs">
                  {isLiveConnecting ? 'Connecting...' : 'EVA'}
                </span>
                <span className="text-white/30 text-xs ml-2">
                  {tutorialStep + 1}/{TUTORIAL_STEPS.length}
                </span>
              </div>
              <button
                onClick={skipTutorial}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Skip tutorial"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Main content */}
            <div className="flex flex-col items-center py-6 px-5">
              {/* EVA Orb - smaller for positioned card */}
              <div className="mb-4">
                <EVAOrb size={80} isSpeaking={isTutorialSpeaking} />
              </div>
              
              {/* Tutorial text */}
              <div className="text-center mb-5 min-h-[60px]">
                <p 
                  className="text-white text-base leading-relaxed"
                  style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                >
                  {tutorialText}
                  {(isTutorialSpeaking || tutorialText) && <span className="animate-pulse ml-1">|</span>}
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3 w-full">
                {TUTORIAL_STEPS[tutorialStep]?.action === 'click-eva' ? (
                  <button
                    onClick={() => {
                      setShowCaptureModal(true);
                      setShowCaptureTutorial(true);
                      setTimeout(() => {
                        setShowTutorial(false);
                        disconnectLiveAPI();
                      }, 500);
                    }}
                    className="flex-1 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-full text-sm font-medium hover:from-cyan-500 hover:to-cyan-400 transition-all"
                  >
                    Start with EVA
                  </button>
                ) : (
                  <button
                    onClick={advanceTutorial}
                    className="flex-1 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-full text-sm font-medium hover:from-cyan-500 hover:to-cyan-400 transition-all"
                  >
                    {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Continue' : 'Got it!'}
                  </button>
                )}
                <button
                  onClick={skipTutorial}
                  className="px-4 py-2.5 bg-white/10 text-white/70 rounded-full text-sm font-medium hover:bg-white/20 hover:text-white transition-all"
                >
                  Skip
                </button>
              </div>
              
              {/* Step dots */}
              <div className="flex justify-center gap-1.5 mt-4">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div 
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === tutorialStep ? 'bg-cyan-400' : i < tutorialStep ? 'bg-cyan-400/50' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Aurora Wave at bottom - smaller */}
            <div className="h-12 relative">
              <AuroraWave 
                isActive={showTutorial}
                isAISpeaking={isTutorialSpeaking} 
                userAudioLevel={0} 
              />
            </div>
          </div>
          
          {/* Highlight styles for EVA orb (when highlighted) */}
          <style jsx global>{`
            .eva-tutorial-highlight {
              position: relative;
            }
            .eva-tutorial-highlight::after {
              content: '';
              position: absolute;
              top: -12px;
              left: -12px;
              right: -12px;
              bottom: -12px;
              border: 3px solid rgba(34, 211, 238, 0.6);
              border-radius: 50%;
              animation: tutorialPulse 2s ease-in-out infinite;
              pointer-events: none;
            }
            @keyframes tutorialPulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.7; }
            }
          `}</style>
        </>
      )}

      {/* ================================================================== */}
      {/* EVA CAPTURE MODAL */}
      {/* ================================================================== */}
      <CaptureModal
        isOpen={showCaptureModal}
        onClose={() => {
          setShowCaptureModal(false);
          const wasTutorial = showCaptureTutorial;
          setShowCaptureTutorial(false);
          
          // If we were in tutorial mode, continue to post-capture steps
          if (wasTutorial && isTutorialMode) {
            // Small delay to let modal close, then continue tutorial
            setTimeout(async () => {
              // Reconnect Live API if needed
              if (!liveClientRef.current?.connected) {
                await connectLiveAPI();
              }
              setShowTutorial(true);
              playTutorialStep(8); // Post-capture steps start at 8
            }, 500);
          }
        }}
        eventId={eventId}
        eventTitle={event?.title}
        tutorialMode={showCaptureTutorial}
        onPhotosAdded={() => {
          // Refresh photos when new ones are added
          fetch(`/api/events/${eventId}/photos`, { cache: 'no-store' })
            .then(res => res.ok ? res.json() : { photos: [] })
            .then(data => {
              if (data.photos) {
                setPhotos(data.photos);
              }
            });
        }}
      />
    </div>
  );
}

// ============================================================================
// STATIC IMAGE WITH TIMER - For timeline playback of non-animated photos
// ============================================================================

function StaticImageWithTimer({ 
  src, 
  duration, 
  onComplete, 
  onProgress,
  isPlaying 
}: { 
  src: string; 
  duration: number; 
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  isPlaying: boolean;
}) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isPlaying || duration <= 0) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);
      onProgress?.(newProgress);
      
      if (elapsed >= duration) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onComplete, onProgress, isPlaying]);

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain"
      />
      {isPlaying && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div 
            className="h-full bg-purple-500 transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
