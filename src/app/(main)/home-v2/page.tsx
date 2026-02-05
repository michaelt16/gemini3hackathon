'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import { AuroraWave } from '@/components/capture/AuroraWave';

// EVA Orb - loaded client-side only
const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

// EVA Companion Modal
const EVACompanionModal = dynamic(() => import('@/components/EVACompanionModal'), { ssr: false });

// Types
interface Album {
  id: string;
  title: string;
  date: string;
  location: string;
  photoCount: number;
  storiesRecorded: number;
  hasRecap: boolean;
  coverUrl: string | null;
  videoUrl: string | null;
  members?: AlbumMember[];
}

interface AlbumMember {
  id: string;
  name: string;
  relationship?: string;
  avatar_color: string;
}

interface ActivityItem {
  id: string;
  type: 'question' | 'story' | 'film' | 'perspective' | 'member';
  title: string;
  description: string;
  albumTitle?: string;
  member?: { name: string; color: string };
  timeAgo: string;
}

// Mock data
const MOCK_MEMBERS: AlbumMember[] = [
  { id: 'm1', name: 'Sarah', relationship: 'daughter', avatar_color: '#f472b6' },
  { id: 'm2', name: 'Michael', relationship: 'son', avatar_color: '#60a5fa' },
  { id: 'm3', name: 'Emma', relationship: 'granddaughter', avatar_color: '#a78bfa' },
  { id: 'm4', name: 'Mom', relationship: 'mother', avatar_color: '#fbbf24' },
  { id: 'm5', name: 'Dad', relationship: 'father', avatar_color: '#34d399' },
];

const MOCK_ALBUMS: Album[] = [
  {
    id: 'mock-1',
    title: 'Summer 2024 Reunion',
    date: '2024-07-15',
    location: 'Lake Tahoe, CA',
    photoCount: 12,
    storiesRecorded: 8,
    hasRecap: true,
    coverUrl: '/testphoto.jpg',
    videoUrl: '/remento.mp4',
    members: [MOCK_MEMBERS[0], MOCK_MEMBERS[1], MOCK_MEMBERS[3]],
  },
  {
    id: 'mock-2',
    title: "Grandma's 80th Birthday",
    date: '2024-03-22',
    location: 'Chicago, IL',
    photoCount: 8,
    storiesRecorded: 5,
    hasRecap: false,
    coverUrl: '/pic1.PNG',
    videoUrl: null,
    members: [MOCK_MEMBERS[3], MOCK_MEMBERS[4]],
  },
  {
    id: 'mock-3',
    title: 'Christmas 2023',
    date: '2023-12-25',
    location: 'Home',
    photoCount: 24,
    storiesRecorded: 18,
    hasRecap: true,
    coverUrl: '/pic2.PNG',
    videoUrl: '/remento.mp4',
    members: [MOCK_MEMBERS[0], MOCK_MEMBERS[3], MOCK_MEMBERS[4]],
  },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'a1',
    type: 'question',
    title: '3 questions waiting',
    description: 'From Sarah, Michael, and Emma',
    timeAgo: 'Today',
  },
  {
    id: 'a2',
    type: 'film',
    title: '1 film ready to watch',
    description: 'Summer 2024 Reunion',
    albumTitle: 'Summer 2024 Reunion',
    timeAgo: 'Yesterday',
  },
  {
    id: 'a3',
    type: 'perspective',
    title: 'New story from Mom',
    description: 'On the beach photo',
    albumTitle: 'Summer 2024 Reunion',
    member: { name: 'Mom', color: '#fbbf24' },
    timeAgo: '2 hours ago',
  },
];

const ACTIVITY_ICONS: Record<ActivityItem['type'], string> = {
  question: '❓',
  story: '🎙️',
  film: '🎬',
  perspective: '💭',
  member: '👤',
};

// Map API event to Album
function eventToAlbum(e: {
  id: string;
  title: string;
  date_start: string | null;
  location: string | null;
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
    storiesRecorded: e.stories_count ?? 0,
    hasRecap: !!e.video_url,
    coverUrl: e.cover_url ?? null,
    videoUrl: e.video_url ?? null,
    members: MOCK_MEMBERS.slice(0, 3),
  };
}

// Quick Action Button Component
function QuickAction({ 
  icon, 
  label, 
  onClick,
  variant = 'default'
}: { 
  icon: string; 
  label: string; 
  onClick: () => void;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-3.5 rounded-xl font-medium text-sm transition-all ${
        variant === 'primary'
          ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/20'
          : 'bg-white/[0.08] text-white/90 hover:bg-white/[0.12] border border-white/10'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

// Album Card Component
function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex-shrink-0 w-[280px] group cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
    >
      <div 
        className="relative overflow-hidden rounded-xl"
        style={{ aspectRatio: '4/3' }}
      >
        {album.coverUrl ? (
          <img 
            src={album.coverUrl}
            alt={album.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2a2520]">
            <div className="flex flex-col items-center gap-2 text-white/30">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Film badge */}
        {album.hasRecap && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/90 text-[10px] text-white font-medium">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Film Ready
          </div>
        )}
        
        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-medium text-sm truncate">{album.title}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-white/60 text-xs">
            <span>{album.photoCount} photos</span>
            <span>·</span>
            <span>{album.storiesRecorded} stories</span>
          </div>
        </div>
        
        {/* Hover border */}
        <div className="absolute inset-0 rounded-xl border-2 border-white/0 group-hover:border-cyan-400/50 transition-colors pointer-events-none" />
      </div>
    </div>
  );
}

export default function HomeV2Page() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEVAModal, setShowEVAModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  
  // Live API for EVA greeting
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  
  // Get user name from localStorage
  useEffect(() => {
    const name = localStorage.getItem('userName') || '';
    setUserName(name);
  }, []);
  
  // Fetch albums
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
      } catch {
        // Use mock data on error
        if (!cancelled) setAlbums([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, []);
  
  // Connect Live API for EVA
  const connectLiveAPI = useCallback(async () => {
    if (liveClientRef.current?.connected) return;
    
    try {
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      if (!apiKey) return;
      
      const client = new GeminiLiveClient(apiKey, {
        responseModalities: ['AUDIO'],
        systemInstruction: `You are EVA, a warm AI companion for Living Memory. Be brief, friendly, and helpful.`,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      }, {
        onConnect: () => {
          setIsLiveConnected(true);
          liveClientRef.current = client;
        },
        onDisconnect: () => setIsLiveConnected(false),
        onAudio: () => setIsAISpeaking(true),
        onTurnComplete: () => setIsAISpeaking(false),
        onError: () => {},
      });
      
      await client.connect();
    } catch {
      // Silent fail
    }
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
    };
  }, []);
  
  // Handle EVA modal close with navigation
  const handleEVAModalClose = (albumId?: string) => {
    setShowEVAModal(false);
    if (albumId) {
      router.push(`/album/${albumId}`);
    }
  };
  
  // All albums for display
  const displayAlbums = albums.length > 0 ? albums : MOCK_ALBUMS;
  const questionsCount = 3; // Mock
  const filmsReadyCount = displayAlbums.filter(a => a.hasRecap).length;
  
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #0d0b09 0%, #141210 50%, #1a1612 100%)' }}>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Hero Section - EVA + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* EVA Card */}
          <div 
            className="relative overflow-hidden rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(16,185,129,0.05) 100%)',
              border: '1px solid rgba(6,182,212,0.2)'
            }}
          >
            {/* EVA Orb */}
            <div className="mb-6">
              <EVAOrb size={140} isSpeaking={isAISpeaking} />
            </div>
            
            {/* Greeting */}
            <h2 
              className="text-2xl md:text-3xl text-white font-light mb-3"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              {userName ? `Hi ${userName}!` : 'Hello!'}
            </h2>
            <p className="text-white/60 mb-6 max-w-sm">
              Ready to preserve some memories? I&apos;m here to help capture your stories.
            </p>
            
            {/* CTA Button */}
            <button
              onClick={() => setShowEVAModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-medium bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/25"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start New Memory
            </button>
            
            {/* Aurora Wave */}
            <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none opacity-50">
              <AuroraWave 
                isActive={true}
                isAISpeaking={isAISpeaking}
                userAudioLevel={0}
              />
            </div>
          </div>
          
          {/* Activity & Quick Actions */}
          <div className="flex flex-col gap-6">
            
            {/* What's Happening */}
            <div 
              className="rounded-2xl p-6"
              style={{ 
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <h3 className="text-lg text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-xl">📬</span>
                What&apos;s Happening
              </h3>
              
              <div className="space-y-3">
                {MOCK_ACTIVITY.slice(0, 3).map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === 'question' ? 'bg-amber-500/20' :
                      item.type === 'film' ? 'bg-green-500/20' :
                      item.type === 'perspective' ? 'bg-purple-500/20' :
                      'bg-white/10'
                    }`}>
                      <span>{ACTIVITY_ICONS[item.type]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      <p className="text-white/50 text-xs truncate">{item.description}</p>
                    </div>
                    <span className="text-white/30 text-xs flex-shrink-0">{item.timeAgo}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div 
              className="rounded-2xl p-6"
              style={{ 
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <h3 className="text-lg text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-xl">⚡</span>
                Quick Actions
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <QuickAction 
                  icon="📸" 
                  label="Capture" 
                  onClick={() => setShowEVAModal(true)}
                />
                <QuickAction 
                  icon="❓" 
                  label={`Questions (${questionsCount})`} 
                  onClick={() => router.push('/questions')}
                />
                <QuickAction 
                  icon="📒" 
                  label="Scrapbooks" 
                  onClick={() => router.push('/album')}
                />
                <QuickAction 
                  icon="👨‍👩‍👧‍👦" 
                  label="Family" 
                  onClick={() => router.push('/family')}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Albums Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl text-white font-medium">Your Albums</h2>
            <Link 
              href="/album" 
              className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
            >
              See All →
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <EVAOrb size={60} isSpeaking={true} />
                <p className="text-white/40 text-sm">Loading albums...</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {displayAlbums.slice(0, 6).map((album) => (
                <AlbumCard 
                  key={album.id} 
                  album={album} 
                  onClick={() => router.push(`/album/${album.id}`)}
                />
              ))}
              
              {/* Create New Album Card */}
              <div 
                onClick={() => setShowEVAModal(true)}
                className="flex-shrink-0 w-[280px] cursor-pointer group"
              >
                <div 
                  className="relative overflow-hidden rounded-xl flex flex-col items-center justify-center gap-4 transition-all group-hover:border-cyan-400/50"
                  style={{ 
                    aspectRatio: '4/3',
                    background: 'rgba(6,182,212,0.05)',
                    border: '2px dashed rgba(6,182,212,0.3)'
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-cyan-400 text-sm font-medium">Create New Album</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Recent Activity Section */}
        <div>
          <h2 className="text-xl text-white font-medium mb-5">Recent Activity</h2>
          
          <div 
            className="rounded-2xl p-6"
            style={{ 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div className="space-y-4">
              {[
                { icon: '💭', text: 'Mom asked about the beach photo', album: 'Summer 2024', time: '2 hours ago' },
                { icon: '🎙️', text: 'Dad added his perspective to "Fishing Trip"', album: 'Lake Adventures', time: 'Yesterday' },
                { icon: '🎬', text: 'Christmas 2023 film is ready to watch', album: 'Christmas 2023', time: '2 days ago' },
                { icon: '📷', text: '5 photos were animated', album: 'Beach Day', time: '3 days ago' },
              ].map((activity, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/[0.02] -mx-3 px-3 rounded-lg transition-colors"
                >
                  <span className="text-xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-white/90 text-sm">{activity.text}</p>
                    <p className="text-white/40 text-xs">{activity.album}</p>
                  </div>
                  <span className="text-white/30 text-xs">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* EVA Companion Modal */}
      {showEVAModal && (
        <EVACompanionModal
          onClose={handleEVAModalClose}
        />
      )}
    </div>
  );
}
