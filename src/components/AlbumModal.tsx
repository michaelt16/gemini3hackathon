'use client';

import { useEffect, useRef } from 'react';

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
  status?: 'gathering' | 'ready' | 'complete';
}

interface AlbumModalProps {
  album: Album | null;
  allAlbums?: Album[];
  onClose: () => void;
  onAlbumClick?: (album: Album) => void;
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

export default function AlbumModal({ album, allAlbums = [], onClose, onAlbumClick }: AlbumModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Determine workflow progress
  const getStepStatus = (step: string) => {
    if (step === 'photos') return 'complete';
    if (step === 'stories') return album.storiesRecorded > 0 ? 'complete' : 'pending';
    if (step === 'film') return album.hasRecap ? 'complete' : (album.storiesRecorded >= 3 ? 'ready' : 'pending');
    return 'pending';
  };

  // Generate placeholder photos for this album
  // In the future, these would come from the album's actual photos
  const albumPhotos = Array.from({ length: album.photoCount }, (_, i) => ({
    id: `${album.id}-photo-${i + 1}`,
    url: [
      '/testphoto.jpg',
      '/pic1.PNG',
      '/pic2.PNG',
      '/pic3.PNG',
      '/pic4.PNG'
    ][i % 5], // Cycle through available images
    isAnimated: true, // These are "living" animated photos
    order: i + 1
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
          {album.isPortrait ? (
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
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            {album.hasRecap ? (
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
            ) : album.storiesRecorded >= 3 ? (
              <button 
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{ 
                  background: 'linear-gradient(135deg, #e8dcc4 0%, #c9b896 100%)',
                  color: '#1a1510'
                }}
              >
                <FilmIcon />
                Create Film
              </button>
            ) : null}
            
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
                      {step.key === 'photos' && <span className="text-xs opacity-60">({album.photoCount})</span>}
                      {step.key === 'stories' && <span className="text-xs opacity-60">({album.storiesRecorded})</span>}
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

          {/* Contributors */}
          <div className="mb-8">
            <h3 className="text-sm text-white/40 mb-4 tracking-wide uppercase">Contributors</h3>
            <div className="flex items-center gap-3">
              {album.contributors.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ 
                      background: 'linear-gradient(135deg, #8B7355 0%, #6B5344 100%)',
                      color: 'rgba(255,255,255,0.9)'
                    }}
                  >
                    {name[0]}
                  </div>
                  <span className="text-sm text-white/70">{name}</span>
                </div>
              ))}
              <button 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                style={{ border: '1px dashed rgba(255,255,255,0.2)' }}
              >
                +
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm text-white/40 mb-3 tracking-wide uppercase">About this Memory</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Captured at {album.location}, this collection of {album.photoCount} photos tells the story of {album.title.toLowerCase()}. 
              {album.storiesRecorded > 0 
                ? ` ${album.storiesRecorded} stories have been recorded by family and friends, bringing these moments to life with multiple perspectives.`
                : ' Invite family and friends to add their stories and perspectives to bring these moments to life.'
              }
              {album.hasRecap && ' A short film has been created from these photos and narrated stories.'}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-4 py-6 border-t border-white/10 mb-8">
            <div>
              <p className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {album.photoCount}
              </p>
              <p className="text-xs text-white/40">Photos</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {album.storiesRecorded}
              </p>
              <p className="text-xs text-white/40">Stories</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {album.contributors.length}
              </p>
              <p className="text-xs text-white/40">Contributors</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                {album.hasRecap ? '1' : '0'}
              </p>
              <p className="text-xs text-white/40">Films</p>
            </div>
          </div>

          {/* Album Photos */}
          {albumPhotos.length > 0 && (
            <div>
              <h3 className="text-lg text-white/90 font-medium mb-5" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                Photos
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {albumPhotos.slice(0, 9).map((photo) => (
                  <div
                    key={photo.id}
                    className="group cursor-pointer"
                  >
                    {/* Polaroid frame */}
                    <div 
                      className="relative p-2 pb-6 rounded-sm"
                      style={{ 
                        backgroundColor: '#f5f3f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
                        aspectRatio: '4/3'
                      }}
                    >
                      {/* Photo inside polaroid */}
                      <div className="relative w-full h-full overflow-hidden">
                        <img 
                          src={photo.url}
                          alt={`Photo ${photo.order}`}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        
                        {/* Gradient on hover */}
                        <div 
                          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                        
                        {/* Animated/Living photo indicator */}
                        {photo.isAnimated && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="text-[10px] text-green-400 font-medium">Living</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
