'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AlbumModal from '@/components/AlbumModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useCreateAlbum } from '@/contexts/CreateAlbumContext';

// ============================================================================
// TYPES & DATA
// ============================================================================

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
  videoUrl?: string | null;
  storiesRecorded: number;
  isPortrait?: boolean;
  status?: 'gathering' | 'ready' | 'complete';
  members?: { id: string; name: string; avatar_color: string }[];
  perspectiveCount?: number;
  featuredQuote?: string;
  featuredQuoteAuthor?: string;
}

function eventToAlbum(e: any): Album {
  const storiesCount = e.stories_count ?? 0;
  const members = (e.members || []).map((m: any, i: number) => ({
    id: m.id || `${m.name}-${i}`,
    name: m.name,
    avatar_color: m.avatar_color || '#06b6d4',
  }));
  return {
    id: e.id, title: e.title,
    date: e.date_start 
      ? new Date(e.date_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
      : (e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''),
    location: e.location || '', photoCount: e.photo_count ?? 0,
    contributors: members.map((m: { name: string }) => m.name),
    hasSummary: !!e.summary,
    hasRecap: !!e.video_url,
    coverUrl: e.cover_url ?? null, videoUrl: e.video_url ?? null, storiesRecorded: storiesCount,
    perspectiveCount: members.length > 0 ? members.length : (storiesCount > 0 ? Math.min(storiesCount, 3) : 0),
    featuredQuote: e.summary || undefined, 
    featuredQuoteAuthor: e.summary && members.length > 0 ? members[0].name : (storiesCount > 0 ? 'Family' : undefined),
    members,
  };
}

// ============================================================================
// ICONS
// ============================================================================

const PlayIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
const PlayLargeIcon = () => <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = () => <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>;
const VolumeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>;
const VolumeMuteIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>;
const FullscreenIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>;
const CloseIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const GridIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
const FilmIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" /></svg>;
const TimelineIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const ChevronLeft = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRight = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const PhotoIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const MicIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>;
const RewindIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>;
const ForwardIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" /></svg>;

type ViewMode = 'cinema' | 'grid' | 'timeline';

// ============================================================================
// HELPER: Format time
// ============================================================================
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AlbumPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { openModal: openCreateAlbum } = useCreateAlbum();
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [featuredAlbum, setFeaturedAlbum] = useState<Album | null>(null);
  const [viewModeState, setViewModeState] = useState<ViewMode>('cinema');
  
  // Custom setter that handles featured album when switching modes
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    // When switching to cinema, ensure we have a valid film selected
    if (mode === 'cinema') {
      const films = allAlbums.filter(a => a.hasRecap && a.videoUrl);
      if (films.length > 0 && (!featuredAlbum || !featuredAlbum.hasRecap)) {
        setFeaturedAlbum(films[0]);
      }
    }
  };
  const [showModal, setShowModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Video player state
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Drag-to-reorder state for carousel
  const [draggedAlbumId, setDraggedAlbumId] = useState<string | null>(null);
  const [dragOverAlbumId, setDragOverAlbumId] = useState<string | null>(null);
  
  // Netflix-style hover preview (carousel)
  const [hoveredAlbumId, setHoveredAlbumId] = useState<string | null>(null);
  const hoverVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Netflix-style hero hover preview (big screen)
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const heroPreviewRef = useRef<HTMLVideoElement>(null);
  const heroHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setAllAlbums(data.map(eventToAlbum));
        }
      } catch { /* empty on error */ }
      finally { setLoading(false); }
    }
    fetchEvents();
  }, []);
  
  // Albums with films for cinema mode
  const filmsOnly = allAlbums.filter(a => a.hasRecap && a.videoUrl);
  
  // Set initial featured album (only films for cinema mode)
  useEffect(() => {
    if (filmsOnly.length > 0 && !featuredAlbum) {
      setFeaturedAlbum(filmsOnly[0]);
    } else if (filmsOnly.length > 0 && featuredAlbum && !filmsOnly.find(f => f.id === featuredAlbum.id)) {
      setFeaturedAlbum(filmsOnly[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAlbums]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isPlayingVideo]);

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 400;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleAlbumSelect = (album: Album) => {
    if (isPlayingVideo) {
      closeVideoPlayer();
    }
    if (viewModeState === 'cinema') {
      if (featuredAlbum?.id !== album.id) {
        setIsTransitioning(true);
        setTimeout(() => {
          setFeaturedAlbum(album);
          setTimeout(() => setIsTransitioning(false), 50);
        }, 300);
      }
    } else {
      router.push(`/album/${album.id}`);
    }
  };

  const currentIndex = featuredAlbum ? filmsOnly.findIndex(a => a.id === featuredAlbum.id) : 0;
  const navigateAlbum = (direction: 'prev' | 'next') => {
    if (isPlayingVideo) return;
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + filmsOnly.length) % filmsOnly.length
      : (currentIndex + 1) % filmsOnly.length;
    handleAlbumSelect(filmsOnly[newIndex]);
  };

  // Video player controls
  const playVideo = () => {
    if (featuredAlbum?.videoUrl) {
      setIsPlayingVideo(true);
      setCurrentTime(0);
      setTimeout(() => {
        videoRef.current?.play();
      }, 100);
    }
  };

  const closeVideoPlayer = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlayingVideo(false);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // ============================================================================
  // CAROUSEL DRAG-TO-REORDER
  // ============================================================================

  const handleAlbumDragStart = (e: React.DragEvent, albumId: string) => {
    setDraggedAlbumId(albumId);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 80, 100);
    }
  };

  const handleAlbumDragOver = (e: React.DragEvent, albumId: string) => {
    e.preventDefault();
    if (draggedAlbumId && albumId !== draggedAlbumId) {
      setDragOverAlbumId(albumId);
    }
  };

  const handleAlbumDrop = (e: React.DragEvent, targetAlbumId: string) => {
    e.preventDefault();
    if (!draggedAlbumId || draggedAlbumId === targetAlbumId) {
      setDraggedAlbumId(null);
      setDragOverAlbumId(null);
      return;
    }

    setAllAlbums(prev => {
      const newAlbums = [...prev];
      const sourceIdx = newAlbums.findIndex(a => a.id === draggedAlbumId);
      const targetIdx = newAlbums.findIndex(a => a.id === targetAlbumId);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const [removed] = newAlbums.splice(sourceIdx, 1);
        newAlbums.splice(targetIdx, 0, removed);
      }

      // Persist the new order to the database
      const orderedIds = newAlbums.map(a => a.id);
      fetch('/api/events/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      }).catch(() => { /* silently fail — order is still correct locally */ });

      return newAlbums;
    });

    setDraggedAlbumId(null);
    setDragOverAlbumId(null);
  };

  const handleAlbumDragEnd = () => {
    setDraggedAlbumId(null);
    setDragOverAlbumId(null);
  };

  // ============================================================================
  // NETFLIX-STYLE HOVER PREVIEW
  // ============================================================================
  const handleThumbnailHover = useCallback((albumId: string) => {
    // Small delay before playing — prevents flicker on fast mouse passes
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredAlbumId(albumId);
      const video = hoverVideoRefs.current[albumId];
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }, 400);
  }, []);

  const handleThumbnailLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (hoveredAlbumId) {
      const video = hoverVideoRefs.current[hoveredAlbumId];
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    }
    setHoveredAlbumId(null);
  }, [hoveredAlbumId]);

  // Hero (big screen) hover preview
  const handleHeroEnter = useCallback(() => {
    if (heroHoverTimeoutRef.current) clearTimeout(heroHoverTimeoutRef.current);
    heroHoverTimeoutRef.current = setTimeout(() => {
      setIsHeroHovered(true);
      const video = heroPreviewRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }, 600);
  }, []);

  const handleHeroLeave = useCallback(() => {
    if (heroHoverTimeoutRef.current) clearTimeout(heroHoverTimeoutRef.current);
    const video = heroPreviewRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setIsHeroHovered(false);
  }, []);

  // Reset hero preview when featured album changes
  useEffect(() => {
    setIsHeroHovered(false);
    if (heroPreviewRef.current) {
      heroPreviewRef.current.pause();
      heroPreviewRef.current.currentTime = 0;
    }
  }, [featuredAlbum?.id]);

  // ============================================================================
  // CINEMA VIEW - Enhanced with Video Player
  // ============================================================================
  const renderCinemaView = () => (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ================================================================== */}
      {/* MAIN VIEWPORT - Featured Album / Video Player */}
      {/* ================================================================== */}
      <div className="flex-1 relative min-h-0">
        {featuredAlbum && (
          <>
            {/* VIDEO PLAYER MODAL */}
            {isPlayingVideo && featuredAlbum.videoUrl && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div 
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  onClick={closeVideoPlayer}
                />
                
                {/* Modal Container */}
                <div 
                  className="relative w-[95vw] h-[85vh] max-w-[1600px] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
                  style={{ background: isDark ? 'linear-gradient(145deg, #1a1a1c 0%, #0d0d0f 100%)' : 'linear-gradient(145deg, #2a2520 0%, #1d1a16 100%)' }}
                  onMouseMove={handleMouseMove}
                >
                  {/* Video element */}
                  <video
                    ref={videoRef}
                    src={featuredAlbum.videoUrl}
                    className="w-full h-full object-contain bg-black cursor-pointer"
                    playsInline
                    onClick={togglePlayPause}
                  />
                  
                  {/* Buffering indicator */}
                  {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    </div>
                  )}
                  
                  {/* Cinematic gradient overlays */}
                  <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/90 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
                  </div>
                  
                  {/* Top bar - Title & Close */}
                  <div className={`absolute top-0 left-0 right-0 p-5 flex items-center justify-between transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/30">
                        <PlayIcon />
                        <span className="text-cyan-300 text-sm font-medium">Storybook</span>
                      </div>
                      <div>
                        <h2 
                          className="text-white text-xl font-light"
                          style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                        >
                          {featuredAlbum.title}
                        </h2>
                        <p className="text-white/50 text-sm">{featuredAlbum.date} · {featuredAlbum.location}</p>
                      </div>
                    </div>
                    <button
                      onClick={closeVideoPlayer}
                      className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition-all"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  
                  {/* Center play/pause overlay */}
                  <div 
                    className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${!isPlaying && showControls ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <button
                      onClick={togglePlayPause}
                      className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white pointer-events-auto hover:bg-white/20 hover:scale-110 transition-all shadow-2xl"
                    >
                      <svg className="w-12 h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Bottom controls */}
                  <div className={`absolute bottom-0 left-0 right-0 p-5 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {/* Progress bar */}
                    <div 
                      className="relative h-1.5 bg-white/20 rounded-full mb-5 cursor-pointer group"
                      onClick={seekTo}
                    >
                      {/* Progress */}
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all"
                        style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                      />
                      {/* Scrubber */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"
                        style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 8px)` : '0' }}
                      />
                    </div>
                    
                    {/* Controls row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Skip back */}
                        <button 
                          onClick={() => skip(-10)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <RewindIcon />
                        </button>
                        
                        {/* Play/Pause */}
                        <button 
                          onClick={togglePlayPause}
                          className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg"
                        >
                          {isPlaying ? <PauseIcon /> : <PlayLargeIcon />}
                        </button>
                        
                        {/* Skip forward */}
                        <button 
                          onClick={() => skip(10)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <ForwardIcon />
                        </button>
                        
                        {/* Time */}
                        <div className="ml-4 text-white/70 text-sm font-mono">
                          <span className="text-white">{formatTime(currentTime)}</span>
                          <span className="mx-2">/</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Volume */}
                        <button 
                          onClick={toggleMute}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                        >
                          {isMuted ? <VolumeMuteIcon /> : <VolumeIcon />}
                        </button>
                        
                        {/* Fullscreen */}
                        <button 
                          onClick={toggleFullscreen}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <FullscreenIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-cyan-500/30 rounded-tl-2xl pointer-events-none" />
                  <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-cyan-500/30 rounded-tr-2xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-cyan-500/30 rounded-bl-2xl pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-cyan-500/30 rounded-br-2xl pointer-events-none" />
                </div>
              </div>
            )}

            {/* ALBUM PREVIEW MODE — Apple Photos Memories style */}
            <>
              {/* Full-bleed photo — the photo IS the experience */}
              <div 
                className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                onMouseEnter={featuredAlbum.videoUrl ? handleHeroEnter : undefined}
                onMouseLeave={featuredAlbum.videoUrl ? handleHeroLeave : undefined}
              >
                <img 
                  src={featuredAlbum.coverUrl || '/testphoto.jpg'}
                  alt=""
                  className={`w-full h-full object-cover transition-opacity duration-700 ${isHeroHovered ? 'opacity-0' : 'opacity-100'}`}
                  style={{ filter: 'brightness(1.0) saturate(1.05)' }}
                />
                
                {/* Netflix-style hero video preview */}
                {featuredAlbum.videoUrl && (
                  <video
                    ref={heroPreviewRef}
                    src={featuredAlbum.videoUrl}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isHeroHovered ? 'opacity-100' : 'opacity-0'}`}
                    muted
                    playsInline
                    preload="none"
                  />
                )}
                
                {/* Single subtle bottom gradient — only covers bottom ~35% for text readability */}
                <div 
                  className="absolute inset-x-0 bottom-0 pointer-events-none"
                  style={{ 
                    height: '45%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 40%, transparent 100%)',
                  }}
                />
              </div>

              {/* Top navigator — frosted glass pill, identical in both themes */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
                <button 
                  onClick={() => navigateAlbum('prev')}
                  className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25 transition-all"
                >
                  <ChevronLeft />
                </button>
                <div className="px-4 py-1.5 rounded-full backdrop-blur-xl bg-white/15 border border-white/20">
                  <span className="text-white/80 text-sm font-medium">
                    <span className="text-white font-semibold">{currentIndex + 1}</span>
                    <span className="mx-1.5 text-white/40">/</span>
                    <span>{filmsOnly.length}</span>
                  </span>
                </div>
                <button 
                  onClick={() => navigateAlbum('next')}
                  className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25 transition-all"
                >
                  <ChevronRight />
                </button>
              </div>

              {/* Floating bottom-left content — minimal, on top of photo */}
              <div 
                className={`absolute bottom-8 left-8 md:left-12 lg:left-16 z-20 max-w-2xl transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.25)' }}
              >
                {/* Title */}
                <h1 
                  className="text-4xl md:text-5xl lg:text-6xl text-white font-light leading-[1.1] tracking-tight mb-2"
                  style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                >
                  {featuredAlbum.title}
                </h1>
                
                {/* Date, location & stats — single line */}
                <div className="flex items-center gap-3 text-white/70 text-base mb-5">
                  <span className="text-white/90">{featuredAlbum.date}</span>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span>{featuredAlbum.location}</span>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span>{featuredAlbum.photoCount} photos</span>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span>{featuredAlbum.storiesRecorded} stories</span>
                </div>

                {/* Quote — simple inline, no border-left testimony style */}
                {featuredAlbum.featuredQuote && (
                  <p 
                    className="text-white/60 text-base italic mb-5 max-w-lg"
                    style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                  >
                    &ldquo;{featuredAlbum.featuredQuote}&rdquo;
                    {featuredAlbum.featuredQuoteAuthor && (
                      <span className="text-white/40 not-italic"> — {featuredAlbum.featuredQuoteAuthor}</span>
                    )}
                  </p>
                )}

                {/* Hero Play + View Album */}
                <div className="flex items-center gap-4" style={{ textShadow: 'none' }}>
                  <Link
                    href={`/album/${featuredAlbum.id}/storybook?mode=watch`}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-cyan-500/20"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)' }}
                  >
                    <PlayIcon />
                    <span className="text-lg font-semibold tracking-wide">Play Living Storybook</span>
                  </Link>

                  <Link
                    href={`/album/${featuredAlbum.id}`}
                    className="text-white/60 hover:text-white text-sm font-medium transition-colors"
                  >
                    View Album
                  </Link>

                  <Link
                    href={`/album/${featuredAlbum.id}/editor`}
                    className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.764m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>
                    Editor
                  </Link>

                  {/* Contributors — small avatars */}
                  {featuredAlbum.members && featuredAlbum.members.length > 0 && (
                    <div className="flex -space-x-2 ml-2">
                      {featuredAlbum.members.slice(0, 4).map((m) => (
                        <div 
                          key={m.id} 
                          className="w-9 h-9 rounded-full border-2 border-white/30 flex items-center justify-center text-white text-xs font-semibold shadow-md"
                          style={{ backgroundColor: m.avatar_color }} 
                          title={m.name}
                        >
                          {m.name[0]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          </>
        )}
        
        {loading && (
          <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-[#0a0a0b]' : 'bg-[var(--bg-primary)]'}`}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <div className={isDark ? 'text-white/50' : 'text-gray-500'}>Loading your memories...</div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* CAROUSEL - Film Strip Style */}
      {/* ================================================================== */}
      <div className={`relative py-6 ${isDark ? 'bg-[#0a0a0b]' : 'bg-[#d5cdbf]'}`} style={!isDark ? { borderTop: '1px solid rgba(0,0,0,0.08)' } : undefined}>
          {/* Film strip perforations decoration */}
          <div className="absolute top-0 left-0 right-0 h-3 flex justify-between px-4 opacity-20">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/50' : 'bg-[#c4baa8]'}`} />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-3 flex justify-between px-4 opacity-20">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/50' : 'bg-[#c4baa8]'}`} />
            ))}
          </div>
          
          {/* Navigation arrows */}
          <button
            onClick={() => scrollCarousel('left')}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full backdrop-blur-sm border flex items-center justify-center hover:border-cyan-400/50 transition-all shadow-lg ${isDark ? 'bg-black/70 border-white/20 text-white/70 hover:text-white hover:bg-black/90' : 'bg-white/90 border-[#c4baa8] text-[#8a7e6e] hover:text-gray-800 hover:bg-white'}`}
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => scrollCarousel('right')}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full backdrop-blur-sm border flex items-center justify-center hover:border-cyan-400/50 transition-all shadow-lg ${isDark ? 'bg-black/70 border-white/20 text-white/70 hover:text-white hover:bg-black/90' : 'bg-white/90 border-[#c4baa8] text-[#8a7e6e] hover:text-gray-800 hover:bg-white'}`}
          >
            <ChevronRight />
          </button>
          
          {/* Carousel */}
          <div 
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto px-16 py-2 scrollbar-hide scroll-smooth"
          >
          {filmsOnly.map((album) => {
            const isSelected = featuredAlbum?.id === album.id;
            const isBeingDragged = draggedAlbumId === album.id;
            const isDragTarget = dragOverAlbumId === album.id;
            const isHoveredPreview = hoveredAlbumId === album.id;
            return (
              <div
                key={album.id}
                draggable
                onDragStart={(e) => handleAlbumDragStart(e, album.id)}
                onDragOver={(e) => handleAlbumDragOver(e, album.id)}
                onDrop={(e) => handleAlbumDrop(e, album.id)}
                onDragEnd={handleAlbumDragEnd}
                onMouseEnter={() => album.videoUrl ? handleThumbnailHover(album.id) : undefined}
                onMouseLeave={handleThumbnailLeave}
                className={`flex-shrink-0 w-[160px] h-[200px] rounded-xl overflow-hidden relative group transition-all duration-300 cursor-grab active:cursor-grabbing ${
                  isSelected 
                    ? `ring-2 ring-cyan-400 ring-offset-4 scale-110 z-10 ${isDark ? 'ring-offset-[#0a0a0b]' : 'ring-offset-[#d5cdbf]'}` 
                    : 'hover:scale-105 opacity-70 hover:opacity-100'
                } ${isBeingDragged ? 'opacity-40 scale-95' : ''} ${isDragTarget ? 'ring-2 ring-cyan-400/60 scale-105' : ''}`}
                onClick={() => handleAlbumSelect(album)}
              >
                <img 
                  src={album.coverUrl || '/testphoto.jpg'}
                  alt={album.title}
                  className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ${isHoveredPreview ? 'opacity-0' : 'opacity-100'}`}
                  draggable={false}
                />
                
                {/* Netflix-style hover video preview */}
                {album.videoUrl && (
                  <video
                    ref={(el) => { hoverVideoRefs.current[album.id] = el; }}
                    src={album.videoUrl}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isHoveredPreview ? 'opacity-100' : 'opacity-0'}`}
                    muted
                    playsInline
                    loop
                    preload="none"
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                
                {/* Drop indicator line */}
                {isDragTarget && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 z-20" />
                )}
                
                {/* Film indicator */}
                <div className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 transition-opacity duration-300 ${isHoveredPreview ? 'opacity-0' : 'opacity-100'}`}>
                  <PlayIcon />
                </div>
                
                
                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h4 
                    className={`text-sm font-medium truncate transition-colors ${isSelected ? 'text-cyan-300' : 'text-white'}`}
                    style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                  >
                    {album.title}
                  </h4>
                  <p className="text-white/50 text-xs mt-0.5">{album.date}</p>
                </div>
                
                {/* Glow effect for selected */}
                {isSelected && (
                  <div className="absolute -inset-2 rounded-2xl bg-cyan-400/20 blur-xl -z-10" />
                )}
              </div>
            );
          })}
          </div>
          
        {/* Fade edges */}
        <div className={`absolute left-0 top-3 bottom-3 w-20 bg-gradient-to-r to-transparent pointer-events-none z-10 ${isDark ? 'from-[#0a0a0b] via-[#0a0a0b]/80' : 'from-[#d5cdbf] via-[#d5cdbf]/80'}`} />
        <div className={`absolute right-0 top-3 bottom-3 w-20 bg-gradient-to-l to-transparent pointer-events-none z-10 ${isDark ? 'from-[#0a0a0b] via-[#0a0a0b]/80' : 'from-[#d5cdbf] via-[#d5cdbf]/80'}`} />
        
        {/* Link to all albums */}
        <div className="absolute right-20 top-1/2 -translate-y-1/2 z-20">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm ${isDark ? 'bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15 hover:border-white/25' : 'bg-white/80 border border-[#c4baa8] text-[#6b5e4e] hover:text-gray-900 hover:bg-white hover:border-[#a89a86]'}`}
          >
            <GridIcon />
            <span>All Albums</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // GRID VIEW - Full Size Rectangular Cards
  // ============================================================================
  const renderGridView = () => (
    <div className="min-h-screen p-6 md:p-10 pt-20">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className={`text-sm tracking-[0.3em] uppercase mb-3 ${isDark ? 'text-cyan-400/60' : 'text-cyan-700/60'}`}>Your Collection</p>
          <h1 
            className={`text-4xl md:text-5xl font-light mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            All Albums
          </h1>
          <p className={isDark ? 'text-white/40' : 'text-gray-400'}>{allAlbums.length} memory collections · {allAlbums.reduce((acc, a) => acc + a.storiesRecorded, 0)} stories</p>
        </div>
        
        {/* Grid - 2 columns, full rectangular cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Add new */}
          <button
            onClick={() => openCreateAlbum()}
            className={`h-[400px] md:h-[500px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-5 hover:text-cyan-500 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all group ${
              isDark ? 'border-white/15 text-white/30' : 'border-[#b0a690] text-[#8a7e6e]'
            }`}
          >
            <div className="w-20 h-20 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all duration-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div className="text-center">
              <span className="text-xl font-light block" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>Create New Album</span>
              <span className="text-sm opacity-60 mt-1 block">Start preserving memories</span>
            </div>
          </button>
          
          {allAlbums.map((album) => {
            const isBeingDragged = draggedAlbumId === album.id;
            const isDragTarget = dragOverAlbumId === album.id;
            return (
            <div
              key={album.id}
              draggable
              onDragStart={(e) => handleAlbumDragStart(e, album.id)}
              onDragOver={(e) => handleAlbumDragOver(e, album.id)}
              onDrop={(e) => handleAlbumDrop(e, album.id)}
              onDragEnd={handleAlbumDragEnd}
              onClick={() => handleAlbumSelect(album)}
              className={`h-[400px] md:h-[500px] rounded-3xl overflow-hidden relative group text-left cursor-grab active:cursor-grabbing transition-all duration-200 ${
                isBeingDragged ? 'opacity-40 scale-[0.97]' : ''
              } ${isDragTarget ? 'ring-2 ring-cyan-400/60 ring-offset-4 ring-offset-black/20 scale-[1.02]' : ''}`}
            >
              {/* Drop indicator */}
              {isDragTarget && (
                <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 z-20" />
              )}
              
              {/* Full cover image */}
              <img 
                src={album.coverUrl || '/testphoto.jpg'}
                alt={album.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                draggable={false}
              />
              
              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              
              {/* Stats badges */}
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/70 text-sm">
                  <PhotoIcon />
                  <span>{album.photoCount}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/70 text-sm">
                  <MicIcon />
                  <span>{album.storiesRecorded}</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                {/* Quote preview on hover */}
                {album.featuredQuote && (
                  <p 
                    className="text-white/70 text-lg italic mb-4 line-clamp-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                    style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                  >
                    &ldquo;{album.featuredQuote}&rdquo;
                  </p>
                )}
                
                <h3 
                  className="text-white text-3xl md:text-4xl font-light mb-3 group-hover:text-cyan-300 transition-colors"
                  style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                >
                  {album.title}
                </h3>
                
                <div className="flex items-center gap-3 text-white/50">
                  <span className="text-white/70">{album.date}</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span>{album.location}</span>
                </div>
                
                {/* Contributors */}
                {album.members && album.members.length > 0 && (
                  <div className="flex items-center gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex -space-x-2">
                      {album.members.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          className="w-8 h-8 rounded-full border-2 border-black/50 flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: m.avatar_color }}
                        >
                          {m.name[0]}
                        </div>
                      ))}
                    </div>
                    <span className="text-white/50 text-sm">{album.members.length} contributors</span>
                  </div>
                )}
              </div>
              
              {/* Hover border glow */}
              <div className="absolute inset-0 rounded-3xl border-2 border-cyan-400/0 group-hover:border-cyan-400/40 transition-colors pointer-events-none" />
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: 'inset 0 0 60px rgba(6,182,212,0.1)' }} />
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // TIMELINE VIEW - Enhanced
  // ============================================================================
  const renderTimelineView = () => {
    const albumsByYear = allAlbums.reduce((acc, album) => {
      const year = album.date.split(' ').pop() || 'Unknown';
      if (!acc[year]) acc[year] = [];
      acc[year].push(album);
      return acc;
    }, {} as Record<string, Album[]>);
    
    const years = Object.keys(albumsByYear).sort((a, b) => parseInt(b) - parseInt(a));
    
    return (
      <div className="min-h-screen p-6 md:p-10 pt-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <p className={`text-sm tracking-[0.3em] uppercase mb-3 ${isDark ? 'text-cyan-400/60' : 'text-cyan-700/60'}`}>Through The Years</p>
            <h1 
              className={`text-4xl md:text-5xl font-light mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              Memory Timeline
            </h1>
            <p className={isDark ? 'text-white/40' : 'text-gray-400'}>Your family journey across {years.length} years</p>
          </div>
          
          {/* Timeline */}
          <div className="relative">
            {/* Central line with gradient */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500 via-cyan-500/40 to-transparent" />
            </div>
            
            {years.map((year, yearIndex) => (
              <div key={year} className="mb-20 relative">
                {/* Year marker */}
                <div className="relative mb-10">
                  <div className={`absolute left-6 md:left-1/2 w-5 h-5 -ml-2.5 rounded-full border-4 border-cyan-500 shadow-lg shadow-cyan-500/50 z-10 ${isDark ? 'bg-[#000000]' : 'bg-[#f5f5f7]'}`} />
                  <div className="ml-16 md:ml-0 md:text-center">
                    <span 
                      className={`text-4xl md:text-5xl font-light inline-block ${isDark ? 'text-white' : 'text-gray-900'}`}
                      style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                    >
                      {year}
                    </span>
                    <p className={`text-sm mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{albumsByYear[year].length} memories</p>
                  </div>
                </div>
                
                {/* Albums for this year */}
                <div className="space-y-8 ml-16 md:ml-0">
                  {albumsByYear[year].map((album, index) => (
                    <div 
                      key={album.id}
                      className={`flex items-stretch gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                    >
                      <div className="hidden md:block md:w-1/2" />
                      <button
                        onClick={() => handleAlbumSelect(album)}
                        className={`flex-1 md:w-1/2 flex gap-5 p-5 rounded-2xl border transition-all group overflow-hidden relative ${isDark ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-cyan-500/30' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-cyan-500/40 shadow-sm hover:shadow-md'}`}
                      >
                        {/* Glow on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(6,182,212,0.1) 0%, transparent 50%)' }} />
                        
                        <div className="w-28 h-36 rounded-xl overflow-hidden flex-shrink-0 relative">
                          <img 
                            src={album.coverUrl || '/testphoto.jpg'}
                            alt={album.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          {album.hasRecap && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-10 h-10 rounded-full bg-cyan-500/80 flex items-center justify-center">
                                <PlayIcon />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left py-1 relative">
                          <h3 
                            className={`text-xl font-light group-hover:text-cyan-500 transition-colors mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                          >
                            {album.title}
                          </h3>
                          <p className={`text-sm mb-3 ${isDark ? 'text-white/50' : 'text-gray-400'}`}>{album.date} · {album.location}</p>
                          <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                            <span className="flex items-center gap-1"><PhotoIcon /> {album.photoCount}</span>
                            <span className="flex items-center gap-1"><MicIcon /> {album.storiesRecorded} stories</span>
                          </div>
                          {album.hasRecap && (
                            <Link 
                              href={`/album/${album.id}/storybook?mode=watch`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
                            >
                              <PlayIcon />
                              Play Storybook
                            </Link>
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* End marker */}
            <div className="relative">
              <div className="absolute left-6 md:left-1/2 w-3 h-3 -ml-1.5 rounded-full bg-cyan-500/30" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden theme-page" style={{ background: isDark ? '#0d0b09' : 'var(--bg-primary)' }}>
      {/* ================================================================== */}
      {/* VIEW MODE TOGGLE - Enhanced */}
      {/* ================================================================== */}
      <div className="fixed top-4 right-4 z-40">
        <div className={`flex items-center gap-1 p-1.5 rounded-full backdrop-blur-md shadow-xl ${
          isDark ? 'bg-black/60 border border-white/10' : 'bg-white/80 border border-gray-200 shadow-lg'
        }`}>
          {[
            { id: 'cinema' as ViewMode, icon: <FilmIcon />, label: 'Cinema' },
            { id: 'grid' as ViewMode, icon: <GridIcon />, label: 'Grid' },
            { id: 'timeline' as ViewMode, icon: <TimelineIcon />, label: 'Timeline' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                viewModeState === mode.id 
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30' 
                  : isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {mode.icon}
              <span className="hidden md:inline">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Render current view */}
      {viewModeState === 'cinema' && renderCinemaView()}
      {viewModeState === 'grid' && renderGridView()}
      {viewModeState === 'timeline' && renderTimelineView()}

      {/* Album Modal */}
      {showModal && (
        <AlbumModal 
          album={selectedAlbum}
          allAlbums={allAlbums}
          onClose={() => { setShowModal(false); setSelectedAlbum(null); }}
          onAlbumClick={(a) => { setSelectedAlbum(a); }}
        />
      )}
      
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2%, -2%); }
          20% { transform: translate(2%, 2%); }
          30% { transform: translate(-1%, 1%); }
          40% { transform: translate(1%, -1%); }
          50% { transform: translate(-2%, 2%); }
          60% { transform: translate(2%, -2%); }
          70% { transform: translate(-1%, -1%); }
          80% { transform: translate(1%, 1%); }
          90% { transform: translate(-2%, -2%); }
        }
        .animate-grain {
          animation: grain 0.5s steps(1) infinite;
        }
      `}</style>
    </div>
  );
}
