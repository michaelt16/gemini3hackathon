'use client';

import { useState, useRef, useEffect } from 'react';
import AlbumModal from '@/components/AlbumModal';

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

// Album type
interface Album {
  id: string;
  title: string;
  date: string;
  location: string;
  photoCount: number;
  contributors: string[];
  hasSummary: boolean;
  hasRecap: boolean;
  coverUrl: string;
  storiesRecorded: number;
  isPortrait?: boolean;
}

// Mock data
const allAlbums: Album[] = [
  { 
    id: '1', 
    title: 'Summer 2024 Reunion', 
    date: '2024-07-15', 
    location: 'Lake Tahoe, CA',
    photoCount: 12,
    contributors: ['Mom', 'Dad', 'Sarah'],
    hasSummary: true,
    hasRecap: true,
    coverUrl: '/testphoto.jpg',
    storiesRecorded: 8,
  },
  { 
    id: '2', 
    title: 'Grandma\'s 80th Birthday', 
    date: '2024-03-22', 
    location: 'Chicago, IL',
    photoCount: 8,
    contributors: ['Uncle Joe', 'Aunt Mary'],
    hasSummary: true,
    hasRecap: false,
    coverUrl: '/pic1.PNG',
    storiesRecorded: 5,
    isPortrait: true,
  },
  { 
    id: '3', 
    title: 'Christmas 2023', 
    date: '2023-12-25', 
    location: 'Home',
    photoCount: 24,
    contributors: ['Mom', 'Dad', 'Grandpa', 'Sarah', 'Tom'],
    hasSummary: true,
    hasRecap: true,
    coverUrl: '/pic2.PNG',
    storiesRecorded: 18,
  },
  { 
    id: '4', 
    title: 'Spring Picnic', 
    date: '2024-04-10', 
    location: 'Central Park',
    photoCount: 15,
    contributors: ['Sarah', 'Tom'],
    hasSummary: false,
    hasRecap: false,
    coverUrl: '/pic3.PNG',
    storiesRecorded: 3,
    isPortrait: true,
  },
  { 
    id: '5', 
    title: 'Beach Day', 
    date: '2024-06-20', 
    location: 'Santa Monica',
    photoCount: 22,
    contributors: ['Mom', 'Sarah'],
    hasSummary: true,
    hasRecap: false,
    coverUrl: '/pic4.PNG',
    storiesRecorded: 12,
  },
];

// Categories - Living Memory specific
const categories = [
  { 
    title: 'Films Ready', 
    albums: allAlbums.filter(a => a.hasRecap) 
  },
  { 
    title: 'Needs More Stories', 
    albums: allAlbums.filter(a => !a.hasRecap && a.storiesRecorded < 5) 
  },
  { 
    title: 'All Memories', 
    albums: allAlbums 
  },
];

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
    <div className="mb-10 group/row relative">
      <div className="px-6 md:px-10 mb-4">
        <h2 
          className="text-lg text-white/90 font-medium"
          style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
        >
          {title}
        </h2>
      </div>
      
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <ChevronLeftIcon />
          </button>
        )}
        
        {/* Right Arrow */}
        {showRightArrow && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <ChevronRightIcon />
          </button>
        )}
        
        {/* Scrollable row */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-6 md:px-10 pb-4"
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

// Album Card Component
function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex-shrink-0 w-[280px] md:w-[360px] lg:w-[400px] group cursor-pointer"
    >
      {/* Polaroid frame */}
      <div 
        className="relative p-2 rounded-sm"
        style={{ 
          backgroundColor: '#f5f3f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        {/* Photo inside polaroid */}
        <div 
          className="relative w-full rounded-sm overflow-hidden mb-3"
          style={{ aspectRatio: '16/10' }}
        >
          {/* Portrait handling */}
          {album.isPortrait ? (
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
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          
          {/* Gradient on hover */}
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
          />
          
          {/* Film badge */}
          {album.hasRecap && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm">
              <PlayIcon className="w-3 h-3 text-white" />
              <span className="text-[10px] text-white font-medium">Film</span>
            </div>
          )}
        </div>
        
        {/* Info - inside polaroid */}
        <div className="px-2 pb-2">
          <h3 className="text-gray-900 text-sm font-medium truncate mb-0.5">
            {album.title}
          </h3>
          <p className="text-gray-600 text-xs">
            {album.photoCount} photos · {album.storiesRecorded} stories
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AlbumPage() {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [heroHovered, setHeroHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const featuredAlbum = allAlbums.find(a => a.hasRecap) || allAlbums[0];

  // Handle album click - open modal immediately
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

      {/* Hero Section */}
      <div 
        className="relative h-[85vh] overflow-hidden"
        onMouseEnter={() => setHeroHovered(true)}
        onMouseLeave={() => setHeroHovered(false)}
      >
        {/* Background */}
        <div className="absolute inset-0">
          <img 
            src={featuredAlbum.coverUrl}
            alt={featuredAlbum.title}
            loading="eager"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              heroHovered ? 'opacity-0' : 'opacity-100'
            }`}
          />
          
          <video
            ref={videoRef}
            src="/remento.mp4"
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
        <div 
          className="absolute bottom-0 left-0 right-0 h-[35%]"
          style={{ 
            background: 'linear-gradient(to top, #0d0b09 0%, transparent 100%)'
          }}
        />
        
        {/* Content */}
        <div className="absolute bottom-[18%] left-6 md:left-10 max-w-lg z-10">
          {/* Status */}
          {featuredAlbum.hasRecap && (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 mb-3">
              Film Ready
            </span>
          )}
          
          <h1 
            className="text-3xl md:text-5xl font-light text-white mb-3"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            {featuredAlbum.title}
          </h1>
          
          <p className="text-white/60 text-sm mb-5">
            {featuredAlbum.location} · {featuredAlbum.photoCount} photos · {featuredAlbum.storiesRecorded} stories from {featuredAlbum.contributors.length} people
          </p>
          
          <div className="flex items-center gap-3">
            {featuredAlbum.hasRecap && (
              <button 
                onClick={() => handleAlbumClick(featuredAlbum)}
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
          </div>
        </div>
      </div>

      {/* Swimlane Rows */}
      <div className="relative -mt-16 z-10 pt-4">
        {categories.map((category, index) => (
          <SwimlaneRow
            key={index}
            title={category.title}
            albums={category.albums}
            onAlbumClick={handleAlbumClick}
          />
        ))}
      </div>

      {/* Album Detail Modal */}
      <AlbumModal 
        album={selectedAlbum}
        allAlbums={allAlbums}
        onClose={() => setSelectedAlbum(null)}
        onAlbumClick={handleAlbumClick}
      />

      {/* Hide scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
