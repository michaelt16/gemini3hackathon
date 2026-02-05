'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import AlbumModal from '@/components/AlbumModal';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import { AuroraWave } from '@/components/capture/AuroraWave';

// EVA Orb - loaded client-side only
const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

// EVA Companion Modal - with Live API
const EVACompanionModal = dynamic(() => import('@/components/EVACompanionModal'), { ssr: false });

// Tutorial steps for album list page - EVA speaks in first person
const ALBUM_LIST_TUTORIAL_STEPS = [
  {
    text: "Welcome back! This is your album library. Let me show you what's here.",
    highlight: null,
    position: 'center'
  },
  {
    text: "Albums with the 'Film Ready' badge have been exported as videos. You can watch and share these completed memories anytime.",
    highlight: 'films-ready',
    position: 'left'
  },
  {
    text: "Your other albums are in 'Your Memories'. You can continue adding photos and stories to any of them.",
    highlight: 'memories',
    position: 'left'
  },
  {
    text: "Click on me anytime you want to create a new album. Just tell me what you'd like to call it, and I'll set it up for you.",
    highlight: 'eva-orb',
    position: 'bottom-right'
  },
  {
    text: "You're all set! Every moment you capture, every story you tell—they become part of something lasting. I'm honored to help you preserve what matters. Whenever you're ready to add more memories, I'll be right here. Happy remembering.",
    highlight: null,
    position: 'center',
    final: true
  }
];

// SVG Icons
const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
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

// Album type (matches UI)
interface Album {
  id: string;
  title: string;
  date: string;
  location: string;
  photoCount: number;
  contributors: string[];
  hasSummary: boolean;
  hasRecap: boolean;
  coverUrl: string | null;
  videoUrl: string | null; // Exported video URL
  storiesRecorded: number;
  isPortrait?: boolean;
  members?: AlbumMember[];
  questionCount?: number;
}

// Family member in an album
interface AlbumMember {
  id: string;
  name: string;
  relationship?: string;
  avatar_color: string;
}


// Mock family members for albums (Google Photos collab style)
const MOCK_MEMBERS: AlbumMember[] = [
  { id: 'm1', name: 'Sarah', relationship: 'daughter', avatar_color: '#f472b6' },
  { id: 'm2', name: 'Michael', relationship: 'son', avatar_color: '#60a5fa' },
  { id: 'm3', name: 'Emma', relationship: 'granddaughter', avatar_color: '#a78bfa' },
  { id: 'm4', name: 'Mom', relationship: 'mother', avatar_color: '#fbbf24' },
  { id: 'm5', name: 'Dad', relationship: 'father', avatar_color: '#34d399' },
  { id: 'm6', name: 'Grandpa', relationship: 'grandfather', avatar_color: '#fb923c' },
  { id: 'm7', name: 'Tom', relationship: 'son', avatar_color: '#22d3ee' },
];

// Memory Timeline mock events
interface TimelineEvent {
  id: string;
  type: 'story' | 'question' | 'perspective' | 'photo' | 'film' | 'member';
  title: string;
  description: string;
  albumTitle?: string;
  member?: { name: string; color: string };
  timestamp: string;
  timeAgo: string;
}

const MOCK_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 't1',
    type: 'perspective',
    title: 'Sarah added her perspective',
    description: 'On the beach photo from Summer Reunion',
    albumTitle: 'Summer 2024 Reunion',
    member: { name: 'Sarah', color: '#f472b6' },
    timestamp: '2024-02-04T10:30:00',
    timeAgo: '2 hours ago',
  },
  {
    id: 't2',
    type: 'question',
    title: 'Michael asked a question',
    description: '"Who\'s the kid on the left in this photo?"',
    albumTitle: 'Childhood Memories',
    member: { name: 'Michael', color: '#60a5fa' },
    timestamp: '2024-02-04T09:15:00',
    timeAgo: '3 hours ago',
  },
  {
    id: 't3',
    type: 'story',
    title: 'New story recorded',
    description: 'You told the story behind the lake house photo',
    albumTitle: 'Summer 2024 Reunion',
    timestamp: '2024-02-04T08:00:00',
    timeAgo: '5 hours ago',
  },
  {
    id: 't4',
    type: 'film',
    title: 'Film exported',
    description: 'Christmas 2023 is now ready to watch',
    albumTitle: 'Christmas 2023',
    timestamp: '2024-02-03T18:30:00',
    timeAgo: 'Yesterday',
  },
  {
    id: 't5',
    type: 'member',
    title: 'Emma joined the family',
    description: 'Now connected to your memories',
    member: { name: 'Emma', color: '#a78bfa' },
    timestamp: '2024-02-03T14:00:00',
    timeAgo: 'Yesterday',
  },
  {
    id: 't6',
    type: 'photo',
    title: '5 photos animated',
    description: 'Beach Day album photos brought to life',
    albumTitle: 'Beach Day',
    timestamp: '2024-02-02T16:45:00',
    timeAgo: '2 days ago',
  },
  {
    id: 't7',
    type: 'question',
    title: 'You answered Emma\'s question',
    description: 'About grandma\'s garden in the old house',
    albumTitle: 'Childhood Memories',
    member: { name: 'Emma', color: '#a78bfa' },
    timestamp: '2024-02-01T11:20:00',
    timeAgo: '3 days ago',
  },
  {
    id: 't8',
    type: 'perspective',
    title: 'Mom shared a memory',
    description: '"I remember this day so clearly..."',
    albumTitle: "Grandma's 80th Birthday",
    member: { name: 'Mom', color: '#fbbf24' },
    timestamp: '2024-01-30T09:00:00',
    timeAgo: '5 days ago',
  },
];

const TIMELINE_ICONS: Record<TimelineEvent['type'], string> = {
  story: '🎙️',
  question: '❓',
  perspective: '💭',
  photo: '📷',
  film: '🎬',
  member: '👤',
};

// Mock albums for demo swimlanes (Films Ready, Needs More Stories, All Memories)
const mockAlbums: Album[] = [
  {
    id: 'mock-1',
    title: 'Summer 2024 Reunion',
    date: '2024-07-15',
    location: 'Lake Tahoe, CA',
    photoCount: 12,
    contributors: ['Mom', 'Dad', 'Sarah'],
    hasSummary: true,
    hasRecap: true,
    coverUrl: '/testphoto.jpg',
    videoUrl: '/remento.mp4',
    storiesRecorded: 8,
    members: [MOCK_MEMBERS[0], MOCK_MEMBERS[1], MOCK_MEMBERS[3], MOCK_MEMBERS[4]],
  },
  {
    id: 'mock-2',
    title: "Grandma's 80th Birthday",
    date: '2024-03-22',
    location: 'Chicago, IL',
    photoCount: 8,
    contributors: ['Uncle Joe', 'Aunt Mary'],
    hasSummary: true,
    hasRecap: false,
    coverUrl: '/pic1.PNG',
    videoUrl: null,
    storiesRecorded: 5,
    isPortrait: true,
    members: [MOCK_MEMBERS[3], MOCK_MEMBERS[4], MOCK_MEMBERS[5]],
  },
  {
    id: 'mock-3',
    title: 'Christmas 2023',
    date: '2023-12-25',
    location: 'Home',
    photoCount: 24,
    contributors: ['Mom', 'Dad', 'Grandpa', 'Sarah', 'Tom'],
    hasSummary: true,
    hasRecap: true,
    coverUrl: '/pic2.PNG',
    videoUrl: '/remento.mp4',
    storiesRecorded: 18,
    members: [MOCK_MEMBERS[0], MOCK_MEMBERS[3], MOCK_MEMBERS[4], MOCK_MEMBERS[5], MOCK_MEMBERS[6]],
  },
  {
    id: 'mock-4',
    title: 'Spring Picnic',
    date: '2024-04-10',
    location: 'Central Park',
    photoCount: 15,
    contributors: ['Sarah', 'Tom'],
    hasSummary: false,
    hasRecap: false,
    coverUrl: '/pic3.PNG',
    videoUrl: null,
    storiesRecorded: 3,
    isPortrait: true,
    members: [MOCK_MEMBERS[0], MOCK_MEMBERS[6]],
  },
  {
    id: 'mock-5',
    title: 'Beach Day',
    date: '2024-06-20',
    location: 'Santa Monica',
    photoCount: 22,
    contributors: ['Mom', 'Sarah'],
    hasSummary: true,
    hasRecap: false,
    coverUrl: '/pic4.PNG',
    videoUrl: null,
    storiesRecorded: 12,
    members: [MOCK_MEMBERS[0], MOCK_MEMBERS[3], MOCK_MEMBERS[2]],
  },
];

// Map API event to Album
function eventToAlbum(e: {
  id: string;
  title: string;
  date_start: string | null;
  location: string | null;
  summary: string | null;
  cover_url: string | null;
  created_at: string;
  photo_count: number;
  stories_count?: number;
  video_url?: string | null;
}): Album {
  return {
    id: e.id,
    title: e.title,
    date: e.date_start || e.created_at?.slice(0, 10) || '',
    location: e.location || '',
    photoCount: e.photo_count ?? 0,
    contributors: [],
    hasSummary: !!e.summary,
    hasRecap: !!e.video_url, // Film is ready when video_url exists
    coverUrl: e.cover_url ?? null,
    videoUrl: e.video_url ?? null, // Exported video URL
    storiesRecorded: e.stories_count ?? 0,
    isPortrait: false,
    members: MOCK_MEMBERS.slice(0, 3), // Mock members for API albums
  };
}

// Swimlane Row Component
function SwimlaneRow({ 
  title, 
  albums, 
  onAlbumClick 
}: { 
  title: string; 
  albums: Album[]; 
  onAlbumClick: (album: Album) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowLeftArrow(scrollRef.current.scrollLeft > 0);
      setShowRightArrow(
        scrollRef.current.scrollLeft < 
        scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10
      );
    }
  };

  if (albums.length === 0) return null;

  return (
    <div className="mb-12 group/row relative">
      <div className="px-[4%] mb-3">
        <h2 className="text-lg md:text-xl text-white/90 font-medium tracking-tight">
          {title}
        </h2>
      </div>
      
      <div className="relative">
        {/* Left Arrow - Netflix style */}
        {showLeftArrow && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-20 w-14 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-all"
          >
            <ChevronLeftIcon />
          </button>
        )}
        
        {/* Right Arrow - Netflix style */}
        {showRightArrow && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-20 w-14 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-all"
          >
            <ChevronRightIcon />
          </button>
        )}
        
        {/* Scrollable row - Netflix spacing */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-[4%] py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {albums.map((album) => (
            <AlbumCard 
              key={album.id} 
              album={album} 
              onClick={() => onAlbumClick(album)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Album Card Component - Netflix-style swimlane cards
function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex-shrink-0 w-[360px] md:w-[420px] lg:w-[480px] group cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10"
    >
      <div 
        className="relative overflow-hidden rounded"
        style={{ aspectRatio: '16/9' }}
      >
        {album.coverUrl ? (
          album.isPortrait ? (
            <>
              <img 
                src={album.coverUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover scale-150 blur-xl opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src={album.coverUrl}
                  alt={album.title}
                  loading="lazy"
                  className="h-full w-auto object-contain"
                />
              </div>
            </>
          ) : (
            <img 
              src={album.coverUrl}
              alt={album.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2a2a2a]">
            <div className="flex flex-col items-center gap-2 text-white/30">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span className="text-sm">Add photos</span>
            </div>
          </div>
        )}
        
        {/* Gradient overlay - always visible at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
        
        {/* Info overlay - bottom of card */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-semibold text-base truncate drop-shadow-lg">
            {album.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-white/70 text-sm flex-wrap">
            <span>{album.photoCount} photos</span>
            <span className="text-white/40">·</span>
            <span>{album.storiesRecorded} stories</span>
            {album.members && album.members.length > 0 && (
              <>
                <span className="text-white/40">·</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-2">
                    {album.members.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        className="w-5 h-5 rounded-full border-2 border-black/50 flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0 shadow"
                        style={{ backgroundColor: m.avatar_color }}
                        title={m.name}
                      >
                        {m.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <span>{album.members.length} members</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Film badge */}
        {album.hasRecap && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-500">
            <PlayIcon className="w-3.5 h-3.5 text-white" />
            <span className="text-xs text-white font-medium">Film Ready</span>
          </div>
        )}
        
        {/* Hover border effect */}
        <div className="absolute inset-0 rounded border-2 border-white/0 group-hover:border-white/30 transition-colors pointer-events-none" />
      </div>
    </div>
  );
}

export default function AlbumPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [heroHovered, setHeroHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  
  // EVA companion modal state
  const [showEvaModal, setShowEvaModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  
  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialText, setTutorialText] = useState('');
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [isTutorialSpeaking, setIsTutorialSpeaking] = useState(false);
  const pendingTutorialTextRef = useRef<string | null>(null);
  const pendingTutorialCallbackRef = useRef<(() => void) | null>(null);
  const tutorialTypewriterRef = useRef<NodeJS.Timeout | null>(null);
  const tutorialStartedRef = useRef(false);
  
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
            console.log('[Album List Tutorial] Live API connected');
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
            console.error('[Album List Tutorial] Live API error:', error);
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
  
  // Play tutorial step
  const playTutorialStep = useCallback((step: number) => {
    if (step >= ALBUM_LIST_TUTORIAL_STEPS.length) {
      setShowTutorial(false);
      disconnectLiveAPI();
      localStorage.removeItem('albumListTutorial');
      localStorage.removeItem('tutorialMode');
      return;
    }
    
    setTutorialStep(step);
    const stepData = ALBUM_LIST_TUTORIAL_STEPS[step];
    setTutorialText('');
    
    // Speak with Live API (falls back to typewriter if not connected)
    speakTutorialText(stepData.text);
  }, [speakTutorialText, disconnectLiveAPI]);
  
  // Advance to next tutorial step
  const advanceTutorial = useCallback(() => {
    const nextStep = tutorialStep + 1;
    if (nextStep < ALBUM_LIST_TUTORIAL_STEPS.length) {
      playTutorialStep(nextStep);
    } else {
      setShowTutorial(false);
      disconnectLiveAPI();
      localStorage.removeItem('albumListTutorial');
      localStorage.removeItem('tutorialMode');
    }
  }, [tutorialStep, playTutorialStep, disconnectLiveAPI]);
  
  // Skip tutorial
  const skipTutorial = useCallback(() => {
    setShowTutorial(false);
    disconnectLiveAPI();
    localStorage.removeItem('albumListTutorial');
    localStorage.removeItem('tutorialMode');
  }, [disconnectLiveAPI]);
  
  // Check for tutorial continuation from album editor
  useEffect(() => {
    const shouldShowTutorial = localStorage.getItem('albumListTutorial') === 'true';
    if (shouldShowTutorial && !tutorialStartedRef.current && !loading) {
      tutorialStartedRef.current = true;
      localStorage.removeItem('albumListTutorial');
      
      // Small delay then start tutorial
      const timer = setTimeout(async () => {
        await connectLiveAPI();
        setShowTutorial(true);
        playTutorialStep(0);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, connectLiveAPI, playTutorialStep]);
  
  // Cleanup Live API on unmount
  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      if (tutorialTypewriterRef.current) {
        clearInterval(tutorialTypewriterRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setAlbums(data.map(eventToAlbum));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load albums');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, []);


  // Your Films Ready = only albums with video. Your Memories = all albums.
  const sortByPhotoCount = (a: Album[]) => [...a].sort((x, y) => y.photoCount - x.photoCount);
  const yourFilmsReady = sortByPhotoCount(albums.filter((a) => a.hasRecap));
  const yourMemories = sortByPhotoCount(albums);
  
  const categories = [
    { title: 'Your Films Ready', albums: yourFilmsReady },
    { title: 'Your Memories', albums: yourMemories },
    // Demo content below
    { title: 'Demo: Films Ready', albums: sortByPhotoCount(mockAlbums.filter((a) => a.hasRecap)) },
    { title: 'Demo: Needs More Stories', albums: sortByPhotoCount(mockAlbums.filter((a) => !a.hasRecap && a.storiesRecorded < 5)) },
    { title: 'Demo: All Memories', albums: sortByPhotoCount(mockAlbums) },
  ];
  
  // Hero is the album with the most photos from user's albums, fallback to mock
  const featuredAlbum = albums.length > 0
    ? [...albums].sort((a, b) => b.photoCount - a.photoCount)[0]
    : mockAlbums.find((a) => a.hasRecap) || mockAlbums[0];

  const handleAlbumClick = (album: Album) => {
    setSelectedAlbum(album);
  };

  // Play video on hover
  useEffect(() => {
    if (videoRef.current) {
      if (heroHovered) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [heroHovered]);

  return (
    <div className="min-h-screen" style={{ background: '#0d0b09' }}>
      {/* Subtle grain */}
      <div 
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {error && (
        <div className="p-4 text-center bg-red-500/10 border-b border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Hero Section */}
      <div 
        className="relative h-[85vh] overflow-hidden"
        onMouseEnter={() => setHeroHovered(true)}
        onMouseLeave={() => setHeroHovered(false)}
      >
        {/* Background */}
        <div className="absolute inset-0">
          {featuredAlbum?.coverUrl ? (
            <img 
              src={featuredAlbum.coverUrl}
              alt={featuredAlbum.title}
              loading="eager"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                heroHovered ? 'opacity-0' : 'opacity-100'
              }`}
            />
          ) : (
            <div 
              className={`absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 transition-opacity duration-500 ${
                heroHovered ? 'opacity-0' : 'opacity-100'
              }`}
            />
          )}
          
          {/* Play the featured album's video on hover */}
          <video
            ref={videoRef}
            src={featuredAlbum?.videoUrl || '/remento.mp4'}
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              heroHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
        
        {/* Gradient overlays */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(to right, rgba(13,11,9,0.9) 0%, rgba(13,11,9,0.4) 50%, transparent 80%)'
          }}
        />
        {/* Netflix-style bottom fade - tall, smooth gradient */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[70%]"
          style={{ 
            background: 'linear-gradient(to top, #0d0b09 0%, rgba(13,11,9,0.97) 15%, rgba(13,11,9,0.85) 35%, rgba(13,11,9,0.5) 55%, rgba(13,11,9,0.2) 75%, transparent 100%)'
          }}
        />
        
        {/* Content */}
        <div className="absolute bottom-[18%] left-6 md:left-10 max-w-lg z-10">
          {/* Status */}
          {featuredAlbum?.hasRecap && (
            <span className="inline-block px-2.5 py-1 rounded text-[10px] font-medium bg-green-500 text-white mb-3">
              Film Ready
            </span>
          )}
          
          <h1 
            className="text-3xl md:text-5xl font-light text-white mb-3"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            {featuredAlbum?.title ?? 'Living Memory'}
          </h1>
          
          <p className="text-white/60 text-sm mb-5">
            {featuredAlbum
              ? `${featuredAlbum.photoCount} photos · ${featuredAlbum.storiesRecorded} stories${featuredAlbum.contributors.length ? ` from ${featuredAlbum.contributors.length} people` : ''}`
              : 'Create your first memory in Capture'}
          </p>
          
          <div className="flex items-center gap-3">
            {featuredAlbum?.hasRecap && (
              <button 
                onClick={() => featuredAlbum && handleAlbumClick(featuredAlbum)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
                style={{ 
                  background: 'linear-gradient(135deg, #e8dcc4 0%, #c9b896 100%)',
                  color: '#1a1510'
                }}
              >
                <PlayIcon className="w-4 h-4" />
                Watch Film
              </button>
            )}
            {featuredAlbum && (
              <button 
                onClick={() => handleAlbumClick(featuredAlbum)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white"
                style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <MicIcon />
                Add Your Story
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Swimlane Rows - seamless continuation of hero fade, subtle warmth below */}
      <div 
        className="relative z-10 pt-4 -mt-24 pb-16"
        style={{ background: 'linear-gradient(to bottom, #0d0b09 0%, #0d0b09 25%, #141210 60%, #1f1b18 100%)' }}
      >
        {categories.map((category) => (
          <SwimlaneRow
            key={category.title}
            title={category.title}
            albums={category.albums}
            onAlbumClick={handleAlbumClick}
          />
        ))}
      </div>

      {/* Memory Timeline - Floating Panel */}
      <div className="fixed left-6 bottom-6 z-50">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className={`flex items-center gap-3 px-5 py-3 rounded-xl text-base font-medium transition-all shadow-lg ${
            showTimeline 
              ? 'bg-cyan-500/25 text-cyan-300 border-2 border-cyan-500/50' 
              : 'bg-[#1a1612] text-white border-2 border-white/20 hover:border-white/30 hover:bg-[#221d18]'
          }`}
        >
          <span className="text-xl">📜</span>
          Memory Timeline
          {!showTimeline && (
            <span className="flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-full bg-cyan-500 text-white text-sm font-bold">
              {MOCK_TIMELINE_EVENTS.length}
            </span>
          )}
        </button>
      </div>

      {/* Timeline Panel */}
      {showTimeline && (
        <div 
          className="fixed left-6 bottom-24 w-[400px] max-h-[65vh] z-50 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ background: 'linear-gradient(to bottom, #1f1b18 0%, #141210 100%)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/15 sticky top-0 bg-[#1f1b18]/98 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <h3 className="text-white font-semibold text-lg">Memory Timeline</h3>
            </div>
            <button 
              onClick={() => setShowTimeline(false)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Timeline Events */}
          <div className="overflow-y-auto max-h-[calc(65vh-72px)] p-4 space-y-3">
            {MOCK_TIMELINE_EVENTS.map((event, index) => (
              <div 
                key={event.id} 
                className="relative flex gap-4 p-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 transition-colors cursor-pointer group"
              >
                {/* Timeline connector */}
                {index < MOCK_TIMELINE_EVENTS.length - 1 && (
                  <div className="absolute left-[34px] top-[60px] w-0.5 h-[calc(100%-32px)] bg-white/15" />
                )}
                
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                  event.type === 'film' ? 'bg-green-500/30' :
                  event.type === 'question' ? 'bg-amber-500/30' :
                  event.type === 'perspective' ? 'bg-purple-500/30' :
                  event.type === 'story' ? 'bg-cyan-500/30' :
                  event.type === 'member' ? 'bg-pink-500/30' :
                  'bg-white/15'
                }`}>
                  <span className="text-base">{TIMELINE_ICONS[event.type]}</span>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white text-base font-medium leading-tight">{event.title}</p>
                    {event.member && (
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: event.member.color }}
                        title={event.member.name}
                      >
                        {event.member.name[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-white/60 text-sm mt-1 line-clamp-2">{event.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {event.albumTitle && (
                      <span className="text-white/50 text-xs truncate max-w-[160px]">{event.albumTitle}</span>
                    )}
                    <span className="text-white/30 text-xs">·</span>
                    <span className="text-white/50 text-xs">{event.timeAgo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/15 bg-[#141210]/98 backdrop-blur-md">
            <button className="w-full text-center text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors py-2">
              View Full History →
            </button>
          </div>
        </div>
      )}

      {/* Album Detail Modal */}
      <AlbumModal 
        album={selectedAlbum}
        allAlbums={[...mockAlbums, ...albums]}
        onClose={() => setSelectedAlbum(null)}
        onAlbumClick={handleAlbumClick}
      />
      
      {/* EVA Orb - Companion */}
      <div className="fixed bottom-6 right-6 z-50">
        <EVAOrb onClick={() => setShowEvaModal(true)} size={120} />
      </div>
      
      {/* EVA Companion Modal - with Live API */}
      <EVACompanionModal 
        isOpen={showEvaModal} 
        onClose={() => setShowEvaModal(false)} 
      />
      

      {/* ================================================================== */}
      {/* TUTORIAL OVERLAY */}
      {/* ================================================================== */}
      {showTutorial && (
        <>
          {/* Semi-transparent backdrop */}
          <div className="fixed inset-0 z-[200] bg-black/60" />
          
          {/* Positioned tutorial card */}
          <div 
            className={`fixed z-[220] w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a0a0f] to-[#0f0a15] border border-cyan-500/30 shadow-2xl flex flex-col transition-all duration-300 ${
              ALBUM_LIST_TUTORIAL_STEPS[tutorialStep]?.position === 'center' 
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
              ALBUM_LIST_TUTORIAL_STEPS[tutorialStep]?.position === 'left' 
                ? 'top-1/2 left-8 -translate-y-1/2' :
              ALBUM_LIST_TUTORIAL_STEPS[tutorialStep]?.position === 'right' 
                ? 'top-1/2 right-8 -translate-y-1/2' :
              ALBUM_LIST_TUTORIAL_STEPS[tutorialStep]?.position === 'bottom-right' 
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
                  {tutorialStep + 1}/{ALBUM_LIST_TUTORIAL_STEPS.length}
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
                <button
                  onClick={advanceTutorial}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-full text-sm font-medium hover:from-cyan-500 hover:to-cyan-400 transition-all"
                >
                  {ALBUM_LIST_TUTORIAL_STEPS[tutorialStep]?.final ? 'Finish' : 'Continue'}
                </button>
                <button
                  onClick={skipTutorial}
                  className="px-4 py-2.5 bg-white/10 text-white/70 rounded-full text-sm font-medium hover:bg-white/20 hover:text-white transition-all"
                >
                  Skip
                </button>
              </div>
              
              {/* Step dots */}
              <div className="flex justify-center gap-1.5 mt-4">
                {ALBUM_LIST_TUTORIAL_STEPS.map((_, i) => (
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
        </>
      )}

      {/* Global styles */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
