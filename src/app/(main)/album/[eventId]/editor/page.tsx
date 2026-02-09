'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import { useUserName } from '@/hooks/use-user-name';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useTheme } from '@/contexts/ThemeContext';
import { ANIMATION_STYLES } from '@/lib/animation-styles';

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
type NarrativePov = 'first_person' | 'third_person';

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
// No more mock members — real family members loaded from DB

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AlbumPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { userName } = useUserName();
  const { theme } = useTheme();
  // Editor always stays in dark mode — too complex to theme and looks better dark
  const isLight = false;

  // Theme-aware inline style helpers (for elements that can't use CSS variables alone)
  const subtleBg = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)';
  const subtleBgLight = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)';
  const subtleBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';
  const subtleBorderLight = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)';
  
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
  const [isStorybookPreview, setIsStorybookPreview] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [playheadPosition, setPlayheadPosition] = useState(0); // seconds
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const narrationEndCallbackRef = useRef<(() => void) | null>(null);

  // Animation state
  const [animatingPhotoId, setAnimatingPhotoId] = useState<string | null>(null);
  const [animationVersions, setAnimationVersions] = useState<Record<string, AnimationVersion[]>>({});
  const [selectedVersionId, setSelectedVersionId] = useState<Record<string, string>>({});
  const [enhancingPhotoId, setEnhancingPhotoId] = useState<string | null>(null);
  const [selectedAnimStyle, setSelectedAnimStyle] = useState<string>('cinematic');
  // Style preview state (for Disney/Ghibli/Anime that need visual transformation first)
  // Previews can be stored (have id + imageUrl) or ephemeral (only imageBase64)
  const [stylePreviews, setStylePreviews] = useState<{ id?: string; imageUrl?: string; imageBase64?: string; mimeType?: string }[]>([]);
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState<number | null>(null);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [stylePreviewPhotoId, setStylePreviewPhotoId] = useState<string | null>(null); // which photo the previews are for

  // Album context & narration state
  const [albumContext, setAlbumContext] = useState<AlbumContext>('single_event');
  const [narrativePov, setNarrativePov] = useState<NarrativePov>('first_person');
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showVideoExporter, setShowVideoExporter] = useState(false);
  const [editingNarrationClipId, setEditingNarrationClipId] = useState<string | null>(null);
  const [narrationModalClipId, setNarrationModalClipId] = useState<string | null>(null);
  const [editingSummaryPhotoId, setEditingSummaryPhotoId] = useState<string | null>(null);
  
  // Story conversation modal state
  const [storyModalPhotoId, setStoryModalPhotoId] = useState<string | null>(null);

  // Ask Question modal state
  const [showAskQuestionModal, setShowAskQuestionModal] = useState(false);
  
  // Scrapbook modal state
  const [showScrapbookModal, setShowScrapbookModal] = useState(false);
  
  // Copy-to-album state
  const [contextMenuPhotoId, setContextMenuPhotoId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showCopyToAlbumModal, setShowCopyToAlbumModal] = useState(false);
  const [copyToPhotoId, setCopyToPhotoId] = useState<string | null>(null);
  const [allAlbums, setAllAlbums] = useState<{ id: string; title: string }[]>([]);
  const [isCopyingPhoto, setIsCopyingPhoto] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  const [askQuestionPhotoId, setAskQuestionPhotoId] = useState<string | null>(null);
  const [askQuestionMemberId, setAskQuestionMemberId] = useState<string | null>(null);
  const [askQuestionText, setAskQuestionText] = useState('');
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);
  const [realFamilyMembers, setRealFamilyMembers] = useState<AlbumMember[]>([]);
  const { user: currentUser } = useCurrentUser();

  // Fetch real family members for the question picker
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/auth/members');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setRealFamilyMembers(data.map((m: { id: string; name: string; relationship: string | null; avatar_color: string }) => ({
              id: m.id,
              name: m.name,
              relationship: m.relationship || undefined,
              avatar_color: m.avatar_color,
            })));
          }
        }
      } catch { /* use mock fallback */ }
    }
    fetchMembers();
  }, []);

  // Use real members, filtering out current user
  const questionMembers = realFamilyMembers.filter(m => m.id !== currentUser.id);

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

  // Fetch all albums for copy-to-album feature
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

  // Copy photo to another album
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

  // Create new album and copy photo to it
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
        // Add to local albums list
        setAllAlbums(prev => [...prev, { id: newEvent.id, title: newEvent.title }]);
        // Copy the photo to the new album
        await handleCopyToAlbum(photoId, newEvent.id);
        setNewAlbumName('');
      }
    } catch { /* ignore */ }
    finally { setIsCreatingAlbum(false); }
  };

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
          from_member_id: currentUser.id,
          to_member_id: askQuestionMemberId || null,
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

  const selectedClip: TimelineClip | null = selectedClipId 
    ? timelineClips.find(c => c.id === selectedClipId) ?? null
    : null;

  const selectedPoolPhoto = selectedPoolPhotoId
    ? photos.find(p => p.id === selectedPoolPhotoId)
    : null;

  const activePhotoId = selectedClip?.photoId ?? selectedPoolPhoto?.id ?? null;

  const totalDuration = timelineClips.reduce((acc, c) => acc + c.duration, 0);

  const isInTimeline = useCallback((photoId: string) => {
    return timelineClips.some(c => c.photoId === photoId);
  }, [timelineClips]);

  // ============================================================================
  // ANIMATION HANDLERS
  // ============================================================================

  /** Load saved style previews from Supabase for a photo+style */
  const loadStylePreviews = useCallback(async (photoId: string, styleId: string) => {
    try {
      const res = await fetch(`/api/photos/${photoId}/style-previews?style=${styleId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.previews && data.previews.length > 0) {
          const mapped = data.previews.map((p: { id: string; image_url: string; style_id: string; is_selected: boolean }) => ({
            id: p.id,
            imageUrl: p.image_url,
          }));
          setStylePreviews(mapped);
          setStylePreviewPhotoId(photoId);
          // Auto-select the first one or the one marked as selected
          const selectedIdx = data.previews.findIndex((p: { is_selected: boolean }) => p.is_selected);
          setSelectedPreviewIdx(selectedIdx >= 0 ? selectedIdx : 0);
          return mapped.length;
        }
      }
    } catch {
      // Non-critical — just means no saved previews
    }
    return 0;
  }, []);

  // Load style previews when selected photo or style changes — each photo keeps its own previews
  useEffect(() => {
    if (!activePhotoId || !selectedAnimStyle) return;
    const style = ANIMATION_STYLES.find(s => s.id === selectedAnimStyle);
    if (style?.needsStyleTransfer) {
      setStylePreviews([]);
      loadStylePreviews(activePhotoId, selectedAnimStyle);
    } else {
      setStylePreviews([]);
      setSelectedPreviewIdx(null);
    }
  }, [activePhotoId, selectedAnimStyle, loadStylePreviews]);

  /** Generate style-transferred preview images (appends to existing) */
  const handleGenerateStylePreviews = async (photoId: string, styleId: string) => {
    const photo = getPhoto(photoId);
    if (!photo?.original_url) return;

    setIsGeneratingPreviews(true);

    try {
      const response = await fetch('/api/stylize-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: photo.original_url, photoId, styleId, count: 2 }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Style preview failed');
      }

      const data = await response.json();
      if (data.previews && data.previews.length > 0) {
        const newPreviews = data.previews.map((p: { id?: string; imageUrl?: string; imageBase64?: string; mimeType?: string }) => ({
          id: p.id,
          imageUrl: p.imageUrl,
          imageBase64: p.imageBase64,
          mimeType: p.mimeType,
        }));
        // Append to existing previews
        setStylePreviews(prev => {
          const merged = [...prev, ...newPreviews];
          // Auto-select the first new one if nothing is selected
          if (selectedPreviewIdx === null) {
            setSelectedPreviewIdx(prev.length); // first new one
          }
          return merged;
        });
        setStylePreviewPhotoId(photoId);
      }
    } catch (error) {
      console.error('Style preview error:', error);
      alert(`Style preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingPreviews(false);
    }
  };

  const handleAnimatePhoto = async (photoId: string, provider: 'veo3' | 'grok', animationStyle: string = 'cinematic', stylizedImageBase64?: string, stylizedImageUrl?: string) => {
    const photo = getPhoto(photoId);
    if (!photo || animatingPhotoId) return;

    setAnimatingPhotoId(photoId);

    try {
      // If we have a pre-existing animated_url that isn't tracked as a version yet, save it first
      const existingVersions = animationVersions[photoId] || [];
      if (photo.animated_url && existingVersions.length === 0) {
        try {
          await fetch(`/api/photos/${photoId}/animations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: photo.animated_url,
              type: photo.animation_type || 'veo3',
              select: false,
            }),
          });
        } catch {
          // Non-critical, continue
        }
      }

      // Determine the image to animate:
      // Priority: stylizedImageBase64 > stylizedImageUrl > original photo URL
      const imagePayload: Record<string, unknown> = {};
      if (stylizedImageBase64) {
        imagePayload.photoBase64 = stylizedImageBase64.startsWith('data:')
          ? stylizedImageBase64
          : `data:image/jpeg;base64,${stylizedImageBase64}`;
        if (provider === 'grok') {
          // Grok needs a public URL — use the stylized URL if available, else fall back to original
          imagePayload.photoUrl = stylizedImageUrl || photo.original_url;
        }
      } else if (stylizedImageUrl) {
        // Stored style preview — pass URL (VEO route fetches and converts)
        imagePayload.photoUrl = stylizedImageUrl;
      } else {
        imagePayload.photoUrl = photo.original_url;
      }

      const endpoint = provider === 'grok' ? '/api/animate-photo-grok' : '/api/animate-photo';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...imagePayload,
          storyText: photo.summary || 'Create a subtle, cinematic animation of this photo.',
          duration: 5,
          animationStyle,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Animation failed');
      }

      const data = await response.json();
      
      // Upload video to storage
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
        
        // Save as a new animation version (select: true updates photo.animated_url for us)
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
        
        // Reload all versions from the server so we have a consistent list
        let updatedVersions = existingVersions;
        try {
          const versionsRes = await fetch(`/api/photos/${photoId}/animations`);
          if (versionsRes.ok) {
            const versionsData = await versionsRes.json();
            updatedVersions = (versionsData.versions || []).map((v: { id: string; url: string; type: string; is_selected: boolean; created_at: string }) => ({
              id: v.id,
              url: v.url,
              type: v.type as 'veo3' | 'grok-imagine',
              createdAt: new Date(v.created_at),
            }));
          }
        } catch {
          // Fall back to appending locally
          updatedVersions = [
            ...existingVersions,
            { id: newVersionId, url: savedData.animated_url, type: animationType as 'veo3' | 'grok-imagine', createdAt: new Date() },
          ];
        }
        
        setAnimationVersions(prev => ({ ...prev, [photoId]: updatedVersions }));
        setSelectedVersionId(prev => ({ ...prev, [photoId]: newVersionId }));
        
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
    
    // Clear style preview selection so preview monitor shows the animation video
    setSelectedPreviewIdx(null);
    
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
      // Build context for AI - use stories, perspectives, AND image URLs from photos
      const clipsWithStories = timelineClips.map(clip => {
        const photo = getPhoto(clip.photoId);
        return {
          order: clip.order + 1,
          story: photo?.summary || 'No story provided',
          hasAnimation: !!photo?.animated_url,
          perspectives: (photo as any)?.perspectives || [],
          imageUrl: photo?.original_url || photo?.thumbnail_url || null,
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
          narrativePov,
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
  }, [timelineClips, albumContext, narrativePov, event?.title, getPhoto, saveNarrationToDb]);

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
  // TEXT-TO-SPEECH NARRATION (ElevenLabs cloned voice only)
  // ============================================================================

  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackStoppedRef = useRef(false);
  const timelineClipsRef = useRef(timelineClips);
  timelineClipsRef.current = timelineClips;

  const stopSpeaking = useCallback(() => {
    playbackStoppedRef.current = true;
    narrationEndCallbackRef.current = null;
    if (narrationAudioRef.current) {
      narrationAudioRef.current.onended = null;
      narrationAudioRef.current.onerror = null;
      narrationAudioRef.current.pause();
      narrationAudioRef.current.src = '';
    }
    setIsSpeaking(false);
  }, []);

  const speakNarration = useCallback(async (text: string, onEnd?: () => void) => {
    if (!text || typeof window === 'undefined') {
      onEnd?.();
      return;
    }
    
    // Stop any ongoing audio first
    if (narrationAudioRef.current) {
      narrationAudioRef.current.onended = null;
      narrationAudioRef.current.onerror = null;
      narrationAudioRef.current.pause();
      narrationAudioRef.current.src = '';
    }

    const handleSpeechEnd = () => {
      if (playbackStoppedRef.current) return;
      setIsSpeaking(false);
      onEnd?.();
    };

    // Use cloned voice from localStorage
    const clonedVoiceId = localStorage.getItem('clonedVoiceId');
    
    if (clonedVoiceId) {
      setIsSpeaking(true);
      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text, 
            voiceId: clonedVoiceId,
            options: { stability: 0.5, similarityBoost: 0.75 }
          }),
        });
        
        if (playbackStoppedRef.current) { setIsSpeaking(false); return; }
        
        const data = await response.json();
        
        if (data.success && data.audioUrl) {
          if (!narrationAudioRef.current) {
            narrationAudioRef.current = new Audio();
          }
          const audio = narrationAudioRef.current;
          audio.src = data.audioUrl;
          audio.onended = handleSpeechEnd;
          audio.onerror = handleSpeechEnd;
          await audio.play().catch(handleSpeechEnd);
          return;
        }
      } catch (err) {
        console.warn('TTS failed:', err);
      }
      setIsSpeaking(false);
    }
    
    // No cloned voice: show text for estimated reading time, then advance
    setIsSpeaking(true);
    const words = text.split(/\s+/).length;
    const readingTimeMs = Math.max(3000, words * 350);
    setTimeout(() => {
      if (!playbackStoppedRef.current) handleSpeechEnd();
    }, readingTimeMs);
  }, []);

  // ============================================================================
  // PLAY TIMELINE - Storybook-style: clips loop, narration controls advancement
  // ============================================================================

  const advanceToClip = useCallback((clipIndex: number) => {
    const clips = timelineClipsRef.current;
    if (playbackStoppedRef.current || clipIndex >= clips.length) {
      // End of timeline
      setIsPlayingTimeline(false);
      setIsStorybookPreview(false);
      setCurrentClipIndex(0);
      setPlayheadPosition(0);
      setPreviewMode('single');
      stopSpeaking();
      return;
    }

    const clip = clips[clipIndex];
    setCurrentClipIndex(clipIndex);
    setPreviewPhotoId(clip.photoId);
    setSelectedClipId(clip.id);
    const completedDuration = clips
      .slice(0, clipIndex)
      .reduce((acc, c) => acc + c.duration, 0);
    setPlayheadPosition(completedDuration);

    if (clip.narration) {
      speakNarration(clip.narration, () => {
        if (!playbackStoppedRef.current) advanceToClip(clipIndex + 1);
      });
    } else {
      // No narration for this clip, wait briefly then advance
      setTimeout(() => {
        if (!playbackStoppedRef.current) advanceToClip(clipIndex + 1);
      }, 3000);
    }
  }, [speakNarration, stopSpeaking]);

  const handlePlayTimeline = () => {
    if (timelineClips.length === 0) return;
    
    playbackStoppedRef.current = false;
    setIsPlayingTimeline(true);
    setIsStorybookPreview(true);
    setCurrentClipIndex(0);
    setPlayheadPosition(0);
    setPreviewMode('timeline');
    setSelectedPoolPhotoId(null);
    
    // Start from first clip
    advanceToClip(0);
  };

  const handleStopTimeline = () => {
    stopSpeaking();
    setIsPlayingTimeline(false);
    setIsStorybookPreview(false);
    setCurrentClipIndex(0);
    setPlayheadPosition(0);
    setPreviewMode('single');
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  // In storybook mode, videos loop — narration controls advancement
  const handleVideoEnded = () => {
    if (!isPlayingTimeline) return;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      playbackStoppedRef.current = true;
      if (narrationAudioRef.current) {
        narrationAudioRef.current.onended = null;
        narrationAudioRef.current.onerror = null;
        narrationAudioRef.current.pause();
        narrationAudioRef.current.src = '';
      }
    };
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Force dark mode: inline CSS variables override inherited light-theme values from <html>
  const editorDarkOverride = {
    '--bg-primary': '#121214',
    '--bg-secondary': '#1a1a1c',
    '--bg-tertiary': '#242426',
    '--bg-elevated': '#1e1e20',
    '--text-primary': '#f0f0f0',
    '--text-secondary': 'rgba(240, 240, 240, 0.7)',
    '--text-tertiary': 'rgba(240, 240, 240, 0.5)',
    '--text-muted': 'rgba(240, 240, 240, 0.3)',
    '--eva-cyan': '#06b6d4',
    '--eva-cyan-light': '#22d3ee',
    '--eva-teal': '#14b8a6',
    '--eva-glow': 'rgba(6, 182, 212, 0.4)',
    '--accent-purple': '#8b5cf6',
    '--accent-amber': '#f59e0b',
    '--accent-emerald': '#10b981',
    '--border-subtle': 'rgba(255, 255, 255, 0.07)',
    '--border-default': 'rgba(255, 255, 255, 0.10)',
    '--border-hover': 'rgba(255, 255, 255, 0.16)',
    '--background': '#121214',
    '--foreground': '#f0f0f0',
    '--accent': '#06b6d4',
    '--accent-light': '#22d3ee',
    background: '#121214',
    color: '#f0f0f0',
  } as React.CSSProperties;

  if (loading) {
  return (
      <div className="min-h-screen flex items-center justify-center" style={editorDarkOverride}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={editorDarkOverride}>
      {/* ================================================================== */}
      {/* EDITOR TOOLBAR */}
      {/* ================================================================== */}
      <div className="h-14 flex items-center justify-between px-6 flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-5">
          <Link 
            href={`/album/${eventId}`}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Album
          </Link>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <span className="text-white text-lg font-medium" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>{event?.title || 'Untitled'}</span>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Album settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          
          {/* Album Context Dropdown */}
          <div className="h-5 w-px bg-white/10" />
          <select
            value={albumContext}
            onChange={(e) => setAlbumContext(e.target.value as AlbumContext)}
            className="text-white/70 text-sm px-3 py-2 rounded-lg focus:outline-none transition-colors"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
          >
            {ALBUM_CONTEXT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          {isSavingOrder && (
            <span className="text-cyan-400 text-sm animate-pulse">Saving...</span>
          )}
          <span className="text-white/40 text-sm">
            {timelineClips.length} clips • {formatTime(totalDuration)}
          </span>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={timelineClips.length === 0}
            className="px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
          >
            Export Film
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MAIN EDITOR AREA */}
      {/* ================================================================== */}
      <div className="flex-1 grid grid-cols-[minmax(200px,1fr)_minmax(400px,2.5fr)_minmax(240px,1.2fr)] min-h-0">
        
        {/* ---------------------------------------------------------------- */}
        {/* LEFT: MEDIA POOL - Draggable, with animation options */}
        {/* ---------------------------------------------------------------- */}
        <div 
          data-tutorial="photo-pool"
          className={`flex flex-col min-h-0 ${
            dragSource === 'timeline' ? 'ring-2 ring-inset ring-cyan-500/30' : ''
          } ${showTutorial && TUTORIAL_STEPS[tutorialStep]?.highlight === 'photo-pool' ? 'relative z-[205]' : ''}`}
          style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)' }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => handlePoolDrop(e)}
        >
          <div className="h-12 flex-shrink-0 flex items-center px-4" style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-white/50 text-sm font-medium uppercase tracking-wider">Media Pool</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-cyan-400 text-sm font-medium" style={{ background: 'rgba(6,182,212,0.15)' }}>{photos.length}</span>
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuPhotoId(photo.id);
                      setContextMenuPos({ x: e.clientX, y: e.clientY });
                    }}
                    onClick={() => {
                      setContextMenuPhotoId(null);
                      // If this photo is already in the timeline, select its clip instead
                      const existingClip = timelineClips.find(c => c.photoId === photo.id);
                      if (existingClip) {
                        setSelectedClipId(existingClip.id);
                        setSelectedPoolPhotoId(null);
                      } else {
                        setSelectedPoolPhotoId(photo.id);
                        setSelectedClipId(null);
                      }
                      setPreviewPhotoId(photo.id);
                      setPreviewMode('single');
                    }}
                    className={`aspect-video rounded-lg overflow-hidden relative group transition-all cursor-grab active:cursor-grabbing ${
                      inTimeline ? 'opacity-60' : ''
                    } ${
                      selectedPoolPhotoId === photo.id || (selectedClip && selectedClip.photoId === photo.id)
                        ? 'ring-2 ring-cyan-400' 
                        : 'hover:ring-1 hover:ring-white/30'
                    } ${
                      isBeingDragged ? 'opacity-50' : ''
                    } ${
                      isDragOver ? 'ring-2 ring-cyan-400' : ''
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
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: 'rgba(6,182,212,0.9)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[9px] text-white font-medium">Animated</span>
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
            <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="text-center text-cyan-400 text-sm py-3 border-2 border-dashed rounded-lg" style={{ borderColor: 'rgba(6,182,212,0.5)' }}>
                Drop here to remove from timeline
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* CENTER: PREVIEW MONITOR - Native video controls */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col min-w-0" style={{ background: 'var(--bg-primary)', borderRight: '1px solid var(--border-subtle)' }}>
          <div className="h-12 flex items-center px-4" style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Preview</span>
            {previewMode === 'timeline' && (
              <span className="ml-3 text-purple-400 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full animate-pulse bg-purple-400" />
                Storybook Preview
              </span>
            )}
            {isSpeaking && (
              <span className="ml-3 text-amber-400 text-sm flex items-center gap-1">
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

                  // If a style preview is selected for this photo, show the styled image
                  const hasActiveStylePreview = selectedPreviewIdx !== null
                    && stylePreviewPhotoId === previewPhotoId
                    && stylePreviews[selectedPreviewIdx];
                  
                  if (hasActiveStylePreview && !isPlayingTimeline) {
                    const preview = stylePreviews[selectedPreviewIdx!];
                    const previewSrc = preview.imageBase64
                      ? (preview.imageBase64.startsWith('data:') ? preview.imageBase64 : `data:${preview.mimeType || 'image/png'};base64,${preview.imageBase64}`)
                      : preview.imageUrl || '';
                    return (
                      <img
                        src={previewSrc}
                        alt="Style preview"
                        className="w-full h-full object-contain"
                      />
                    );
                  }

                  if (photo.animated_url) {
                    return (
                      <video
                        ref={videoRef}
                        src={photo.animated_url}
                        controls
                        autoPlay
                        loop={!isPlayingTimeline || isStorybookPreview}
                        onEnded={handleVideoEnded}
                        onTimeUpdate={handleVideoTimeUpdate}
                        className="w-full h-full object-contain"
                        playsInline
                      />
                    );
                  }
                  
                  // Static image - during timeline playback, auto-advance after duration
                  // In storybook preview, static images don't auto-advance (narration controls it)
                  return (
                    <StaticImageWithTimer
                      src={photo.original_url || photo.thumbnail_url || ''}
                      duration={(isPlayingTimeline && !isStorybookPreview) ? (timelineClips[currentClipIndex]?.duration || 5) * 1000 : 0}
                      onComplete={(isPlayingTimeline && !isStorybookPreview) ? handleVideoEnded : undefined}
                      onProgress={(isPlayingTimeline && !isStorybookPreview) ? handleStaticImageProgress : undefined}
                      isPlaying={isPlayingTimeline && !isStorybookPreview}
                    />
                  );
                })()}
                
                {/* Animation / Style badge */}
                {(() => {
                  const photo = getPhoto(previewPhotoId);
                  const hasActiveStylePreview = selectedPreviewIdx !== null
                    && stylePreviewPhotoId === previewPhotoId
                    && stylePreviews[selectedPreviewIdx];
                  
                  if (hasActiveStylePreview && !isPlayingTimeline) {
                    const currentStyle = ANIMATION_STYLES.find(s => s.id === selectedAnimStyle);
                    return (
                      <div className="absolute top-3 left-3 px-3 py-1.5 text-white text-sm font-medium rounded-lg flex items-center gap-2" style={{ background: 'rgba(168,85,247,0.9)' }}>
                        <span>{currentStyle?.icon || '🎨'}</span>
                        {currentStyle?.label || 'Styled'} Preview
                      </div>
                    );
                  }
                  
                  if (photo?.animated_url) {
                    return (
                      <div className="absolute top-3 left-3 px-3 py-1.5 text-white text-sm font-medium rounded-lg flex items-center gap-2" style={{ background: 'rgba(6,182,212,0.9)' }}>
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        {photo.animation_type === 'grok-imagine' ? 'Grok Imagine' : 'VEO 3'}
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
          className={`flex flex-col ${showTutorial && TUTORIAL_STEPS[tutorialStep]?.highlight === 'inspector' ? 'relative z-[205]' : ''}`}
          style={{ background: 'var(--bg-secondary)' }}
        >
          {/* Inspector Header */}
          <div className="h-12 flex items-center justify-between px-4" style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-white/50 text-sm font-medium uppercase tracking-wider">Inspector</span>
            {(selectedClip || selectedPoolPhoto) && (
              <span className="text-cyan-400/70 text-sm">
                {selectedClip ? `Clip ${timelineClips.findIndex(c => c.id === selectedClip.id) + 1}` : 'Photo'}
              </span>
            )}
          </div>
          
          {/* Inspector Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedClip ? (
              <>
                {/* Photo Preview Card */}
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="aspect-video bg-black">
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
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPhoto(selectedClip.photoId)?.animated_url ? (
                        <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: 'rgba(6,182,212,0.3)' }}>
                          ✓ Animated
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium text-white/50" style={{ background: subtleBg }}>
                          Static
                        </span>
                      )}
                      {getPhoto(selectedClip.photoId)?.has_story && (
                        <span className="px-2 py-1 rounded text-xs font-medium text-amber-400" style={{ background: 'rgba(251,191,36,0.15)' }}>
                          Has Story
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleEnhancePhoto(selectedClip.photoId)}
                      disabled={!!enhancingPhotoId}
                      className="text-white/50 hover:text-white text-xs transition-colors disabled:opacity-40"
                    >
                      {enhancingPhotoId === selectedClip.photoId ? '🍌...' : '🍌 Crop'}
                    </button>
                  </div>
                </div>

                {/* Animation Section */}
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-tertiary)' }}>
                  <h3 className="text-white text-sm font-medium mb-3">Animation</h3>
                  
                  {(() => {
                    const photo = getPhoto(selectedClip.photoId);
                    const versions = animationVersions[selectedClip.photoId] || [];
                    const isAnimating = animatingPhotoId === selectedClip.photoId;
                    const hasAnimation = !!photo?.animated_url;
                    const currentStyle = ANIMATION_STYLES.find(s => s.id === selectedAnimStyle) || ANIMATION_STYLES[0];
                    
                    return (
                      <div className="space-y-3">
                        {/* Status indicator */}
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                          <div className="flex items-center gap-2">
                            {hasAnimation ? (
                              <>
                                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                <span className="text-white text-sm">{photo?.animation_type === 'grok-imagine' ? 'Grok Imagine' : 'VEO 3'}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 rounded-full bg-white/30" />
                                <span className="text-white/60 text-sm">Ken Burns (default)</span>
                              </>
                            )}
                          </div>
                          {hasAnimation && versions.length > 0 && (
                            <span className="text-white/40 text-xs">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        
                        {/* Version selector */}
                        {hasAnimation && versions.length > 1 && (
                          <div className="flex gap-1 overflow-x-auto pb-1">
                            {versions.map((v, i) => (
                              <button
                                key={v.id}
                                onClick={() => selectAnimationVersion(selectedClip.photoId, v.id)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                  selectedVersionId[selectedClip.photoId] === v.id ? 'text-white' : 'text-white/50 hover:text-white'
                                }`}
                                style={{ background: selectedVersionId[selectedClip.photoId] === v.id ? 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' : subtleBgLight }}
                              >
                                {v.type === 'grok-imagine' ? 'Grok' : 'VEO'} #{i + 1}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Style picker — horizontal scroll */}
                        <div>
                          <p className="text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">Style</p>
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {ANIMATION_STYLES.map(s => (
                              <button
                                key={s.id}
                                onClick={() => !s.disabled && setSelectedAnimStyle(s.id)}
                                disabled={s.disabled}
                                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all text-center ${
                                  s.disabled
                                    ? 'text-white/30 cursor-not-allowed opacity-60'
                                    : selectedAnimStyle === s.id ? 'text-white ring-1 ring-cyan-400/50' : 'text-white/50 hover:text-white/80'
                                }`}
                                style={{
                                  background: s.disabled
                                    ? 'var(--bg-tertiary)'
                                    : selectedAnimStyle === s.id
                                      ? 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(20,184,166,0.25))'
                                      : 'var(--bg-primary)',
                                }}
                                title={s.disabled ? 'Coming soon' : s.description}
                              >
                                <span className="block text-base mb-0.5">{s.icon}</span>
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Style preview step — for styles needing visual transformation */}
                        {currentStyle.needsStyleTransfer && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
                                Preview{stylePreviews.length > 0 ? ` (${stylePreviews.length})` : ''}
                              </p>
                              <button
                                onClick={() => handleGenerateStylePreviews(selectedClip.photoId, selectedAnimStyle)}
                                disabled={isGeneratingPreviews || isAnimating}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, var(--eva-teal), var(--eva-cyan))' }}
                              >
                                {isGeneratingPreviews ? (
                                  <span className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                  </span>
                                ) : stylePreviews.length > 0 ? '+ Generate More' : `Generate ${currentStyle.label}`}
                              </button>
                            </div>
                            
                            {/* Preview thumbnails */}
                            {stylePreviews.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {stylePreviews.map((p, i) => (
                                  <button
                                    key={p.id || i}
                                    onClick={() => {
                                      setSelectedPreviewIdx(i);
                                      // Deselect animation version so preview monitor shows the styled image
                                      const photoId = selectedClip?.photoId ?? selectedPoolPhoto?.id;
                                      if (photoId) {
                                        setSelectedVersionId(prev => {
                                          const next = { ...prev };
                                          delete next[photoId];
                                          return next;
                                        });
                                      }
                                    }}
                                    className={`relative rounded-lg overflow-hidden aspect-[4/3] transition-all ${
                                      selectedPreviewIdx === i ? 'ring-2 ring-cyan-400 scale-[1.02]' : 'ring-1 ring-white/10 opacity-70 hover:opacity-100'
                                    }`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={p.imageUrl || (p.imageBase64 ? `data:${p.mimeType || 'image/jpeg'};base64,${p.imageBase64}` : '')}
                                      alt={`${currentStyle.label} preview ${i + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    {selectedPreviewIdx === i && (
                                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {stylePreviews.length === 0 && !isGeneratingPreviews && (
                              <p className="text-white/30 text-xs text-center py-3">Generate {currentStyle.label} previews to see how your photo will look</p>
                            )}
                          </div>
                        )}
                        
                        {/* Workflow hint for styles needing style transfer */}
                        {currentStyle.needsStyleTransfer && stylePreviews.length === 0 && !isGeneratingPreviews && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <span className="text-amber-400 text-sm">💡</span>
                            <p className="text-amber-300/80 text-xs leading-relaxed">
                              <strong>Step 1:</strong> Generate {currentStyle.label} preview above first, then <strong>Step 2:</strong> animate with VEO 3 or Grok below.
                            </p>
                          </div>
                        )}

                        {/* Warning note */}
                        <p className="text-amber-400/70 text-xs">⚠️ VEO 3 cannot animate photos with minors</p>
                        
                        {/* Generate buttons — both equally styled */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const selected = (currentStyle.needsStyleTransfer && selectedPreviewIdx !== null) ? stylePreviews[selectedPreviewIdx] : null;
                              handleAnimatePhoto(selectedClip.photoId, 'veo3', selectedAnimStyle, selected?.imageBase64, selected?.imageUrl);
                            }}
                            disabled={isAnimating || (currentStyle.needsStyleTransfer && stylePreviews.length > 0 && selectedPreviewIdx === null)}
                            className="py-2.5 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                          >
                            {isAnimating ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                              </span>
                            ) : (
                              <>{hasAnimation ? '+ ' : '🎬 '}VEO 3</>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              const selected = (currentStyle.needsStyleTransfer && selectedPreviewIdx !== null) ? stylePreviews[selectedPreviewIdx] : null;
                              handleAnimatePhoto(selectedClip.photoId, 'grok', selectedAnimStyle, selected?.imageBase64, selected?.imageUrl);
                            }}
                            disabled={isAnimating || (currentStyle.needsStyleTransfer && stylePreviews.length > 0 && selectedPreviewIdx === null)}
                            className="py-2.5 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
                          >
                            {isAnimating ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                              </span>
                            ) : (
                              <>{hasAnimation ? '+ ' : '🎬 '}Grok</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Story Section */}
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white text-sm font-medium">Story</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStoryModalPhotoId(selectedClip.photoId)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                        style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Record
                      </button>
                      <button
                        onClick={() => {
                          setAskQuestionPhotoId(selectedClip.photoId);
                          setAskQuestionMemberId(null);
                          setAskQuestionText('');
                          setShowAskQuestionModal(true);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                        style={{ background: subtleBg, border: `1px solid ${subtleBorder}` }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        Ask
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
                          className="w-full h-24 rounded-lg px-3 py-2 text-white/80 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                          placeholder="What happened in this photo..."
                        />
                      );
                    }
                    return (
                      <div 
                        onClick={() => setEditingSummaryPhotoId(selectedClip.photoId)}
                        className="p-3 rounded-lg text-sm min-h-[80px] cursor-pointer transition-colors hover:ring-1 hover:ring-cyan-400/30"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                      >
                        {photo?.summary ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-medium"
                                style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                              >
                                {userName?.charAt(0) || 'U'}
                              </div>
                              <span className="text-white/50 text-xs">{userName || 'You'}</span>
                            </div>
                            <p className="text-white/70 leading-relaxed italic">"{photo.summary}"</p>
                          </>
                        ) : (
                          <p className="text-white/30 italic">Click to add a story or use the Record button...</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => removeFromTimeline(selectedClip.id)}
                    className="flex-1 py-2.5 text-white/60 hover:text-white text-xs rounded-lg transition-colors"
                    style={{ background: subtleBgLight, border: `1px solid ${subtleBorderLight}` }}
                  >
                    Remove from Timeline
                  </button>
                  <button
                    onClick={() => handleDeletePhoto(selectedClip.photoId)}
                    className="px-4 py-2.5 text-red-400 text-xs rounded-lg transition-colors hover:bg-red-500/10"
                    style={{ border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : selectedPoolPhoto ? (
              <>
                {/* Photo Preview Card */}
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="aspect-video bg-black">
                    <img
                      src={selectedPoolPhoto.original_url || selectedPoolPhoto.thumbnail_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedPoolPhoto.animated_url ? (
                        <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ background: 'rgba(6,182,212,0.3)' }}>
                          ✓ Animated
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium text-white/50" style={{ background: subtleBg }}>
                          Static
                        </span>
                      )}
                      {selectedPoolPhoto.has_story && (
                        <span className="px-2 py-1 rounded text-xs font-medium text-amber-400" style={{ background: 'rgba(251,191,36,0.15)' }}>
                          Has Story
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleEnhancePhoto(selectedPoolPhoto.id)}
                      disabled={!!enhancingPhotoId}
                      className="text-white/50 hover:text-white text-xs transition-colors disabled:opacity-40"
                    >
                      {enhancingPhotoId === selectedPoolPhoto.id ? '🍌...' : '🍌 Crop'}
                    </button>
                  </div>
                </div>

                {/* Animation Section */}
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-tertiary)' }}>
                  <h3 className="text-white text-sm font-medium mb-3">Animation</h3>
                  
                  {(() => {
                    const versions = animationVersions[selectedPoolPhoto.id] || [];
                    const isAnimating = animatingPhotoId === selectedPoolPhoto.id;
                    const hasAnimation = !!selectedPoolPhoto.animated_url;
                    const currentStyle = ANIMATION_STYLES.find(s => s.id === selectedAnimStyle) || ANIMATION_STYLES[0];
                    
                    return (
                      <div className="space-y-3">
                        {/* Status indicator */}
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                          <div className="flex items-center gap-2">
                            {hasAnimation ? (
                              <>
                                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                <span className="text-white text-sm">{selectedPoolPhoto.animation_type === 'grok-imagine' ? 'Grok Imagine' : 'VEO 3'}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 rounded-full bg-white/30" />
                                <span className="text-white/60 text-sm">Ken Burns (default)</span>
                              </>
                            )}
                          </div>
                          {hasAnimation && versions.length > 0 && (
                            <span className="text-white/40 text-xs">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        
                        {/* Version selector */}
                        {hasAnimation && versions.length > 1 && (
                          <div className="flex gap-1 overflow-x-auto pb-1">
                            {versions.map((v, i) => (
                              <button
                                key={v.id}
                                onClick={() => selectAnimationVersion(selectedPoolPhoto.id, v.id)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                  selectedVersionId[selectedPoolPhoto.id] === v.id ? 'text-white' : 'text-white/50 hover:text-white'
                                }`}
                                style={{ background: selectedVersionId[selectedPoolPhoto.id] === v.id ? 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' : subtleBgLight }}
                              >
                                {v.type === 'grok-imagine' ? 'Grok' : 'VEO'} #{i + 1}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Style picker — horizontal scroll */}
                        <div>
                          <p className="text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">Style</p>
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {ANIMATION_STYLES.map(s => (
                              <button
                                key={s.id}
                                onClick={() => !s.disabled && setSelectedAnimStyle(s.id)}
                                disabled={s.disabled}
                                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all text-center ${
                                  s.disabled
                                    ? 'text-white/30 cursor-not-allowed opacity-60'
                                    : selectedAnimStyle === s.id ? 'text-white ring-1 ring-cyan-400/50' : 'text-white/50 hover:text-white/80'
                                }`}
                                style={{
                                  background: s.disabled
                                    ? 'var(--bg-tertiary)'
                                    : selectedAnimStyle === s.id
                                      ? 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(20,184,166,0.25))'
                                      : 'var(--bg-primary)',
                                }}
                                title={s.disabled ? 'Coming soon' : s.description}
                              >
                                <span className="block text-base mb-0.5">{s.icon}</span>
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Style preview step — for styles needing visual transformation */}
                        {currentStyle.needsStyleTransfer && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
                                Preview{stylePreviews.length > 0 ? ` (${stylePreviews.length})` : ''}
                              </p>
                              <button
                                onClick={() => handleGenerateStylePreviews(selectedPoolPhoto.id, selectedAnimStyle)}
                                disabled={isGeneratingPreviews || isAnimating}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, var(--eva-teal), var(--eva-cyan))' }}
                              >
                                {isGeneratingPreviews ? (
                                  <span className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                  </span>
                                ) : stylePreviews.length > 0 ? '+ Generate More' : `Generate ${currentStyle.label}`}
                              </button>
                            </div>
                            
                            {/* Preview thumbnails */}
                            {stylePreviews.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {stylePreviews.map((p, i) => (
                                  <button
                                    key={p.id || i}
                                    onClick={() => {
                                      setSelectedPreviewIdx(i);
                                      // Deselect animation version so preview monitor shows the styled image
                                      const photoId = selectedPoolPhoto?.id;
                                      if (photoId) {
                                        setSelectedVersionId(prev => {
                                          const next = { ...prev };
                                          delete next[photoId];
                                          return next;
                                        });
                                      }
                                    }}
                                    className={`relative rounded-lg overflow-hidden aspect-[4/3] transition-all ${
                                      selectedPreviewIdx === i ? 'ring-2 ring-cyan-400 scale-[1.02]' : 'ring-1 ring-white/10 opacity-70 hover:opacity-100'
                                    }`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={p.imageUrl || (p.imageBase64 ? `data:${p.mimeType || 'image/jpeg'};base64,${p.imageBase64}` : '')}
                                      alt={`${currentStyle.label} preview ${i + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    {selectedPreviewIdx === i && (
                                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {stylePreviews.length === 0 && !isGeneratingPreviews && (
                              <p className="text-white/30 text-xs text-center py-3">Generate {currentStyle.label} previews to see how your photo will look</p>
                            )}
                          </div>
                        )}
                        
                        {/* Workflow hint for styles needing style transfer */}
                        {currentStyle.needsStyleTransfer && stylePreviews.length === 0 && !isGeneratingPreviews && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <span className="text-amber-400 text-sm">💡</span>
                            <p className="text-amber-300/80 text-xs leading-relaxed">
                              <strong>Step 1:</strong> Generate {currentStyle.label} preview above first, then <strong>Step 2:</strong> animate with VEO 3 or Grok below.
                            </p>
                          </div>
                        )}

                        {/* Warning note */}
                        <p className="text-amber-400/70 text-xs">⚠️ VEO 3 cannot animate photos with minors</p>
                        
                        {/* Generate buttons — both equally styled */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const selected = (currentStyle.needsStyleTransfer && selectedPreviewIdx !== null) ? stylePreviews[selectedPreviewIdx] : null;
                              handleAnimatePhoto(selectedPoolPhoto.id, 'veo3', selectedAnimStyle, selected?.imageBase64, selected?.imageUrl);
                            }}
                            disabled={isAnimating || (currentStyle.needsStyleTransfer && stylePreviews.length > 0 && selectedPreviewIdx === null)}
                            className="py-2.5 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                          >
                            {isAnimating ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                              </span>
                            ) : (
                              <>{hasAnimation ? '+ ' : '🎬 '}VEO 3</>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              const selected = (currentStyle.needsStyleTransfer && selectedPreviewIdx !== null) ? stylePreviews[selectedPreviewIdx] : null;
                              handleAnimatePhoto(selectedPoolPhoto.id, 'grok', selectedAnimStyle, selected?.imageBase64, selected?.imageUrl);
                            }}
                            disabled={isAnimating || (currentStyle.needsStyleTransfer && stylePreviews.length > 0 && selectedPreviewIdx === null)}
                            className="py-2.5 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
                          >
                            {isAnimating ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                              </span>
                            ) : (
                              <>{hasAnimation ? '+ ' : '🎬 '}Grok</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Story Section */}
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white text-sm font-medium">Story</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStoryModalPhotoId(selectedPoolPhoto.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                        style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Record
                      </button>
                      <button
                        onClick={() => {
                          setAskQuestionPhotoId(selectedPoolPhoto.id);
                          setAskQuestionMemberId(null);
                          setAskQuestionText('');
                          setShowAskQuestionModal(true);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                        style={{ background: subtleBg, border: `1px solid ${subtleBorder}` }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        Ask
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
                      className="w-full h-24 rounded-lg px-3 py-2 text-white/80 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                      placeholder="What happened in this photo..."
                    />
                  ) : (
                    <div 
                      onClick={() => setEditingSummaryPhotoId(selectedPoolPhoto.id)}
                      className="p-3 rounded-lg text-sm min-h-[80px] cursor-pointer transition-colors hover:ring-1 hover:ring-cyan-400/30"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                    >
                      {selectedPoolPhoto.summary ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-medium"
                              style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                            >
                              {userName?.charAt(0) || 'U'}
                            </div>
                            <span className="text-white/50 text-xs">{userName || 'You'}</span>
                          </div>
                          <p className="text-white/70 leading-relaxed italic">"{selectedPoolPhoto.summary}"</p>
                        </>
                      ) : (
                        <p className="text-white/30 italic">Click to add a story or use the Record button...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Add to timeline */}
                {!isInTimeline(selectedPoolPhoto.id) && (
                  <button
                    onClick={() => addToTimeline(selectedPoolPhoto.id)}
                    className="w-full py-3 text-white text-sm font-medium rounded-xl transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                  >
                    + Add to Timeline
                  </button>
                )}

                {/* Delete from album */}
                <button
                  onClick={() => handleDeletePhoto(selectedPoolPhoto.id)}
                  className="w-full py-2.5 text-red-400/70 hover:text-red-400 text-xs rounded-lg transition-colors hover:bg-red-500/10"
                >
                  Delete from Album
                </button>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-tertiary)' }}>
                  <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm mb-1">No Selection</p>
                <p className="text-white/20 text-xs">Select a photo from the Media Pool or a clip from the Timeline</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* EXPORT MODAL */}
      {/* ================================================================== */}
      {showExportModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowExportModal(false)}
        >
          <div className="rounded-2xl max-w-lg w-full mx-4 overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(20,20,22,1) 0%, rgba(12,12,14,1) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Header with gradient accent */}
            <div className="px-8 pt-8 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white text-xl font-medium" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>Export Memory Film</h3>
                  <p className="text-white/30 text-sm">{event?.title || 'Untitled Album'}</p>
                </div>
              </div>
            </div>
            
            {/* Stats grid */}
            <div className="px-8 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Clips</p>
                  <p className="text-white text-2xl font-light">{timelineClips.length}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-white text-2xl font-light">{formatTime(totalDuration)}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Animated</p>
                  <p className="text-cyan-400 text-2xl font-light">
                    {timelineClips.filter(c => getPhoto(c.photoId)?.animated_url).length}<span className="text-white/30 text-base">/{timelineClips.length}</span>
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Narration</p>
                  <p className="text-white text-2xl font-light">
                    {narrativePov === 'first_person' ? '1st' : '3rd'}<span className="text-white/30 text-base ml-1">person</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 pb-6">
              <p className="text-white/40 text-sm leading-relaxed">
                Animated clips use AI-generated video, others use Ken Burns effect. Narration is synthesized from your script.
              </p>
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3.5 text-white/60 text-sm font-medium rounded-xl transition-all hover:text-white hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setShowVideoExporter(true);
                }}
                className="flex-1 py-3.5 text-white text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
                style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
              >
                Export Film
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}
        >
          <div 
            className="rounded-2xl p-6 max-w-md w-full mx-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white text-xl font-medium mb-6" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>Album Settings</h3>
            
            <div className="space-y-4 mb-6">
                    <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">Name</label>
                <input
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                  placeholder="Album name"
                />
                    </div>
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-2">Date</label>
                <input
                  type="date"
                  value={settingsDate}
                  onChange={(e) => setSettingsDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', colorScheme: isLight ? 'light' : 'dark' }}
                />
                  </div>
                </div>

            <div className="pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-red-400/80 text-sm font-medium mb-3">Danger zone</p>
              <p className="text-white/40 text-xs mb-3">
                Deleting this album will permanently remove it and all its photos. This cannot be undone.
              </p>
              <div className="space-y-3">
                <label className="block text-white/50 text-xs">
                  Type <span className="text-white font-mono font-medium">{event.title}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={event.title}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(239,68,68,0.3)' }}
                />
                <button
                  onClick={handleDeleteAlbum}
                  disabled={deleteConfirmText !== event.title || isDeleting}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Delete album'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-3 text-white text-sm font-medium rounded-xl transition-colors"
                style={{ background: subtleBg, border: `1px solid ${subtleBorder}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={!settingsTitle.trim() || isSavingSettings}
                className="flex-1 py-3 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
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
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div 
                className="h-14 px-5 flex items-center justify-between flex-shrink-0"
                style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(34, 211, 238, 0.15)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: 'var(--eva-cyan)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white font-serif text-lg">Ask a Question</h2>
                    <p className="text-white/50 text-xs">Select who would know the context</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAskQuestionModal(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  style={{ background: subtleBg }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Full photo */}
                <div 
                  className="rounded-xl overflow-hidden aspect-video w-full"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                >
                  <img
                    src={photo.original_url || photo.thumbnail_url || ''}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Who to ask (who would know the context) */}
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">To:</label>
                  <div className="flex flex-wrap gap-2">
                    {questionMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setAskQuestionMemberId(askQuestionMemberId === m.id ? null : m.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          askQuestionMemberId === m.id
                            ? 'ring-2 ring-cyan-400'
                            : ''
                        }`}
                        style={{ 
                          background: askQuestionMemberId === m.id 
                            ? 'rgba(34, 211, 238, 0.15)' 
                            : subtleBgLight,
                          border: askQuestionMemberId === m.id 
                            ? 'none' 
                            : '1px solid var(--border-subtle)'
                        }}
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
                    className="w-full h-28 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-colors"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                    disabled={isSendingQuestion}
                  />
                </div>
              </div>

              {/* Footer */}
              <div 
                className="px-5 py-4 flex justify-end gap-3 flex-shrink-0"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <button
                  onClick={() => setShowAskQuestionModal(false)}
                  className="px-4 py-2.5 text-white/60 hover:text-white transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendQuestion}
                  disabled={!askQuestionText.trim() || isSendingQuestion}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    background: askQuestionText.trim() && !isSendingQuestion 
                      ? 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' 
                      : 'rgba(34, 211, 238, 0.2)'
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
        className={`h-96 flex flex-col flex-shrink-0 ${showTutorial && TUTORIAL_STEPS[tutorialStep]?.highlight === 'timeline' ? 'relative z-[205]' : ''}`}
        style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}
      >
        {/* Timeline header with play button and regenerate */}
        <div className="h-12 flex items-center px-5" style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
          {isPlayingTimeline ? (
            <button
              onClick={handleStopTimeline}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors mr-2"
            >
              ⏹ Stop
            </button>
          ) : (
            <button
              onClick={handlePlayTimeline}
              disabled={timelineClips.length === 0}
              className="px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors mr-2 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
            >
              ▶ Play
            </button>
          )}
          
          {/* POV Toggle — prominent */}
          <div className="flex items-center gap-1 rounded-xl overflow-hidden mr-2 p-1" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setNarrativePov('first_person')}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                narrativePov === 'first_person' 
                  ? 'text-white bg-cyan-600 shadow-lg shadow-cyan-600/30' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
              title="First person: 'I remember when...'"
            >
              1st Person
            </button>
            <button
              onClick={() => setNarrativePov('third_person')}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                narrativePov === 'third_person' 
                  ? 'text-white bg-purple-600 shadow-lg shadow-purple-600/30' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
              title="Third person: 'Sarah remembers when...'"
            >
              3rd Person
            </button>
          </div>

          {/* Generate Narration Button */}
          <button
            onClick={generateNarration}
            disabled={isGeneratingNarration || timelineClips.length === 0}
            className="px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-all mr-2 disabled:opacity-40 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
          >
            {isGeneratingNarration ? '✨ Generating...' : `✨ Generate ${narrativePov === 'first_person' ? '1st' : '3rd'} Person Narration`}
          </button>

          {/* Clear All Narration Button */}
          {!isPlayingTimeline && timelineClips.some(c => c.narration) && (
            <button
              onClick={() => {
                const cleared = timelineClips.map(c => ({ ...c, narration: '' }));
                setTimelineClips(cleared);
                saveNarrationToDb(cleared);
              }}
              className="px-3 py-2 text-white/40 text-sm hover:text-red-400 transition-colors mr-2"
            >
              Clear Narration
            </button>
          )}
          
          {isPlayingTimeline && (
            <span className="text-purple-400 text-sm mr-3">
              Clip {currentClipIndex + 1}/{timelineClips.length}
              {isSpeaking ? ' · Narrating...' : ''}
            </span>
          )}
          <div className="flex-1" />
        </div>

        {/* Track area - scrollable */}
        <div 
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onDrop={(e) => handleTimelineDrop(e)}
          onDragOver={handleTimelineDragOver}
        >
          <div className="h-full flex flex-col" style={{ minWidth: Math.max(timelineClips.length * 160 + 150, 1000) }}>
            
            {/* VIDEO TRACK */}
            <div className="flex-1 flex min-h-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {/* Track label */}
              <div className="w-28 flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border-subtle)' }}>
                <span className="text-cyan-400/70 text-sm font-medium uppercase tracking-wider">Video</span>
              </div>

              {/* Track content */}
              <div 
                className={`flex-1 relative ${
                  dragSource === 'pool' ? 'ring-2 ring-inset ring-cyan-400/30' : ''
                }`}
                style={{ background: dragSource === 'pool' ? 'rgba(6,182,212,0.05)' : 'transparent' }}
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
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenuPhotoId(clip.photoId);
                            setContextMenuPos({ x: e.clientX, y: e.clientY });
                          }}
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
                          className={`flex-shrink-0 h-[90%] rounded-lg cursor-pointer overflow-hidden transition-all ${
                            isCurrentlyPlaying
                              ? 'ring-2 ring-green-400 ring-offset-1'
                              : selectedClipId === clip.id
                              ? 'ring-2 ring-cyan-400 ring-offset-1'
                              : 'hover:ring-1 hover:ring-white/30'
                          } ${
                            !isPlayingTimeline ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${
                            isBeingDragged ? 'opacity-50' : ''
                          } ${
                            isDragOver ? 'ml-4 ring-2 ring-cyan-400' : ''
                          }`}
                          style={{ width: 150 }}
                        >
                          <div className="relative h-full rounded-lg pointer-events-none select-none" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
                            {/* Top bar */}
                            <div 
                              className="h-5 flex items-center px-2 rounded-t-lg"
                              style={{ background: isCurrentlyPlaying ? 'rgba(74,222,128,0.8)' : 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                            >
                              <span className="text-white text-xs font-medium truncate">
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
              <div className="w-28 flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border-subtle)' }}>
                <span className="text-amber-400/70 text-sm font-medium uppercase tracking-wider">Narration</span>
              </div>

              {/* Narration clips */}
              <div className="flex-1 relative" style={{ background: 'var(--bg-primary)' }}>
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
                <div className="absolute inset-0 flex items-stretch px-3 gap-2 py-1">
                  {timelineClips.map((clip, index) => {
                    const isCurrentlyPlaying = isPlayingTimeline && currentClipIndex === index;
                    const hasLongText = (clip.narration?.length || 0) > 60;
                    
                    return (
                      <div
                        key={`narration-${clip.id}`}
                        onClick={() => {
                          setNarrationModalClipId(clip.id);
                          setSelectedClipId(clip.id);
                          setSelectedPoolPhotoId(null);
                          setPreviewPhotoId(clip.photoId);
                        }}
                        className={`flex-shrink-0 rounded overflow-hidden transition-all cursor-pointer hover:brightness-110 ${
                          isCurrentlyPlaying
                            ? 'ring-2 ring-green-500'
                            : selectedClipId === clip.id
                            ? 'ring-2 ring-amber-500'
                            : 'ring-1 ring-amber-500/30 hover:ring-amber-500/60'
                        }`}
                        style={{ width: 150 }}
                      >
                        <div className="h-full bg-amber-900/30 border border-amber-500/20 rounded p-2 overflow-y-auto">
                          <div className="h-full overflow-y-auto">
                            {clip.narration ? (
                              <p className={`text-amber-100/80 leading-tight ${hasLongText ? 'text-xs' : 'text-xs'}`}>
                                {clip.narration}
                              </p>
                            ) : (
                              <p className="text-amber-500/50 text-xs italic">
                                Click to edit...
                              </p>
                            )}
                          </div>
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
      {/* NARRATION EDITOR MODAL */}
      {/* ================================================================== */}
      {narrationModalClipId && (() => {
        const clipIdx = timelineClips.findIndex(c => c.id === narrationModalClipId);
        const clip = timelineClips[clipIdx];
        if (!clip) return null;
        const photo = getPhoto(clip.photoId);
        const totalClips = timelineClips.length;

        return (
          <div className="fixed inset-0 z-[250] flex items-center justify-center" onClick={() => setNarrationModalClipId(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  {photo && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={photo.thumbnail_url || photo.original_url || ''} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-medium text-sm">Clip {clipIdx + 1} of {totalClips}</h3>
                    <p className="text-white/40 text-xs">{photo?.summary ? photo.summary.slice(0, 60) + (photo.summary.length > 60 ? '...' : '') : 'Narration text'}</p>
                  </div>
                </div>
                <button onClick={() => setNarrationModalClipId(null)} className="text-white/40 hover:text-white transition-colors p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Textarea */}
              <div className="px-6 py-5">
                <textarea
                  defaultValue={clip.narration || ''}
                  placeholder="Write the voiceover narration for this clip..."
                  className="w-full bg-transparent text-white text-base leading-relaxed resize-none focus:outline-none placeholder:text-white/30"
                  style={{ minHeight: 160 }}
                  rows={6}
                  autoFocus
                  id="narration-modal-textarea"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  {/* Prev/Next clip */}
                  <button
                    onClick={() => {
                      // Save current before navigating
                      const textarea = document.getElementById('narration-modal-textarea') as HTMLTextAreaElement;
                      if (textarea) updateClipNarration(clip.id, textarea.value);
                      const prevIdx = Math.max(0, clipIdx - 1);
                      const prevClip = timelineClips[prevIdx];
                      setNarrationModalClipId(prevClip.id);
                      setSelectedClipId(prevClip.id);
                      setPreviewPhotoId(prevClip.photoId);
                    }}
                    disabled={clipIdx === 0}
                    className="px-3 py-1.5 text-white/50 text-sm rounded-lg hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => {
                      const textarea = document.getElementById('narration-modal-textarea') as HTMLTextAreaElement;
                      if (textarea) updateClipNarration(clip.id, textarea.value);
                      const nextIdx = Math.min(totalClips - 1, clipIdx + 1);
                      const nextClip = timelineClips[nextIdx];
                      setNarrationModalClipId(nextClip.id);
                      setSelectedClipId(nextClip.id);
                      setPreviewPhotoId(nextClip.photoId);
                    }}
                    disabled={clipIdx === totalClips - 1}
                    className="px-3 py-1.5 text-white/50 text-sm rounded-lg hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    Next →
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      updateClipNarration(clip.id, '');
                      setNarrationModalClipId(null);
                    }}
                    className="px-4 py-2 text-red-400/70 text-sm hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      const textarea = document.getElementById('narration-modal-textarea') as HTMLTextAreaElement;
                      if (textarea) updateClipNarration(clip.id, textarea.value);
                      setNarrationModalClipId(null);
                    }}
                    className="px-5 py-2 text-white text-sm font-medium rounded-lg"
                    style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* ================================================================== */}
      {/* RIGHT-CLICK CONTEXT MENU */}
      {/* ================================================================== */}
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
                const photo = getPhoto(contextMenuPhotoId);
                if (photo && !isInTimeline(contextMenuPhotoId)) {
                  addToTimeline(contextMenuPhotoId);
                }
                setContextMenuPhotoId(null);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add to Timeline
            </button>
            <div className="mx-3 my-1 h-px bg-white/5" />
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
                // Remove from timeline if present
                const clipInTimeline = timelineClips.find(c => c.photoId === photoId);
                if (clipInTimeline) {
                  setTimelineClips(prev => prev.filter(c => c.photoId !== photoId).map((c, i) => ({ ...c, order: i })));
                  if (selectedClipId === clipInTimeline.id) {
                    setSelectedClipId(null);
                    setPreviewPhotoId(null);
                  }
                }
                // Delete from DB
                try {
                  await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
                  setPhotos(prev => prev.filter(p => p.id !== photoId));
                  if (selectedPoolPhotoId === photoId) setSelectedPoolPhotoId(null);
                  if (previewPhotoId === photoId) setPreviewPhotoId(null);
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

      {/* ================================================================== */}
      {/* COPY TO ALBUM MODAL */}
      {/* ================================================================== */}
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

            {/* Preview of photo being copied */}
            {(() => {
              const photo = getPhoto(copyToPhotoId);
              return photo ? (
                <div className="px-6 pb-4">
                  <div className="h-20 w-32 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.original_url || ''} alt="" className="w-full h-full object-cover" />
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
                  style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
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
                onClick={() => { setShowCopyToAlbumModal(false); setCopyToPhotoId(null); }}
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
