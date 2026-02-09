'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import VideoPlayerWithTime from './VideoPlayerWithTime';
import ScrapbookModal from './ScrapbookModal';
import { useTheme } from '@/contexts/ThemeContext';

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

interface Perspective {
  memberId: string;
  memberName: string;
  relationship: string;
  avatarColor: string;
  quote: string;
}

interface PhotoWithPerspectives {
  id: string;
  url: string;
  animatedUrl: string | null;
  isAnimated: boolean;
  order: number;
  summary: string | null;
  perspectives: Perspective[];
  combinedStory: string;
}

function isFromDatabase(albumId: string): boolean {
  return !/^mock-/.test(albumId);
}

// Icons
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
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

// Mock members
const DEFAULT_MEMBERS: AlbumMember[] = [
  { id: 'm1', name: 'Sarah', relationship: 'daughter', avatar_color: '#f472b6' },
  { id: 'm2', name: 'Michael', relationship: 'son', avatar_color: '#60a5fa' },
  { id: 'm3', name: 'Emma', relationship: 'granddaughter', avatar_color: '#a78bfa' },
  { id: 'm4', name: 'Mom', relationship: 'mother', avatar_color: '#fbbf24' },
  { id: 'm5', name: 'Dad', relationship: 'father', avatar_color: '#34d399' },
];

// Perspective quotes for photos
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

// Generate perspectives for a specific photo
function getPhotoPerspectives(photoIndex: number, members: AlbumMember[]): Perspective[] {
  const numPerspectives = 1 + (photoIndex % 3); // 1-3 perspectives per photo
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
    });
  }
  
  return perspectives;
}

// Generate combined story for a photo based on its perspectives
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

export default function AlbumModal({ album, onClose }: AlbumModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [dbPhotos, setDbPhotos] = useState<DbPhoto[]>([]);
  const [dbPhotosLoading, setDbPhotosLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showScrapbook, setShowScrapbook] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithPerspectives | null>(null);

  const { theme } = useTheme();
  const isLight = theme === 'light';

  const fromDb = album ? isFromDatabase(album.id) : false;
  const members = album?.members?.length ? album.members : DEFAULT_MEMBERS;

  // Fetch real photos when album is from database
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
  }, [album?.id, fromDb, album]);

  // Fetch event video_url
  useEffect(() => {
    if (!album || !fromDb) {
      setVideoUrl(null);
      return;
    }
    let cancelled = false;
    const cacheBuster = `_cb=${Date.now()}`;
    fetch(`/api/events/${album.id}?${cacheBuster}`, { 
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

  useEffect(() => {
    if (!album) {
      setIsVideoPlaying(false);
      setSelectedPhoto(null);
    }
  }, [album]);

  useEffect(() => {
    if (album) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [album]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPhoto) {
          setSelectedPhoto(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, selectedPhoto]);

  if (!album) return null;

  const storiesRecorded = fromDb ? dbPhotos.filter((p) => p.has_story).length : album.storiesRecorded;
  const photoCount = fromDb ? dbPhotos.length : album.photoCount;

  // Build photos with perspectives
  const albumPhotos: PhotoWithPerspectives[] = (fromDb && dbPhotos.length > 0
    ? dbPhotos.map((p, i) => ({
        id: p.id,
        url: p.thumbnail_url || p.original_url || '/testphoto.jpg',
        animatedUrl: p.animated_url,
        isAnimated: !!p.animated_url,
        order: i + 1,
        summary: p.summary,
      }))
    : Array.from({ length: album.photoCount }, (_, i) => ({
        id: `${album.id}-photo-${i + 1}`,
        url: ['/testphoto.jpg', '/pic1.PNG', '/pic2.PNG', '/pic3.PNG', '/pic4.PNG'][i % 5],
        animatedUrl: null as string | null,
        isAnimated: true,
        order: i + 1,
        summary: null as string | null,
      }))
  ).map((photo, index) => {
    const perspectives = getPhotoPerspectives(index, members);
    return {
      ...photo,
      perspectives,
      combinedStory: getCombinedStory(perspectives),
    };
  });

  const handlePhotoClick = (photo: PhotoWithPerspectives) => {
    setSelectedPhoto(photo);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto py-6 px-4"
      style={{ background: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.9)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-[95vw] xl:max-w-[1600px] rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-all"
        >
          <CloseIcon />
        </button>

        {/* Hero Section */}
        <div className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
          {album.coverUrl ? (
            <img 
              src={album.coverUrl}
              alt={album.title}
              className="w-full h-full object-cover"
            />
          ) : albumPhotos.length > 0 ? (
            <img 
              src={albumPhotos[0].url}
              alt={album.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-6xl opacity-30">📷</span>
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-elevated)] via-black/30 to-transparent" />
          
          <div className="absolute bottom-8 md:bottom-12 left-0 right-0 px-6 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                  {album.title}
                </h1>
                <div className="flex items-center gap-3 text-base text-white/60">
                  <span>{album.location}</span>
                  <span>·</span>
                  <span>{new Date(album.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-light text-white">{photoCount}</p>
                  <p className="text-white/40 text-xs uppercase tracking-wider">Photos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-light text-white">{storiesRecorded}</p>
                  <p className="text-white/40 text-xs uppercase tracking-wider">Stories</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-light text-white">{members.length}</p>
                  <p className="text-white/40 text-xs uppercase tracking-wider">Members</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 md:p-8">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            {(album.hasRecap || videoUrl) && (
              <button 
                onClick={() => setIsVideoPlaying(true)}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full text-base font-medium text-white"
                style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
              >
                <PlayIcon className="w-5 h-5" />
                Watch Memory Film
              </button>
            )}
            
            <Link
              href={`/album/${album.id}/editor`}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full text-base font-medium transition-all"
              style={{ 
                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', 
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'}`,
                color: isLight ? 'var(--text-primary)' : '#fff',
              }}
              onClick={onClose}
            >
              <MicIcon />
              Story Editor
            </Link>
            
            <button
              onClick={() => setShowScrapbook(true)}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full text-base font-medium transition-all"
              style={{ 
                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', 
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'}`,
                color: isLight ? 'var(--text-primary)' : '#fff',
              }}
            >
              📒 Scrapbook
            </button>
            
            <Link
              href={`/album/${album.id}`}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full text-base font-medium transition-all"
              style={{ 
                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', 
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'}`,
                color: isLight ? 'var(--text-primary)' : '#fff',
              }}
              onClick={onClose}
            >
              View Full Album →
            </Link>
          </div>

          {/* Instruction */}
          <div className="mb-6 p-4 rounded-xl" style={{ background: isLight ? 'rgba(14,116,144,0.08)' : 'rgba(6,182,212,0.1)', border: `1px solid ${isLight ? 'rgba(14,116,144,0.15)' : 'rgba(6,182,212,0.2)'}` }}>
            <p className="text-base flex items-center gap-2" style={{ color: isLight ? '#0e7490' : '#22d3ee' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Click any photo to see family perspectives and EVA&apos;s combined story
            </p>
          </div>

          {/* Photos Grid */}
          {dbPhotosLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-2 border-white/30 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : albumPhotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {albumPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => handlePhotoClick(photo)}
                  className="group relative overflow-hidden rounded-xl cursor-pointer"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <img 
                    src={photo.url}
                    alt={`Photo ${photo.order}`}
                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Photo number */}
                  <div className="absolute top-3 left-3 text-white/80 text-sm font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Photo {photo.order}
                  </div>
                  
                  {/* Perspectives indicator */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex -space-x-2">
                      {photo.perspectives.slice(0, 3).map((p) => (
                        <div
                          key={p.memberId}
                          className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-white text-xs font-medium shadow-lg"
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
                  
                  {/* Animated badge */}
                  {photo.isAnimated && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}>
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-xs text-white font-medium">Animated</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-30">📷</div>
              <p className="text-white/50 text-base">No photos yet</p>
            </div>
          )}
        </div>

        {/* Photo Detail Overlay - Shows perspectives for selected photo */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            style={{ background: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.95)' }}
            onClick={() => setSelectedPhoto(null)}
          >
            <div 
              className="w-full max-w-[90vw] xl:max-w-[1400px] max-h-[90vh] rounded-2xl overflow-hidden flex flex-col md:flex-row"
              style={{ background: 'var(--bg-elevated)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left: Photo */}
              <div className="md:w-1/2 relative bg-black flex items-center justify-center min-h-[250px] md:min-h-0">
                {/* Back button */}
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeftIcon />
                </button>
                
                {selectedPhoto.animatedUrl ? (
                  <video
                    src={selectedPhoto.animatedUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain max-h-[40vh] md:max-h-full"
                  />
                ) : (
                  <img 
                    src={selectedPhoto.url}
                    alt="Photo"
                    className="w-full h-full object-contain max-h-[40vh] md:max-h-full"
                  />
                )}
                
                {selectedPhoto.isAnimated && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded bg-green-500/90">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-xs text-white font-medium">Animated</span>
                  </div>
                )}
              </div>
              
              {/* Right: Perspectives */}
              <div className="md:w-1/2 flex flex-col max-h-[50vh] md:max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)' }}>
                {/* Header */}
                <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex -space-x-2">
                      {selectedPhoto.perspectives.map((p) => (
                        <div
                          key={p.memberId}
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: p.avatarColor, borderColor: 'var(--bg-secondary)' }}
                        >
                          {p.memberName.charAt(0)}
                        </div>
                      ))}
                    </div>
                    <span className="text-white/50 text-sm">
                      {selectedPhoto.perspectives.length} {selectedPhoto.perspectives.length === 1 ? 'perspective' : 'perspectives'}
                    </span>
                  </div>
                  <h3 className="text-white font-medium">Photo {selectedPhoto.order}</h3>
                </div>
                
                {/* Individual Perspectives */}
                <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h4 className="text-white/40 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    Family Perspectives
                  </h4>
                  
                  <div className="space-y-4">
                    {selectedPhoto.perspectives.map((p) => (
                      <div key={p.memberId} className="flex gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                          style={{ backgroundColor: p.avatarColor }}
                        >
                          {p.memberName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-white font-medium text-sm">{p.memberName}</span>
                            {p.relationship && (
                              <span className="text-white/40 text-xs">({p.relationship})</span>
                            )}
                          </div>
                          <p className="text-white/80 text-sm leading-relaxed italic">
                            &ldquo;{p.quote}&rdquo;
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* EVA's Combined Story */}
                <div className="p-5 flex-1">
                  <h4 className="text-cyan-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <SparklesIcon />
                    EVA&apos;s Combined Story
                  </h4>
                  
                  {selectedPhoto.summary && (
                    <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <p className="text-white/90 text-sm leading-relaxed">{selectedPhoto.summary}</p>
                    </div>
                  )}
                  
                  <p className="text-white/70 text-sm leading-relaxed">
                    {selectedPhoto.combinedStory}
                  </p>
                </div>
                
                {/* Footer */}
                <div className="p-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <Link
                    href={`/album/${album.id}/editor?photo=${selectedPhoto.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
                    onClick={() => {
                      setSelectedPhoto(null);
                      onClose();
                    }}
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
        {isVideoPlaying && (videoUrl || album.hasRecap) && (
          <div 
            className="fixed inset-0 bg-black z-[200] flex flex-col"
            onClick={() => setIsVideoPlaying(false)}
          >
            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
              <div>
                <h2 className="text-xl font-medium text-white">{album.title}</h2>
                <p className="text-white/50 text-sm">Memory Film</p>
              </div>
              <button
                onClick={() => setIsVideoPlaying(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-8" onClick={e => e.stopPropagation()}>
              <div className="w-full max-w-4xl">
                <VideoPlayerWithTime
                  key={videoUrl || '/remento.mp4'}
                  src={videoUrl || '/remento.mp4'}
                  autoPlay
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                  style={{ maxHeight: 'calc(100vh - 120px)' }}
                />
              </div>
            </div>
          </div>
        )}
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
