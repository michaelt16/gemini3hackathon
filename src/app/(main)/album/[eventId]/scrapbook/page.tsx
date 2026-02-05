'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

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

interface EventData {
  id: string;
  title: string;
  description: string | null;
  date_start: string | null;
  location: string | null;
}

// Decorative tape colors
const TAPE_COLORS = [
  'rgba(255, 220, 180, 0.7)', // Warm beige
  'rgba(200, 220, 255, 0.6)', // Light blue
  'rgba(255, 200, 200, 0.6)', // Light pink
  'rgba(220, 255, 220, 0.6)', // Light green
  'rgba(255, 240, 200, 0.7)', // Cream
];

// Random rotation for scrapbook feel
const getRandomRotation = (seed: number) => {
  const rotations = [-6, -4, -2, 0, 2, 4, 6];
  return rotations[seed % rotations.length];
};

// Random tape position
const getTapeStyle = (seed: number) => {
  const positions = ['top-left', 'top-right', 'both-top', 'diagonal'];
  return positions[seed % positions.length];
};

// ============================================================================
// SCRAPBOOK PAGE COMPONENT
// ============================================================================

export default function ScrapbookPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  // Number of photos per page
  const PHOTOS_PER_PAGE = 4;
  const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);

  // Fetch data
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
          setPhotos(photosData.photos || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [eventId]);

  // Get photos for current page
  const currentPhotos = photos.slice(
    currentPage * PHOTOS_PER_PAGE,
    (currentPage + 1) * PHOTOS_PER_PAGE
  );

  // Page navigation
  const goToPage = (page: number) => {
    if (page < 0 || page >= totalPages || isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsFlipping(false);
    }, 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-[88px] md:pt-[96px] flex items-center justify-center" style={{ background: '#0d0b09' }}>
        <div className="flex flex-col items-center gap-4">
          <EVAOrb size={80} isSpeaking={true} />
          <p className="text-white/50 text-sm">Opening scrapbook...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen pt-[88px] md:pt-[96px] flex items-center justify-center" style={{ background: '#0d0b09' }}>
        <div className="text-center">
          <p className="text-white/50 text-lg mb-4">No photos in this album yet</p>
          <Link
            href={`/album/${eventId}`}
            className="px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
            style={{ background: 'linear-gradient(135deg, #e8dcc4 0%, #c9b896 100%)', color: '#1a1510' }}
          >
            Add Photos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pt-[88px] md:pt-[96px] pb-12 overflow-hidden"
      style={{ 
        background: 'linear-gradient(to bottom, #1a1612 0%, #0d0b09 100%)',
      }}
    >
      {/* Paper texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/album/${eventId}`}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div>
              <h1 
                className="text-2xl md:text-3xl text-white font-light"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                {event?.title || 'Scrapbook'}
              </h1>
              <p className="text-white/40 text-sm mt-0.5">
                {photos.length} memories · Page {currentPage + 1} of {totalPages}
              </p>
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/70 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="flex items-center gap-1 px-3">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentPage ? 'bg-[#c9b896] w-4' : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/70 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Scrapbook Page */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div 
          className={`relative rounded-2xl p-8 md:p-12 min-h-[70vh] transition-all duration-300 ${
            isFlipping ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
          style={{
            background: 'linear-gradient(145deg, #f5f0e6 0%, #e8e0d0 50%, #ddd5c5 100%)',
            boxShadow: '0 25px 80px -20px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.03)',
          }}
        >
          {/* Page corner fold effect */}
          <div 
            className="absolute top-0 right-0 w-16 h-16"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.05) 50%)',
            }}
          />

          {/* Decorative title for first page */}
          {currentPage === 0 && (
            <div className="text-center mb-8">
              <h2 
                className="text-3xl md:text-4xl text-[#3d3528] mb-2"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                {event?.title}
              </h2>
              {event?.date_start && (
                <p className="text-[#7a6f5a] text-sm" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                  {new Date(event.date_start).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
              <div className="mt-4 w-24 h-px bg-[#c9b896] mx-auto" />
            </div>
          )}

          {/* Photos Grid - Scrapbook Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {currentPhotos.map((photo, index) => {
              const globalIndex = currentPage * PHOTOS_PER_PAGE + index;
              const rotation = getRandomRotation(globalIndex);
              const tapeStyle = getTapeStyle(globalIndex);
              const tapeColor = TAPE_COLORS[globalIndex % TAPE_COLORS.length];

              return (
                <ScrapbookPhoto
                  key={photo.id}
                  photo={photo}
                  rotation={rotation}
                  tapeStyle={tapeStyle}
                  tapeColor={tapeColor}
                  index={index}
                />
              );
            })}
          </div>

          {/* Page number */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#a09080] text-sm" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
            — {currentPage + 1} —
          </div>
        </div>
      </div>

      {/* EVA Orb */}
      <div className="fixed bottom-6 right-6 z-50">
        <EVAOrb size={100} />
      </div>
    </div>
  );
}

// ============================================================================
// SCRAPBOOK PHOTO COMPONENT
// ============================================================================

interface ScrapbookPhotoProps {
  photo: Photo;
  rotation: number;
  tapeStyle: string;
  tapeColor: string;
  index: number;
}

function ScrapbookPhoto({ photo, rotation, tapeStyle, tapeColor, index }: ScrapbookPhotoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showFullStory, setShowFullStory] = useState(false);

  // Auto-play video when in view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const hasAnimation = !!photo.animated_url;
  const displayUrl = photo.original_url || photo.thumbnail_url || '';

  return (
    <div
      className="relative group"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shadow */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          background: 'rgba(0,0,0,0.15)',
          transform: 'translate(8px, 8px)',
          filter: 'blur(8px)',
        }}
      />

      {/* Photo frame */}
      <div
        className="relative bg-white p-3 md:p-4 rounded-sm"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* Tape decorations */}
        {(tapeStyle === 'top-left' || tapeStyle === 'both-top') && (
          <div
            className="absolute -top-3 left-4 w-12 h-6 -rotate-12"
            style={{
              background: tapeColor,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
        )}
        {(tapeStyle === 'top-right' || tapeStyle === 'both-top') && (
          <div
            className="absolute -top-3 right-4 w-12 h-6 rotate-12"
            style={{
              background: tapeColor,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
        )}
        {tapeStyle === 'diagonal' && (
          <>
            <div
              className="absolute -top-2 -left-2 w-10 h-5 -rotate-45"
              style={{
                background: tapeColor,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            />
            <div
              className="absolute -bottom-2 -right-2 w-10 h-5 -rotate-45"
              style={{
                background: tapeColor,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            />
          </>
        )}

        {/* Photo/Video */}
        <div className="aspect-[4/3] overflow-hidden rounded-sm bg-gray-100 relative">
          {hasAnimation ? (
            <video
              ref={videoRef}
              src={photo.animated_url!}
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={displayUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )}

          {/* Animation badge */}
          {hasAnimation && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600/90 text-white text-xs rounded-full font-medium flex items-center gap-1">
              <span className="animate-pulse">●</span>
              Animated
            </div>
          )}

          {/* Hover overlay for full story */}
          {photo.summary && isHovered && (
            <div 
              className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 cursor-pointer transition-opacity"
              onClick={() => setShowFullStory(true)}
            >
              <p className="text-white text-sm text-center line-clamp-4">
                {photo.summary}
              </p>
            </div>
          )}
        </div>

        {/* Caption/Story */}
        {photo.summary && (
          <div className="mt-3 px-1">
            <p 
              className="text-[#4a4035] text-sm leading-relaxed line-clamp-2"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              &ldquo;{photo.summary}&rdquo;
            </p>
          </div>
        )}

        {/* Handwritten date */}
        <div className="mt-2 text-right">
          <span 
            className="text-[#8a7a65] text-xs"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif', fontStyle: 'italic' }}
          >
            {new Date(photo.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Full Story Modal */}
      {showFullStory && photo.summary && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowFullStory(false)}
        >
          <div 
            className="max-w-lg w-full rounded-2xl p-6 relative"
            style={{ background: 'linear-gradient(145deg, #f5f0e6 0%, #e8e0d0 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFullStory(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[#5a5045] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="aspect-video mb-4 rounded-lg overflow-hidden">
              {hasAnimation ? (
                <video
                  src={photo.animated_url!}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={displayUrl} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            <p 
              className="text-[#3d3528] text-base leading-relaxed"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              &ldquo;{photo.summary}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
