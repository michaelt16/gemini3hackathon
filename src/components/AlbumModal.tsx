'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import VideoPlayerWithTime from './VideoPlayerWithTime';
import ScrapbookModal from './ScrapbookModal';

interface AlbumMember {
  id: string;
  name: string;
  relationship?: string;
  avatar_color: string;
}

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
  storiesRecorded: number;
  isPortrait?: boolean;
  status?: 'gathering' | 'ready' | 'complete';
  members?: AlbumMember[];
}

interface DbPhoto {
  id: string;
  original_url: string | null;
  thumbnail_url: string | null;
  animated_url: string | null;
  has_story: boolean;
  completeness: number;
  summary: string | null;
  facts?: { who: string[]; what: string[]; when: string[]; where: string[]; why: string[] } | null;
}

interface DbEvent {
  video_url: string | null;
}

interface AlbumModalProps {
  album: Album | null;
  allAlbums?: Album[];
  onClose: () => void;
  onAlbumClick?: (album: Album) => void;
}

/** Database albums have UUID ids; mock albums have 'mock-N' */
function isFromDatabase(albumId: string): boolean {
  return !/^mock-/.test(albumId);
}

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

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

const PhotoIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const FilmIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
  </svg>
);

const PlayIconSmall = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

// Progress steps for the memory creation workflow
const workflowSteps = [
  { key: 'photos', label: 'Photos', icon: PhotoIcon },
  { key: 'stories', label: 'Stories', icon: MicIcon },
  { key: 'film', label: 'Film', icon: FilmIcon },
];

// Mock members for API albums when not provided
const DEFAULT_MEMBERS: AlbumMember[] = [
  { id: 'm1', name: 'Sarah', relationship: 'daughter', avatar_color: '#f472b6' },
  { id: 'm2', name: 'Michael', relationship: 'son', avatar_color: '#60a5fa' },
  { id: 'm3', name: 'Emma', relationship: 'granddaughter', avatar_color: '#a78bfa' },
];

// Mock perspectives for collaborative storytelling demo
interface Perspective {
  memberId: string;
  memberName: string;
  relationship: string;
  avatarColor: string;
  quote: string;
}

// Generate mock perspectives for a photo - randomly assign 1-3 perspectives
const PERSPECTIVE_QUOTES = [
  { quote: "I remember this day so clearly! It was the first time we all got together after so long.", emotion: 'nostalgic' },
  { quote: "Look how young everyone was! Dad still had all his hair back then.", emotion: 'playful' },
  { quote: "This was right before the big surprise party, wasn't it? We were all trying so hard not to give it away.", emotion: 'excited' },
  { quote: "Grandma made her famous pie that day. I can still taste it.", emotion: 'warm' },
  { quote: "I think this was taken right after we got the news. Everyone was so happy.", emotion: 'joyful' },
  { quote: "That old house in the background - so many memories there before we moved.", emotion: 'bittersweet' },
  { quote: "I was probably 5 or 6 here? I don't remember much but I remember feeling so loved.", emotion: 'tender' },
  { quote: "Uncle Joe told the funniest joke right before this photo was taken. That's why everyone's smiling.", emotion: 'amused' },
  { quote: "Mom always made us pose for photos. We complained then, but I'm so grateful now.", emotion: 'grateful' },
  { quote: "This was the trip where we got lost for 3 hours. Best adventure ever.", emotion: 'adventurous' },
];

const COMBINED_STORY_TEMPLATES = [
  "A moment that brought the whole family together. Through the years, each person carries their own piece of this memory - the laughter, the food, the feeling of belonging. Together, these perspectives paint a picture richer than any single photo could capture.",
  "What started as an ordinary day became a treasured memory. Sarah remembers the anticipation, Michael recalls the jokes, and Emma cherishes the warmth of family. This is what Living Memory preserves - not just images, but the tapestry of shared experience.",
  "Some moments become family legend. Each person who was there adds their thread to the story - a detail noticed, an emotion felt, a connection made. Together, they weave a memory that grows more precious with time.",
];

function getMockPerspectives(photoIndex: number, members: AlbumMember[]): Perspective[] {
  // Deterministic but varied perspectives based on photo index
  const numPerspectives = 1 + (photoIndex % 3); // 1-3 perspectives
  const perspectives: Perspective[] = [];
  
  for (let i = 0; i < numPerspectives && i < members.length; i++) {
    const member = members[(photoIndex + i) % members.length];
    const quoteIndex = (photoIndex * 3 + i * 7) % PERSPECTIVE_QUOTES.length;
    perspectives.push({
      memberId: member.id,
      memberName: member.name,
      relationship: member.relationship || '',
      avatarColor: member.avatar_color,
      quote: PERSPECTIVE_QUOTES[quoteIndex].quote,
    });
  }
  
  return perspectives;
}

function getCombinedStory(photoIndex: number): string {
  return COMBINED_STORY_TEMPLATES[photoIndex % COMBINED_STORY_TEMPLATES.length];
}

export default function AlbumModal({ album, allAlbums = [], onClose, onAlbumClick }: AlbumModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [dbPhotos, setDbPhotos] = useState<DbPhoto[]>([]);
  const [dbPhotosLoading, setDbPhotosLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [selectedClipPhoto, setSelectedClipPhoto] = useState<{ id: string; url: string; animatedUrl?: string | null; summary: string | null } | null>(null);
  const [showScrapbook, setShowScrapbook] = useState(false);

  const fromDb = album ? isFromDatabase(album.id) : false;
  const members = album?.members?.length ? album.members : DEFAULT_MEMBERS;

  // Fetch real photos when album is from database (Your Memories)
  useEffect(() => {
    if (!album || !fromDb) {
      setDbPhotos([]);
      return;
    }
    let cancelled = false;
    setDbPhotosLoading(true);
    fetch(`/api/events/${album.id}/photos`)
      .then((res) => res.ok ? res.json() : { photos: [] })
      .then((data) => {
        if (!cancelled) setDbPhotos(data.photos ?? []);
      })
      .catch(() => { if (!cancelled) setDbPhotos([]); })
      .finally(() => { if (!cancelled) setDbPhotosLoading(false); });
    return () => { cancelled = true; };
  }, [album?.id, fromDb]);

  // Fetch event video_url - always fetch fresh (no cache) to get latest after export
  // Using `album` as dependency (not just id) so it refetches when modal reopens
  useEffect(() => {
    if (!album || !fromDb) {
      setVideoUrl(null);
      return;
    }
    let cancelled = false;
    // Add timestamp to URL to bypass all caching layers (Next.js, CDN, browser)
    const cacheBuster = `_cb=${Date.now()}`;
    const url = `/api/events/${album.id}?${cacheBuster}`;
    fetch(url, { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data: DbEvent | null) => {
        if (!cancelled && data?.video_url) {
          setVideoUrl(data.video_url);
        } else if (!cancelled) {
          setVideoUrl(null);
        }
      })
      .catch(() => { if (!cancelled) setVideoUrl(null); });
    return () => { cancelled = true; };
  }, [album, fromDb]);

  // Reset video playing state when modal closes
  useEffect(() => {
    if (!album) {
      setIsVideoPlaying(false);
    }
  }, [album]);

  useEffect(() => {
    if (album) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [album]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!album) return null;

  // Use real stories count for database albums
  const storiesRecorded = fromDb ? dbPhotos.filter((p) => p.has_story).length : album.storiesRecorded;

  // Determine workflow progress
  const getStepStatus = (step: string) => {
    if (step === 'photos') return (fromDb ? dbPhotos.length : album.photoCount) > 0 ? 'complete' : 'pending';
    if (step === 'stories') return storiesRecorded > 0 ? 'complete' : 'pending';
    if (step === 'film') return album.hasRecap ? 'complete' : (storiesRecorded >= 3 ? 'ready' : 'pending');
    return 'pending';
  };

  // Use real photos from DB when available; otherwise placeholder for mock
  const albumPhotos = fromDb && dbPhotos.length > 0
    ? dbPhotos.map((p, i) => ({
        id: p.id,
        url: p.thumbnail_url || p.original_url || '/testphoto.jpg',
        originalUrl: p.original_url,
        animatedUrl: p.animated_url,
        isAnimated: !!p.animated_url, // Show badge only for photos with animation
        order: i + 1,
        summary: p.summary,
      }))
    : Array.from({ length: album.photoCount }, (_, i) => ({
        id: `${album.id}-photo-${i + 1}`,
        url: ['/testphoto.jpg', '/pic1.PNG', '/pic2.PNG', '/pic3.PNG', '/pic4.PNG'][i % 5],
        originalUrl: null as string | null,
        animatedUrl: null as string | null,
        isAnimated: true,
        order: i + 1,
        summary: null as string | null,
      }));

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-5xl rounded-2xl overflow-hidden"
        style={{ background: '#141210' }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <CloseIcon />
        </button>

        {/* Hero Section */}
        <div className="relative aspect-[16/9]">
          {album.coverUrl ? (
            album.isPortrait ? (
              <>
                <img 
                  src={album.coverUrl}
                  alt=""
                  loading="eager"
                  className="absolute inset-0 w-full h-full object-cover scale-150 blur-xl opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src={album.coverUrl}
                    alt={album.title}
                    loading="eager"
                    className="h-full w-auto object-contain"
                  />
                </div>
              </>
            ) : (
              <img 
                src={album.coverUrl}
                alt={album.title}
                loading="eager"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-800/50">
              <div className="flex flex-col items-center gap-2 text-white/40">
                <PhotoIcon />
                <span className="text-sm">Add photos to this album</span>
              </div>
            </div>
          )}
          
          {/* Gradient overlay */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: 'linear-gradient(to top, #141210 0%, rgba(20, 18, 16, 0.5) 40%, transparent 100%)'
            }}
          />
          
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h1 
              className="text-3xl md:text-4xl font-light text-white mb-2"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              {album.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-white/50">
              <span>{album.location}</span>
              <span>·</span>
              <span>
                {new Date(album.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Family members - Google Photos collab style */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-white/50 text-sm">Family</span>
            <div className="flex items-center -space-x-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="w-9 h-9 rounded-full border-2 border-[#141210] flex items-center justify-center text-white text-sm font-medium flex-shrink-0 shadow-md hover:z-10 hover:scale-110 transition-transform cursor-default"
                  style={{ backgroundColor: m.avatar_color }}
                  title={`${m.name}${m.relationship ? ` (${m.relationship})` : ''}`}
                >
                  {m.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            {/* Watch Film button - always show for database albums */}
            {fromDb && (
              videoUrl ? (
                <button 
                  onClick={() => setIsVideoPlaying(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
                  style={{ 
                    background: 'linear-gradient(135deg, #e8dcc4 0%, #c9b896 100%)',
                    color: '#1a1510'
                  }}
                >
                  <PlayIcon className="w-4 h-4" />
                  Watch Film
                </button>
              ) : (
                <div className="relative group">
                  <button 
                    disabled
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all cursor-not-allowed opacity-50"
                    style={{ 
                      background: 'linear-gradient(135deg, #e8dcc4 0%, #c9b896 100%)',
                      color: '#1a1510'
                    }}
                  >
                    <PlayIcon className="w-4 h-4" />
                    Watch Film
                  </button>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    <div className="font-medium mb-1">No film created yet</div>
                    <div className="text-white/70">Go to Album → Timeline tab → Export Video</div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                  </div>
                </div>
              )
            )}
            {/* For mock albums - show based on hasRecap */}
            {!fromDb && album.hasRecap && (
              <button 
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{ 
                  background: 'linear-gradient(135deg, #e8dcc4 0%, #c9b896 100%)',
                  color: '#1a1510'
                }}
              >
                <PlayIcon className="w-4 h-4" />
                Watch Film
              </button>
            )}
            
            {fromDb ? (
              <>
                <Link
                  href={`/album/${album.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <MicIcon />
                  Add Story
                </Link>
                <Link
                  href={`/album/${album.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <PhotoIcon />
                  Add Photos
                </Link>
                <button
                  onClick={() => setShowScrapbook(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'rgba(217, 170, 90, 0.2)', border: '1px solid rgba(217, 170, 90, 0.3)' }}
                >
                  <span>📒</span>
                  Scrapbook
                </button>
                <Link
                  href={`/album/${album.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:opacity-90 ml-auto"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Edit Album
                </Link>
              </>
            ) : (
              <>
                <button 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <MicIcon />
                  Add Story
                </button>
                <button 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <PhotoIcon />
                  Add Photos
                </button>
                <button 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-white/60 hover:text-white transition-all ml-auto"
                >
                  <ShareIcon />
                  Invite
                </button>
              </>
            )}
          </div>

          {/* Workflow Progress */}
          <div className="mb-8">
            <h3 className="text-sm text-white/40 mb-4 tracking-wide uppercase">Memory Progress</h3>
            <div className="flex items-center gap-2">
              {workflowSteps.map((step, index) => {
                const status = getStepStatus(step.key);
                const Icon = step.icon;
                
                return (
                  <div key={step.key} className="flex items-center">
                    <div 
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                        status === 'complete' 
                          ? 'bg-green-500/20 text-green-400' 
                          : status === 'ready'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-white/5 text-white/30'
                      }`}
                    >
                      <Icon />
                      <span>{step.label}</span>
                      {step.key === 'photos' && <span className="text-xs opacity-60">({fromDb ? dbPhotos.length : album.photoCount})</span>}
                      {step.key === 'stories' && <span className="text-xs opacity-60">({storiesRecorded})</span>}
                      {step.key === 'film' && album.hasRecap && <span className="text-xs opacity-60">✓</span>}
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className="w-8 h-px bg-white/10 mx-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm text-white/40 mb-3 tracking-wide uppercase">About this Memory</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              {fromDb ? (
                <>
                  {album.location ? `Captured at ${album.location}. ` : ''}
                  This collection has {(fromDb ? dbPhotos.length : album.photoCount)} photos.
                  {storiesRecorded > 0
                    ? ` ${storiesRecorded} ${storiesRecorded === 1 ? 'story has' : 'stories have'} been recorded.`
                    : ' Add your stories by capturing photos and talking about them.'}
                  {album.hasRecap && ' A short film has been created from these photos and narrated stories.'}
                </>
              ) : (
                <>
                  Captured at {album.location}, this collection of {album.photoCount} photos tells the story of {album.title.toLowerCase()}.
                  {storiesRecorded > 0
                    ? ` ${storiesRecorded} stories have been recorded by family and friends, bringing these moments to life with multiple perspectives.`
                    : ' Invite family and friends to add their stories and perspectives to bring these moments to life.'}
                  {album.hasRecap && ' A short film has been created from these photos and narrated stories.'}
                </>
              )}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-4 py-6 border-t border-white/10 mb-8">
            <div>
              <p className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {fromDb ? dbPhotos.length : album.photoCount}
              </p>
              <p className="text-xs text-white/40">Photos</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {storiesRecorded}
              </p>
              <p className="text-xs text-white/40">Stories</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {fromDb ? Array.from(new Set(dbPhotos.flatMap((p) => p.facts?.who ?? []))).length : album.contributors.length}
              </p>
              <p className="text-xs text-white/40">{fromDb ? 'People' : 'Contributors'}</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {album.hasRecap ? '1' : '0'}
              </p>
              <p className="text-xs text-white/40">Films</p>
            </div>
          </div>

          {/* Album Photos */}
          <div>
            <h3 className="text-lg text-white/90 font-medium mb-5" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
              Photos
            </h3>
            {fromDb && dbPhotosLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : albumPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {albumPhotos.map((photo, photoIndex) => {
                  // Get perspectives for this photo to show contributor avatars
                  const photoPerspectives = getMockPerspectives(photoIndex, members);
                  
                  const content = (
                    <div 
                        className="relative overflow-hidden rounded-md bg-[#1a1a1a]"
                        style={{ aspectRatio: '16/9' }}
                      >
                        <div className="relative w-full h-full overflow-hidden">
                          <img 
                            src={photo.url}
                            alt={`Photo ${photo.order}`}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          
                          {/* Bottom gradient */}
                          <div 
                            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none"
                          />
                          
                          {/* Label: Animated or Photo */}
                          <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded ${
                            photo.isAnimated ? 'bg-green-600/80' : 'bg-black/60'
                          }`}>
                            {photo.isAnimated ? (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[10px] text-green-400 font-medium">Animated</span>
                              </>
                            ) : (
                              <span className="text-[10px] text-white/70 font-medium">Photo</span>
                            )}
                          </div>
                          
                          {/* Perspective member avatars */}
                          {photoPerspectives.length > 0 && (
                            <div className="absolute bottom-2 left-2 flex -space-x-1.5">
                              {photoPerspectives.slice(0, 3).map((p) => (
                                <div
                                  key={p.memberId}
                                  className="w-5 h-5 rounded-full border border-black/50 flex items-center justify-center text-white text-[8px] font-medium shadow-sm"
                                  style={{ backgroundColor: p.avatarColor }}
                                  title={`${p.memberName}'s perspective`}
                                >
                                  {p.memberName.charAt(0)}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Story indicator for database photos */}
                          {'summary' in photo && photo.summary && (
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-white text-xs line-clamp-2">{photo.summary}</p>
                            </div>
                          )}
                        </div>
                      </div>
                  );
                  return fromDb ? (
                    <div 
                      key={photo.id} 
                      className="group block cursor-pointer"
                      onClick={() => setSelectedClipPhoto({
                        id: photo.id,
                        url: photo.originalUrl || photo.url,
                        animatedUrl: photo.animatedUrl,
                        summary: photo.summary,
                      })}
                    >
                      {content}
                    </div>
                  ) : (
                    <div key={photo.id} className="group block">
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-white/50 text-sm">
                {fromDb ? 'No photos yet. Add photos by starting a capture session.' : 'No photos.'}
              </div>
            )}
          </div>
        </div>

        {/* Netflix-style Video Theater - Full screen overlay */}
        {isVideoPlaying && videoUrl && (
          <div 
            className="fixed inset-0 bg-black z-[200] flex flex-col"
            onClick={() => setIsVideoPlaying(false)}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                  {album.title}
                </h2>
                <p className="text-white/60 text-sm">Memory Film</p>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoPlaying(false)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Video Player - Centered */}
            <div 
              className="flex-1 flex items-center justify-center p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full max-w-4xl">
                <VideoPlayerWithTime
                  key={videoUrl}
                  src={videoUrl}
                  autoPlay
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                  style={{ maxHeight: 'calc(100vh - 120px)' }}
                />
              </div>
            </div>

            {/* Footer info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="text-white/60 text-sm">
                  {album.date && new Date(album.date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                  {album.location && ` • ${album.location}`}
                </div>
                <div className="text-white/60 text-sm">
                  Press ESC or click outside to close
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Story Card - Collaborative Perspectives */}
        {selectedClipPhoto && (() => {
          const photoIndex = albumPhotos.findIndex(p => p.id === selectedClipPhoto.id);
          const perspectives = getMockPerspectives(photoIndex >= 0 ? photoIndex : 0, members);
          const combinedStory = getCombinedStory(photoIndex >= 0 ? photoIndex : 0);
          
          return (
            <div 
              className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4"
              onClick={() => setSelectedClipPhoto(null)}
            >
              <div 
                className="bg-[#141210] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-sm">Photo Story</span>
                    <div className="flex -space-x-2">
                      {perspectives.map((p) => (
                        <div
                          key={p.memberId}
                          className="w-6 h-6 rounded-full border-2 border-[#141210] flex items-center justify-center text-white text-[9px] font-medium"
                          style={{ backgroundColor: p.avatarColor }}
                          title={p.memberName}
                        >
                          {p.memberName.charAt(0)}
                        </div>
                      ))}
                    </div>
                    <span className="text-white/40 text-xs">{perspectives.length} perspective{perspectives.length !== 1 ? 's' : ''}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedClipPhoto(null)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  {/* LEFT: Photo/Video */}
                  <div className="md:w-1/2 bg-black relative flex items-center justify-center min-h-[200px]">
                    {selectedClipPhoto.animatedUrl ? (
                      <video
                        src={selectedClipPhoto.animatedUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-contain max-h-[40vh] md:max-h-[70vh]"
                      />
                    ) : selectedClipPhoto.url ? (
                      <img 
                        src={selectedClipPhoto.url} 
                        alt="Photo"
                        className="w-full h-full object-contain max-h-[40vh] md:max-h-[70vh]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">📷</div>
                    )}
                    
                    {/* Animation badge */}
                    {selectedClipPhoto.animatedUrl && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-purple-600/80 text-white text-xs rounded-lg flex items-center gap-1">
                        <span>🎬</span>
                        <span>Animated</span>
                      </div>
                    )}
                    
                    {/* Perspective member avatars overlay */}
                    <div className="absolute bottom-3 right-3 flex -space-x-2">
                      {perspectives.map((p) => (
                        <div
                          key={p.memberId}
                          className="w-8 h-8 rounded-full border-2 border-black/50 flex items-center justify-center text-white text-xs font-medium shadow-lg"
                          style={{ backgroundColor: p.avatarColor }}
                          title={`${p.memberName} shared their perspective`}
                        >
                          {p.memberName.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* RIGHT: Perspectives + Combined Story */}
                  <div className="md:w-1/2 flex flex-col bg-[#1a1715] max-h-[50vh] md:max-h-[70vh] overflow-y-auto">
                    {/* Individual Perspectives */}
                    <div className="p-5 border-b border-white/10">
                      <h3 className="text-white/40 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        Family Perspectives
                      </h3>
                      <div className="space-y-4">
                        {perspectives.map((p, i) => (
                          <div key={i} className="flex gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                              style={{ backgroundColor: p.avatarColor }}
                            >
                              {p.memberName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-white font-medium text-sm">{p.memberName}</span>
                                {p.relationship && (
                                  <span className="text-white/40 text-xs">({p.relationship})</span>
                                )}
                              </div>
                              <p className="text-white/80 text-sm leading-relaxed italic">&ldquo;{p.quote}&rdquo;</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Combined Story */}
                    <div className="p-5 flex-1">
                      <h3 className="text-white/40 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                        </svg>
                        EVA&apos;s Combined Story
                      </h3>
                      
                      {/* Original summary if exists */}
                      {selectedClipPhoto.summary && (
                        <div className="mb-4 p-3 bg-white/5 rounded-lg border-l-2 border-cyan-500/50">
                          <p className="text-white/90 text-sm leading-relaxed">{selectedClipPhoto.summary}</p>
                        </div>
                      )}
                      
                      {/* Combined narrative */}
                      <p className="text-white/70 text-sm leading-relaxed">{combinedStory}</p>
                    </div>
                    
                    {/* Footer action */}
                    <div className="p-5 border-t border-white/10">
                      <div className="flex gap-3">
                        <Link
                          href={`/album/${album.id}?photo=${selectedClipPhoto.id}`}
                          className="flex-1 text-center px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors text-sm font-medium"
                          onClick={() => {
                            setSelectedClipPhoto(null);
                            onClose();
                          }}
                        >
                          Add Your Perspective
                        </Link>
                        <button
                          className="px-4 py-2.5 text-white/50 hover:text-white/70 text-sm transition-colors"
                          onClick={() => setSelectedClipPhoto(null)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Scrapbook Modal */}
      {album && (
        <ScrapbookModal
          isOpen={showScrapbook}
          onClose={() => setShowScrapbook(false)}
          eventId={album.id}
          eventTitle={album.title}
          eventDate={album.date}
        />
      )}
    </div>
  );
}
