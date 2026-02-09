'use client';

import { useState, useEffect, useRef } from 'react';

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

interface ScrapbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventDate?: string | null;
}

// Decorative tape colors
const TAPE_COLORS = [
  'rgba(255, 220, 180, 0.7)',
  'rgba(200, 220, 255, 0.6)',
  'rgba(255, 200, 200, 0.6)',
  'rgba(220, 255, 220, 0.6)',
  'rgba(255, 240, 200, 0.7)',
];

const getRandomRotation = (seed: number) => {
  const rotations = [-6, -4, -2, 0, 2, 4, 6];
  return rotations[seed % rotations.length];
};

const getTapeStyle = (seed: number) => {
  const positions = ['top-left', 'top-right', 'both-top', 'diagonal'];
  return positions[seed % positions.length];
};

// ============================================================================
// SCRAPBOOK MODAL COMPONENT
// ============================================================================

export default function ScrapbookModal({ 
  isOpen, 
  onClose, 
  eventId, 
  eventTitle,
  eventDate 
}: ScrapbookModalProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isOpening, setIsOpening] = useState(true);

  const PHOTOS_PER_PAGE = 4;
  const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);

  // Fetch photos
  useEffect(() => {
    if (!isOpen) return;
    
    async function fetchPhotos() {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/photos`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setPhotos(data.photos || []);
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, [isOpen, eventId]);

  // Opening animation
  useEffect(() => {
    if (isOpen) {
      setIsOpening(true);
      setCurrentPage(0);
      const timer = setTimeout(() => setIsOpening(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const currentPhotos = photos.slice(
    currentPage * PHOTOS_PER_PAGE,
    (currentPage + 1) * PHOTOS_PER_PAGE
  );

  const goToPage = (page: number) => {
    if (page < 0 || page >= totalPages || isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsFlipping(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Dark overlay */}
      <div 
        className={`absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-500 ${
          isOpening ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Book container with opening animation */}
      <div 
        className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden transition-all duration-700 ease-out ${
          isOpening 
            ? 'scale-50 opacity-0 rotate-y-90' 
            : 'scale-100 opacity-100 rotate-y-0'
        }`}
        style={{
          perspective: '2000px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 md:top-4 md:right-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/80 hover:text-white transition-colors shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* The Book */}
        <div 
          className="relative rounded-lg overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, #8B7355 0%, #6B5344 100%)',
            padding: '8px',
            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.1)',
          }}
        >
          {/* Book spine effect */}
          <div 
            className="absolute left-1/2 top-0 bottom-0 w-4 -translate-x-1/2 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.15) 100%)',
            }}
          />

          {/* Pages container */}
          <div 
            className="relative rounded overflow-y-auto"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f7 50%, #e8e8ed 100%)',
              maxHeight: 'calc(90vh - 80px)',
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-[#8B7355] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[#7a6f5a] text-sm">Opening scrapbook...</p>
                </div>
              </div>
            ) : photos.length === 0 ? (
              <div className="flex items-center justify-center py-32 text-center px-8">
                <div>
                  <p className="text-[#5a5045] text-lg mb-4" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                    No photos in this album yet
                  </p>
                  <p className="text-[#8a7a65] text-sm">Add photos to see them in your scrapbook</p>
                </div>
              </div>
            ) : (
              <div className={`p-6 md:p-10 transition-opacity duration-300 ${isFlipping ? 'opacity-0' : 'opacity-100'}`}>
                {/* Title page header */}
                {currentPage === 0 && (
                  <div className="text-center mb-8">
                    <h2 
                      className="text-2xl md:text-4xl text-[#3d3528] mb-2"
                      style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                    >
                      {eventTitle}
                    </h2>
                    {eventDate && (
                      <p className="text-[#7a6f5a] text-sm" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                        {new Date(eventDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                    <div className="mt-4 w-24 h-px bg-[#c9b896] mx-auto" />
                  </div>
                )}

                {/* Photos Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
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
                      />
                    );
                  })}
                </div>

                {/* Page number */}
                <div className="text-center mt-8">
                  <span 
                    className="text-[#a09080] text-sm"
                    style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                  >
                    — {currentPage + 1} of {totalPages} —
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page navigation */}
        {!loading && photos.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentPage ? 'bg-[#c9b896] w-6' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
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
}

function ScrapbookPhoto({ photo, rotation, tapeStyle, tapeColor }: ScrapbookPhotoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showFullStory, setShowFullStory] = useState(false);

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
      className="relative group cursor-pointer"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.3s ease',
      }}
      onClick={() => photo.summary && setShowFullStory(true)}
    >
      {/* Shadow */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          background: 'rgba(0,0,0,0.12)',
          transform: 'translate(6px, 6px)',
          filter: 'blur(6px)',
        }}
      />

      {/* Photo frame */}
      <div
        className="relative bg-white p-2 md:p-3 rounded-sm hover:scale-[1.02] transition-transform"
        style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
      >
        {/* Tape decorations */}
        {(tapeStyle === 'top-left' || tapeStyle === 'both-top') && (
          <div
            className="absolute -top-2 left-3 w-10 h-5 -rotate-12"
            style={{ background: tapeColor, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
          />
        )}
        {(tapeStyle === 'top-right' || tapeStyle === 'both-top') && (
          <div
            className="absolute -top-2 right-3 w-10 h-5 rotate-12"
            style={{ background: tapeColor, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
          />
        )}
        {tapeStyle === 'diagonal' && (
          <>
            <div
              className="absolute -top-1 -left-1 w-8 h-4 -rotate-45"
              style={{ background: tapeColor, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
            />
            <div
              className="absolute -bottom-1 -right-1 w-8 h-4 -rotate-45"
              style={{ background: tapeColor, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
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
            <img src={displayUrl} alt="" className="w-full h-full object-cover" />
          )}

          {hasAnimation && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-purple-600/90 text-white text-[10px] rounded-full font-medium flex items-center gap-1">
              <span className="animate-pulse">●</span>
              Live
            </div>
          )}
        </div>

        {/* Caption */}
        {photo.summary && (
          <div className="mt-2 px-0.5">
            <p 
              className="text-[#4a4035] text-xs leading-relaxed line-clamp-2"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              &ldquo;{photo.summary}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Full Story Modal */}
      {showFullStory && photo.summary && (
        <div 
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setShowFullStory(false); }}
        >
          <div 
            className="max-w-lg w-full rounded-xl p-5 relative"
            style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f7 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFullStory(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[#5a5045] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="aspect-video mb-4 rounded-lg overflow-hidden">
              {hasAnimation ? (
                <video src={photo.animated_url!} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={displayUrl} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            <p 
              className="text-[#3d3528] text-sm leading-relaxed"
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
