'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeContext';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });
const CaptureModal = dynamic(() => import('@/components/CaptureModal'), { ssr: false });

// ============================================================================
// TYPES
// ============================================================================

interface Album {
  id: string;
  title: string;
  coverUrl: string | null;
  photoCount: number;
  date: string;
}

type PanelPhase = 'closed' | 'menu' | 'pick-album' | 'create-album';

// ============================================================================
// CONTEXTUAL GREETINGS
// ============================================================================

function getGreeting(pathname: string, albumTitle?: string): string {
  if (pathname.match(/^\/album\/[^/]+$/)) {
    return albumTitle ? `Add more to ${albumTitle}?` : 'Add more to this story?';
  }
  if (pathname === '/album') return 'What shall we do?';
  if (pathname === '/feed') return 'Ready when you are';
  if (pathname === '/questions') return 'Capture something while you\'re here?';
  if (pathname.includes('/editor')) return 'Need to capture more?';
  return 'What shall we do?';
}

function isInsideAlbum(pathname: string): string | null {
  const match = pathname.match(/^\/album\/([^/]+)/);
  return match ? match[1] : null;
}

// ============================================================================
// ICONS
// ============================================================================

const CameraIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const BackArrow = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const PhotoIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

// ============================================================================
// EVA NUCLEUS — Mini glowing core that represents EVA's presence
// ============================================================================

function EVANucleus({ isDark }: { isDark: boolean }) {
  return (
    <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full eva-nucleus-breathe"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(59,130,246,0.08) 60%, transparent 100%)'
            : 'radial-gradient(circle, rgba(6,172,212,0.2) 0%, rgba(50,140,200,0.06) 60%, transparent 100%)',
        }}
      />
      {/* Inner core */}
      <div
        className="w-3 h-3 rounded-full eva-nucleus-breathe relative z-10"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 35% 35%, #fff 0%, #b5f5ff 20%, #06b6d4 60%, #3b82f6 100%)'
            : 'radial-gradient(circle at 35% 35%, #fff 0%, #d0f0ff 20%, #06b6d4 60%, #0e7490 100%)',
          boxShadow: isDark
            ? '0 0 12px rgba(6,182,212,0.5), 0 0 4px rgba(255,255,255,0.3)'
            : '0 0 10px rgba(6,172,212,0.4), 0 0 3px rgba(255,255,255,0.4)',
        }}
      />
      {/* Specular highlight */}
      <div
        className="absolute w-1.5 h-1.5 rounded-full z-20"
        style={{
          top: '11px',
          left: '13px',
          background: 'rgba(255,255,255,0.7)',
          filter: 'blur(0.5px)',
        }}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EVAPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [phase, setPhase] = useState<PanelPhase>('closed');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoaded, setAlbumsLoaded] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [captureEventId, setCaptureEventId] = useState<string>('');

  // Create album state
  const [newAlbumName, setNewAlbumName] = useState('');
  const [creating, setCreating] = useState(false);

  // Animation state
  const [chipsVisible, setChipsVisible] = useState(false);

  // For the current album context (when inside an album page)
  const [currentAlbumTitle, setCurrentAlbumTitle] = useState<string | undefined>();
  const currentEventId = isInsideAlbum(pathname);

  const panelRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Hide EVA on pages that have their own EVA orb or don't need it
  const isHidden = pathname === '/family'
    || pathname.includes('/editor')
    || pathname.includes('/storybook');

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (phase !== 'closed' && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPhase('closed');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [phase]);

  // Close panel on route change
  useEffect(() => {
    setPhase('closed');
  }, [pathname]);

  // Trigger staggered chip animation when menu opens
  useEffect(() => {
    if (phase === 'menu') {
      setChipsVisible(false);
      const timer = setTimeout(() => setChipsVisible(true), 120);
      return () => clearTimeout(timer);
    } else {
      setChipsVisible(false);
    }
  }, [phase]);

  // Fetch albums
  const fetchAlbums = useCallback(async () => {
    if (albumsLoaded) return;
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlbums(data.map((e: any) => ({
            id: e.id,
            title: e.title,
            coverUrl: e.cover_url ?? null,
            photoCount: e.photo_count ?? 0,
            date: e.date_start
              ? new Date(e.date_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : (e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''),
          })));
          setAlbumsLoaded(true);
        }
      }
    } catch { /* ignore */ }
  }, [albumsLoaded]);

  // Fetch current album title when inside an album
  useEffect(() => {
    if (currentEventId) {
      fetch(`/api/events/${currentEventId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.title) setCurrentAlbumTitle(data.title); })
        .catch(() => {});
    } else {
      setCurrentAlbumTitle(undefined);
    }
  }, [currentEventId]);

  const handleOrbClick = () => {
    if (phase === 'closed') { setPhase('menu'); fetchAlbums(); }
    else { setPhase('closed'); }
  };

  const handleCaptureClick = () => {
    if (currentEventId) {
      setCaptureEventId(currentEventId);
      setShowCapture(true);
      setPhase('closed');
    } else {
      setPhase('pick-album');
      fetchAlbums();
    }
  };

  const handleAlbumPick = (albumId: string) => {
    setCaptureEventId(albumId);
    setShowCapture(true);
    setPhase('closed');
  };

  const handleNewAlbumClick = () => {
    setPhase('create-album');
    setNewAlbumName('');
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newAlbumName.trim(), album_type: 'event' }),
      });
      if (res.ok) {
        const data = await res.json();
        setAlbumsLoaded(false);
        setCaptureEventId(data.id);
        setShowCapture(true);
        setPhase('closed');
        setNewAlbumName('');
      }
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleCaptureClose = () => {
    setShowCapture(false);
    setCaptureEventId('');
    if (pathname.includes('/album')) router.refresh();
  };

  if (isHidden) return null;

  const greeting = getGreeting(pathname, currentAlbumTitle);
  const isOpen = phase !== 'closed';

  return (
    <>
      {/* Floating EVA Panel Container */}
      <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        
        {/* Floating Panel */}
        <div
          className={`transition-all duration-300 ease-out origin-bottom-right ${
            isOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-3 pointer-events-none'
          }`}
        >
          <div
            className="w-[340px] rounded-[20px] overflow-hidden relative"
            style={{
              background: isDark
                ? 'linear-gradient(170deg, rgba(10,15,22,0.98) 0%, rgba(6,8,14,0.99) 100%)'
                : 'linear-gradient(170deg, rgba(255,255,255,0.99) 0%, rgba(250,248,244,0.99) 100%)',
              border: `1px solid ${isDark ? 'rgba(6,182,212,0.10)' : 'rgba(6,162,190,0.12)'}`,
              backdropFilter: 'blur(24px)',
              boxShadow: isDark
                ? '0 24px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(6,182,212,0.15), inset 0 1px 0 rgba(255,255,255,0.03)'
                : '0 24px 80px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(6,162,190,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            {/* Animated aurora accent line at top */}
            <div className="h-[2px] w-full eva-aurora-line" />

            {/* Ambient glow behind panel (subtle EVA presence) */}
            <div
              className="absolute top-0 right-0 w-32 h-32 pointer-events-none eva-nucleus-breathe"
              style={{
                background: isDark
                  ? 'radial-gradient(circle at 80% 10%, rgba(6,182,212,0.06) 0%, transparent 70%)'
                  : 'radial-gradient(circle at 80% 10%, rgba(6,172,212,0.04) 0%, transparent 70%)',
              }}
            />

            {/* ============================================================ */}
            {/* MENU PHASE */}
            {/* ============================================================ */}
            {phase === 'menu' && (
              <div className="px-5 pt-4 pb-4 relative">
                {/* EVA header — nucleus + greeting as if EVA is speaking */}
                <div className="flex items-center gap-3 mb-5">
                  <EVANucleus isDark={isDark} />
                  <div className="flex-1">
                    <p
                      className={`text-[17px] leading-snug ${isDark ? 'text-white/90' : 'text-gray-800'}`}
                      style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                    >
                      {greeting}
                    </p>
                  </div>
                </div>

                {/* Suggestion chips — staggered entrance, organic shape */}
                <div className="space-y-2">
                  {/* Capture chip — primary action, warm glow */}
                  <button
                    onClick={handleCaptureClick}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                      chipsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                    }`}
                    style={{
                      transitionDelay: '0ms',
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(6,182,212,0.10) 0%, rgba(13,148,136,0.06) 100%)'
                        : 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(13,148,136,0.04) 100%)',
                      border: `1px solid ${isDark ? 'rgba(6,182,212,0.12)' : 'rgba(6,182,212,0.15)'}`,
                    }}
                  >
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: isDark
                          ? 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(13,148,136,0.08) 100%)'
                          : 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(13,148,136,0.06) 100%)',
                      }}
                    />
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 transition-transform duration-300 group-hover:scale-110 ${
                        isDark ? 'text-cyan-400' : 'text-cyan-600'
                      }`}
                      style={{
                        background: isDark
                          ? 'linear-gradient(135deg, rgba(6,182,212,0.20) 0%, rgba(6,182,212,0.08) 100%)'
                          : 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 100%)',
                        boxShadow: isDark ? '0 2px 8px rgba(6,182,212,0.15)' : '0 2px 8px rgba(6,182,212,0.1)',
                      }}
                    >
                      <CameraIcon />
                    </div>
                    <div className="text-left flex-1 relative z-10">
                      <p className={`text-[13px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {currentEventId ? `Add to ${currentAlbumTitle || 'this album'}` : "Let's capture a memory"}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
                        {currentEventId ? 'Scan or photograph' : 'Scan photos with EVA'}
                      </p>
                    </div>
                    <div className={`relative z-10 transition-all duration-200 group-hover:translate-x-0.5 ${isDark ? 'text-cyan-500/40 group-hover:text-cyan-400' : 'text-cyan-400/40 group-hover:text-cyan-600'}`}>
                      <ChevronRight />
                    </div>
                  </button>

                  {/* New album chip — secondary, more subdued */}
                  <button
                    onClick={handleNewAlbumClick}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-300 group ${
                      chipsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                    } ${
                      isDark
                        ? 'bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.12]'
                        : 'bg-gray-50/40 hover:bg-gray-100/60 border border-gray-200/30 hover:border-gray-200/60'
                    }`}
                    style={{ transitionDelay: '70ms' }}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-105 group-hover:rotate-90 ${
                        isDark ? 'bg-white/[0.04] text-white/40 group-hover:text-white/70' : 'bg-gray-100/60 text-gray-400 group-hover:text-gray-600'
                      }`}
                    >
                      <PlusIcon />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`text-[13px] font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        Start a new album
                      </p>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                        Create a fresh collection
                      </p>
                    </div>
                    <div className={`transition-all duration-200 group-hover:translate-x-0.5 ${isDark ? 'text-white/10 group-hover:text-white/30' : 'text-gray-200 group-hover:text-gray-400'}`}>
                      <ChevronRight />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* PICK ALBUM PHASE */}
            {/* ============================================================ */}
            {phase === 'pick-album' && (
              <div>
                {/* Header */}
                <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
                  <button
                    onClick={() => setPhase('menu')}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BackArrow />
                  </button>
                  <EVANucleus isDark={isDark} />
                  <p
                    className={`text-[15px] flex-1 ${isDark ? 'text-white/80' : 'text-gray-700'}`}
                    style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                  >
                    Where should we keep this?
                  </p>
                </div>

                {/* Divider */}
                <div className="mx-4 mb-1" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }} />

                {/* Album list */}
                <div className="px-2.5 pb-2 max-h-[300px] overflow-y-auto eva-panel-scroll">
                  {albums.map((album) => (
                    <button
                      key={album.id}
                      onClick={() => handleAlbumPick(album.id)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all group mb-0.5 ${
                        isDark
                          ? 'hover:bg-white/[0.05]'
                          : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ring-1 ${isDark ? 'ring-white/8' : 'ring-black/5'}`}>
                        {album.coverUrl ? (
                          <img src={album.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                            <PhotoIcon />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-[13px] font-medium truncate ${isDark ? 'text-white/85' : 'text-gray-900'}`}>{album.title}</p>
                        <p className={`text-[11px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                          {album.photoCount} photos{album.date ? ` · ${album.date}` : ''}
                        </p>
                      </div>
                      <div className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 ${isDark ? 'text-cyan-400/60' : 'text-cyan-500'}`}>
                        <ChevronRight />
                      </div>
                    </button>
                  ))}

                  {albums.length === 0 && albumsLoaded && (
                    <div className={`text-center py-10 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                      <p className="text-sm">No albums yet</p>
                      <p className="text-[11px] mt-1 opacity-60">Create your first one below</p>
                    </div>
                  )}

                  {!albumsLoaded && (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Create new album shortcut */}
                <div className="px-2.5 pb-2.5">
                  <button
                    onClick={handleNewAlbumClick}
                    className={`w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-[12px] font-medium ${
                      isDark
                        ? 'text-cyan-400/50 hover:text-cyan-300 hover:bg-cyan-500/[0.06] border border-dashed border-white/[0.06] hover:border-cyan-400/25'
                        : 'text-cyan-600/50 hover:text-cyan-600 hover:bg-cyan-50/50 border border-dashed border-gray-200/40 hover:border-cyan-300/50'
                    }`}
                  >
                    <PlusIcon />
                    <span>New album</span>
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* CREATE ALBUM PHASE */}
            {/* ============================================================ */}
            {phase === 'create-album' && (
              <div className="px-5 pt-4 pb-5">
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-5">
                  <button
                    onClick={() => setPhase('menu')}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BackArrow />
                  </button>
                  <EVANucleus isDark={isDark} />
                  <p
                    className={`text-[15px] ${isDark ? 'text-white/80' : 'text-gray-700'}`}
                    style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                  >
                    Name your new album
                  </p>
                </div>

                <form onSubmit={handleCreateAlbum} className="space-y-3">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Summer 2024..."
                    className={`w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all ${
                      isDark ? 'placeholder:text-white/15 focus:ring-1 focus:ring-cyan-500/30' : 'placeholder:text-gray-300 focus:ring-1 focus:ring-cyan-400/30'
                    }`}
                    style={{
                      fontFamily: 'var(--font-crimson), Georgia, serif',
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                      color: isDark ? '#fff' : '#1d1d1f',
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!newAlbumName.trim() || creating}
                    className="w-full py-3 rounded-xl text-[13px] font-semibold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                      background: newAlbumName.trim()
                        ? 'linear-gradient(135deg, #06b6d4 0%, #0d9488 100%)'
                        : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      boxShadow: newAlbumName.trim() ? '0 4px 24px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                      color: newAlbumName.trim() ? '#fff' : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    }}
                  >
                    {creating ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      'Create & Capture'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* EVA Orb Button */}
        <EVAOrb
          size={96}
          onClick={handleOrbClick}
          showRipple={!isOpen}
        />
      </div>

      {/* Capture Modal Overlay */}
      {showCapture && captureEventId && (
        <CaptureModal
          isOpen={showCapture}
          onClose={handleCaptureClose}
          eventId={captureEventId}
          onPhotosAdded={() => { setAlbumsLoaded(false); }}
        />
      )}

      {/* Panel styles */}
      <style jsx global>{`
        /* Aurora shimmer line */
        .eva-aurora-line {
          background: linear-gradient(
            90deg,
            transparent 0%,
            #06b6d4 15%,
            #8b5cf6 35%,
            #06b6d4 55%,
            #10b981 75%,
            #06b6d4 90%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: eva-aurora-shimmer 4s ease-in-out infinite;
          opacity: 0.5;
        }
        @keyframes eva-aurora-shimmer {
          0%, 100% { background-position: 0% 0; }
          50% { background-position: 100% 0; }
        }

        /* Breathing animation for EVA nucleus */
        .eva-nucleus-breathe {
          animation: eva-breathe 3s ease-in-out infinite;
        }
        @keyframes eva-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }

        /* Scrollbar */
        .eva-panel-scroll::-webkit-scrollbar { width: 3px; }
        .eva-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .eva-panel-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.15); border-radius: 3px; }
        .eva-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.3); }
        .eva-panel-scroll { scrollbar-width: thin; scrollbar-color: rgba(128,128,128,0.15) transparent; }
      `}</style>
    </>
  );
}
