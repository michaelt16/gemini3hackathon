'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// EVA Orb - loaded client-side only
const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

// EVA Companion Modal
const EVACompanionModal = dynamic(() => import('@/components/EVACompanionModal'), { ssr: false });

// Types
interface Photo {
  id: string;
  url: string;
  status: 'needs-story' | 'has-story' | 'film-ready' | 'animated';
  aspectRatio: number;
  title?: string;
  date?: string;
  storyPreview?: string;
  contributor?: string;
  contributorColor?: string;
}

interface Album {
  id: string;
  title: string;
  dateRange: string;
  photoCount: number;
  coverUrl: string | null;
  videoUrl: string | null;
  isShared: boolean;
  members: { name: string; color: string; initial: string }[];
}

// Mock data
const MOCK_ALBUMS: Album[] = [
  { id: '1', title: 'Summer 2024 Reunion', dateRange: 'Jul 15 - Jul 22, 2024', photoCount: 24, coverUrl: '/testphoto.jpg', videoUrl: '/remento.mp4', isShared: true, members: [{ name: 'Sarah', color: '#f472b6', initial: 'S' }, { name: 'Michael', color: '#60a5fa', initial: 'M' }] },
  { id: '2', title: "Grandma's 80th Birthday", dateRange: 'Mar 22, 2024', photoCount: 18, coverUrl: '/pic1.PNG', videoUrl: null, isShared: true, members: [{ name: 'Mom', color: '#fbbf24', initial: 'M' }] },
  { id: '3', title: 'Christmas 2023', dateRange: 'Dec 24 - Dec 26, 2023', photoCount: 42, coverUrl: '/pic2.PNG', videoUrl: '/remento.mp4', isShared: true, members: [{ name: 'Dad', color: '#34d399', initial: 'D' }, { name: 'Sarah', color: '#f472b6', initial: 'S' }] },
  { id: '4', title: 'Spring Picnic', dateRange: 'Apr 10, 2024', photoCount: 15, coverUrl: '/pic3.PNG', videoUrl: null, isShared: false, members: [] },
  { id: '5', title: 'Beach Day', dateRange: 'Jun 20, 2024', photoCount: 22, coverUrl: '/pic4.PNG', videoUrl: null, isShared: true, members: [{ name: 'Emma', color: '#a78bfa', initial: 'E' }] },
  { id: '6', title: 'Road Trip Adventures', dateRange: 'Aug 1 - Aug 15, 2024', photoCount: 67, coverUrl: '/pic5.jpg', videoUrl: '/remento.mp4', isShared: false, members: [] },
];

const MOCK_PHOTOS: Photo[] = [
  { id: 'p1', url: '/pic1.PNG', status: 'film-ready', aspectRatio: 1.33, title: 'The Lake House', date: 'July 15', contributor: 'Sarah', contributorColor: '#f472b6' },
  { id: 'p2', url: '/pic2.PNG', status: 'has-story', aspectRatio: 0.75, date: 'July 15' },
  { id: 'p3', url: '/pic3.PNG', status: 'needs-story', aspectRatio: 1.0, date: 'July 16' },
  { id: 'p4', url: '/pic4.PNG', status: 'animated', aspectRatio: 1.5, date: 'July 16', contributor: 'Michael', contributorColor: '#60a5fa' },
  { id: 'p5', url: '/pic5.jpg', status: 'film-ready', aspectRatio: 0.67, date: 'July 17' },
  { id: 'p6', url: '/pic6.jpg', status: 'has-story', aspectRatio: 1.2, storyPreview: 'Grandma taught me to cook...', date: 'July 17' },
  { id: 'p7', url: '/pic7.jpg', status: 'needs-story', aspectRatio: 0.8, date: 'July 18' },
  { id: 'p8', url: '/pic8.jpg', status: 'animated', aspectRatio: 1.4, date: 'July 19', contributor: 'Mom', contributorColor: '#fbbf24' },
  { id: 'p9', url: '/pic9.jpg', status: 'has-story', aspectRatio: 1.0, date: 'July 20' },
  { id: 'p10', url: '/testphoto.jpg', status: 'film-ready', aspectRatio: 1.78, date: 'July 22', contributor: 'Dad', contributorColor: '#34d399' },
];

const CURRENT_ALBUM = {
  id: 'summer-2024',
  title: 'Summer 2024 Reunion',
  dateRange: 'Jul 15 - Jul 22, 2024',
  photoCount: MOCK_PHOTOS.length,
  members: [
    { name: 'You', color: '#06b6d4', initial: 'Y' },
    { name: 'Sarah', color: '#f472b6', initial: 'S' },
    { name: 'Michael', color: '#60a5fa', initial: 'M' },
    { name: 'Mom', color: '#fbbf24', initial: 'M' },
    { name: 'Dad', color: '#34d399', initial: 'D' },
  ],
  videoUrl: '/remento.mp4',
};

// Sidebar Navigation Items
const NAV_ITEMS = [
  { id: 'home', icon: '🏠', label: 'Home', href: '/home-v2' },
  { id: 'albums', icon: '📚', label: 'Albums', href: '/album-warmth', active: true },
  { id: 'questions', icon: '❓', label: 'Questions', href: '/questions', badge: 3 },
  { id: 'family', icon: '👨‍👩‍👧‍👦', label: 'Family Tree', href: '/family' },
];

const COLLECTIONS = [
  { id: 'favorites', icon: '⭐', label: 'Favorites' },
  { id: 'people', icon: '👤', label: 'People & Faces' },
  { id: 'places', icon: '📍', label: 'Places' },
  { id: 'films', icon: '🎬', label: 'Films Ready' },
];

// Sidebar Component
function Sidebar({ 
  currentView, 
  onViewChange,
  selectedAlbumId,
  onAlbumSelect,
  albums 
}: { 
  currentView: 'albums' | 'album-detail';
  onViewChange: (view: 'albums' | 'album-detail') => void;
  selectedAlbumId: string | null;
  onAlbumSelect: (albumId: string | null) => void;
  albums: Album[];
}) {
  const router = useRouter();
  
  return (
    <div className="w-64 h-full flex flex-col bg-stone-950 border-r border-stone-800/50">
      {/* Logo */}
      <div className="p-5 border-b border-stone-800/50">
        <Link href="/" className="flex items-center gap-3">
          <EVAOrb size={32} isSpeaking={false} />
          <span 
            className="text-stone-100 text-lg font-light"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Living Memory
          </span>
        </Link>
      </div>
      
      {/* Main Navigation */}
      <nav className="p-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'albums') {
                onAlbumSelect(null);
                onViewChange('albums');
              } else {
                router.push(item.href);
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all mb-1 ${
              item.active 
                ? 'bg-stone-800/70 text-stone-100' 
                : 'text-stone-400 hover:bg-stone-800/40 hover:text-stone-200'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      
      {/* Divider */}
      <div className="mx-5 my-2 border-t border-stone-800/50" />
      
      {/* Collections */}
      <div className="p-3">
        <p className="px-4 py-2 text-stone-500 text-xs uppercase tracking-wider font-medium">Collections</p>
        {COLLECTIONS.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-stone-400 hover:bg-stone-800/40 hover:text-stone-200 transition-all"
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      
      {/* Divider */}
      <div className="mx-5 my-2 border-t border-stone-800/50" />
      
      {/* Recent Albums */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="px-4 py-2 text-stone-500 text-xs uppercase tracking-wider font-medium">Recent Albums</p>
        {albums.slice(0, 5).map((album) => (
          <button
            key={album.id}
            onClick={() => {
              onAlbumSelect(album.id);
              onViewChange('album-detail');
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all mb-1 ${
              selectedAlbumId === album.id
                ? 'bg-stone-800/70 text-stone-100'
                : 'text-stone-400 hover:bg-stone-800/40 hover:text-stone-200'
            }`}
          >
            {album.coverUrl ? (
              <img src={album.coverUrl} alt="" className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center text-stone-600">
                📷
              </div>
            )}
            <span className="flex-1 text-left truncate">{album.title}</span>
          </button>
        ))}
      </div>
      
      {/* Storage / EVA */}
      <div className="p-4 border-t border-stone-800/50">
        <div className="flex items-center gap-3 px-2">
          <div className="flex-1">
            <p className="text-stone-400 text-xs">Storage</p>
            <div className="mt-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full" />
            </div>
            <p className="text-stone-500 text-[10px] mt-1">2.4 GB of 15 GB</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Album Grid Card (for albums list view)
function AlbumGridCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="cursor-pointer group"
    >
      {/* Cover Image */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-900 mb-3">
        {album.coverUrl ? (
          <img 
            src={album.coverUrl} 
            alt={album.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-600">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        
        {/* Film Ready Badge */}
        {album.videoUrl && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm flex items-center gap-1">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="text-white text-[10px] font-medium">Film</span>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      
      {/* Info */}
      <h3 className="text-stone-100 font-medium text-sm truncate">{album.title}</h3>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-stone-500 text-xs">{album.photoCount} items</p>
        {album.isShared && (
          <>
            <span className="text-stone-700">·</span>
            <p className="text-stone-500 text-xs">Shared</p>
          </>
        )}
      </div>
    </div>
  );
}

// Photo Grid Item (for album detail view - Google Photos style)
function PhotoGridItem({ 
  photo, 
  onClick 
}: { 
  photo: Photo; 
  onClick: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className="relative cursor-pointer group"
    >
      <div 
        className="relative overflow-hidden rounded-lg bg-stone-900"
        style={{ paddingBottom: `${photo.aspectRatio * 100}%` }}
      >
        <img 
          src={photo.url}
          alt={photo.title || 'Photo'}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-200 group-hover:brightness-90"
        />
        
        {/* Video/Animated indicator */}
        {(photo.status === 'film-ready' || photo.status === 'animated') && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm flex items-center gap-1">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="text-white text-[10px]">0:07</span>
          </div>
        )}
        
        {/* Contributor tag (like Google Photos name tags) */}
        {photo.contributor && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
            <div 
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-medium"
              style={{ backgroundColor: photo.contributorColor }}
            >
              {photo.contributor.charAt(0)}
            </div>
            <span className="text-white text-[11px]">{photo.contributor}</span>
          </div>
        )}
        
        {/* Needs story indicator */}
        {photo.status === 'needs-story' && (
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-amber-400" title="Needs story" />
        )}
        
        {/* Selection checkbox on hover */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 rounded-full bg-white/90 border-2 border-stone-300 flex items-center justify-center hover:bg-white">
            <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// Albums List View
function AlbumsListView({ 
  albums, 
  onAlbumSelect 
}: { 
  albums: Album[]; 
  onAlbumSelect: (albumId: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'my' | 'shared'>('all');
  
  const filteredAlbums = albums.filter(album => {
    if (filter === 'my') return !album.isShared;
    if (filter === 'shared') return album.isShared;
    return true;
  });
  
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-stone-950/95 backdrop-blur-sm z-10 px-8 py-6 border-b border-stone-800/50">
        <div className="flex items-center justify-between">
          <h1 
            className="text-2xl text-stone-100 font-light"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Albums
          </h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800/50 text-stone-300 text-sm hover:bg-stone-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create album
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 mt-4">
          {(['all', 'my', 'shared'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                filter === f
                  ? 'bg-stone-100 text-stone-900'
                  : 'bg-stone-800/50 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'my' ? 'My albums' : 'Shared with me'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Albums Grid */}
      <div className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredAlbums.map((album) => (
            <AlbumGridCard
              key={album.id}
              album={album}
              onClick={() => onAlbumSelect(album.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Album Detail View (Google Photos style)
function AlbumDetailView({ 
  onBack,
  onShowEVA 
}: { 
  onBack: () => void;
  onShowEVA: () => void;
}) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-stone-950/95 backdrop-blur-sm z-10 border-b border-stone-800/50">
        <div className="px-8 py-6">
          {/* Back button and title row */}
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="mt-1 p-2 -ml-2 rounded-full hover:bg-stone-800/50 text-stone-400 hover:text-stone-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            <div className="flex-1">
              <h1 
                className="text-2xl text-stone-100 font-light"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {CURRENT_ALBUM.title}
              </h1>
              <p className="text-stone-500 text-sm mt-1">{CURRENT_ALBUM.dateRange}</p>
              
              {/* Play highlights button + Members */}
              <div className="flex items-center gap-4 mt-4">
                {CURRENT_ALBUM.videoUrl && (
                  <button 
                    onClick={() => setIsVideoPlaying(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-800/70 text-stone-200 text-sm hover:bg-stone-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play film
                  </button>
                )}
                
                {/* Member avatars */}
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {CURRENT_ALBUM.members.slice(0, 5).map((member, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-stone-950 flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: member.color }}
                        title={member.name}
                      >
                        {member.initial}
                      </div>
                    ))}
                  </div>
                  <button className="ml-2 w-8 h-8 rounded-full border-2 border-dashed border-stone-600 flex items-center justify-center text-stone-500 hover:border-stone-400 hover:text-stone-300 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={onShowEVA}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 border border-cyan-500/30 text-cyan-300 text-sm hover:border-cyan-400/50 transition-colors"
              >
                <EVAOrb size={20} isSpeaking={false} />
                Ask EVA
              </button>
              <button className="p-2 rounded-full hover:bg-stone-800/50 text-stone-400 hover:text-stone-200 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Photo Grid - Masonry style */}
      <div className="p-8">
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {MOCK_PHOTOS.map((photo) => (
            <div key={photo.id} className="mb-4 break-inside-avoid">
              <PhotoGridItem
                photo={photo}
                onClick={() => {}}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Floating actions (like Google Photos) */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3">
        <button className="w-12 h-12 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 hover:bg-stone-700 transition-colors shadow-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        <button 
          onClick={onShowEVA}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
      </div>
      
      {/* Video Player Modal */}
      {isVideoPlaying && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setIsVideoPlaying(false)}
        >
          <div
            className="relative w-full max-w-5xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={CURRENT_ALBUM.videoUrl || '/remento.mp4'}
              controls
              autoPlay
              className="w-full rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setIsVideoPlaying(false)}
              className="absolute -top-12 right-0 text-stone-400 hover:text-stone-200 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Page Component
export default function AlbumWarmthPage() {
  const [currentView, setCurrentView] = useState<'albums' | 'album-detail'>('albums');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [showEVAModal, setShowEVAModal] = useState(false);
  
  const handleAlbumSelect = (albumId: string | null) => {
    setSelectedAlbumId(albumId);
    if (albumId) {
      setCurrentView('album-detail');
    }
  };
  
  return (
    <div 
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: '#1c1917' }}
    >
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedAlbumId={selectedAlbumId}
        onAlbumSelect={handleAlbumSelect}
        albums={MOCK_ALBUMS}
      />
      
      {/* Main Content */}
      {currentView === 'albums' ? (
        <AlbumsListView
          albums={MOCK_ALBUMS}
          onAlbumSelect={handleAlbumSelect}
        />
      ) : (
        <AlbumDetailView
          onBack={() => {
            setCurrentView('albums');
            setSelectedAlbumId(null);
          }}
          onShowEVA={() => setShowEVAModal(true)}
        />
      )}
      
      {/* EVA Modal */}
      {showEVAModal && (
        <EVACompanionModal onClose={() => setShowEVAModal(false)} />
      )}
    </div>
  );
}
