'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUserName } from '@/hooks/use-user-name';
import { useTheme } from '@/contexts/ThemeContext';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });
const EVACompanionModal = dynamic(() => import('@/components/EVACompanionModal'), { ssr: false });

// ============================================================================
// MEMORIES DATA - Positioned around the edges, not overlapping center
// ============================================================================

const FLOATING_MEMORIES = [
  // Left side
  { id: 1, url: '/testphoto.jpg', quote: '"I remember this day so clearly..."', author: 'Mom', x: 3, y: 12, size: 160, rotation: -8, floatDelay: 0 },
  { id: 2, url: '/pic4.PNG', quote: '"Emma found that huge shell"', author: 'You', x: 5, y: 55, size: 130, rotation: 5, floatDelay: 1.5 },
  
  // Right side  
  { id: 3, url: '/pic2.PNG', quote: '"Grandpa told his famous story"', author: 'Sarah', x: 78, y: 8, size: 145, rotation: 6, floatDelay: 0.8 },
  { id: 4, url: '/pic3.PNG', quote: '"The best picnic ever"', author: 'Dad', x: 80, y: 50, size: 135, rotation: -4, floatDelay: 2 },
  
  // Bottom corners
  { id: 5, url: '/pic5.jpg', quote: '"Everyone was laughing"', author: 'Mom', x: 8, y: 78, size: 120, rotation: 7, floatDelay: 0.5 },
  { id: 6, url: '/pic6.jpg', quote: '"Her first birthday cake"', author: 'Dad', x: 75, y: 80, size: 115, rotation: -6, floatDelay: 1.2 },
];

const FAMILY = [
  { name: 'Mom', color: '#fbbf24', stories: 12 },
  { name: 'Dad', color: '#34d399', stories: 8 },
  { name: 'Sarah', color: '#f472b6', stories: 5 },
  { name: 'Emma', color: '#a78bfa', stories: 2 },
];

const RECENT_ACTIVITY = [
  {
    id: 1,
    type: 'perspective',
    member: { name: 'Mom', color: '#fbbf24' },
    action: 'shared a memory',
    content: '"I remember when your father proposed right by that lake. We were so young..."',
    album: 'Summer Reunion',
    albumId: 'mock-1',
    timeAgo: '2 hours ago',
    photoUrl: '/testphoto.jpg',
  },
  {
    id: 2,
    type: 'question',
    member: { name: 'Emma', color: '#a78bfa' },
    action: 'asked about a photo',
    content: '"Who is the man in the blue shirt? I don\'t recognize him."',
    album: 'Christmas 2023',
    albumId: 'mock-3',
    timeAgo: '5 hours ago',
    photoUrl: '/pic2.PNG',
  },
  {
    id: 3,
    type: 'story',
    member: { name: 'Dad', color: '#34d399' },
    action: 'recorded a story',
    content: 'About the camping trip and the bear encounter',
    album: 'Summer Adventures',
    albumId: 'mock-4',
    timeAgo: 'Yesterday',
    photoUrl: '/pic3.PNG',
  },
  {
    id: 4,
    type: 'perspective',
    member: { name: 'Sarah', color: '#f472b6' },
    action: 'added her perspective',
    content: '"This was my favorite birthday. I still have that dress somewhere!"',
    album: 'Birthday Party',
    albumId: 'mock-7',
    timeAgo: '2 days ago',
    photoUrl: '/pic6.jpg',
  },
];

const FEATURED_ALBUMS = [
  { id: 'mock-1', title: 'Summer Reunion', cover: '/testphoto.jpg', perspectives: 12, hasFilm: true, stackImages: ['/testphoto.jpg', '/pic2.PNG', '/pic3.PNG'], quote: '"I remember this day so clearly..."', author: 'Mom' },
  { id: 'mock-3', title: 'Christmas 2023', cover: '/pic2.PNG', perspectives: 8, hasFilm: true, stackImages: ['/pic2.PNG', '/pic5.jpg', '/testphoto.jpg'], quote: '"Grandpa told the funniest joke"', author: 'Sarah' },
  { id: 'mock-5', title: 'Beach Day', cover: '/pic4.PNG', perspectives: 5, hasFilm: false, stackImages: ['/pic4.PNG', '/pic6.jpg', '/pic3.PNG'], quote: '"Emma built an amazing sandcastle"', author: 'Mom' },
];

// Stacked Album Card Component
function StackedAlbumCard({ album, isDark }: { album: typeof FEATURED_ALBUMS[0]; isDark: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Link 
      href={`/album/${album.id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Stacked photos effect */}
      <div className="relative mx-auto" style={{ height: '300px', width: '240px' }}>
        {/* Back cards */}
        {album.stackImages?.slice(1, 3).reverse().map((img, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 w-[200px] h-[260px] rounded-lg overflow-hidden shadow-xl transition-all duration-500"
            style={{
              transform: isHovered 
                ? `translate(-50%, -50%) rotate(${(i - 1) * 12}deg) translateX(${(i - 1) * 35}px)`
                : `translate(-50%, -50%) rotate(${(i - 1) * 4}deg)`,
              zIndex: i,
              background: 'linear-gradient(145deg, #fefefe 0%, #e8e8e8 100%)',
              padding: '6px 6px 32px 6px',
            }}
          >
            <img src={img} alt="" className="w-full h-full object-cover rounded-sm" />
          </div>
        ))}
        
        {/* Front card */}
        <div
          className="absolute left-1/2 top-1/2 w-[200px] h-[260px] rounded-lg overflow-hidden shadow-2xl transition-all duration-500"
          style={{
            transform: isHovered 
              ? 'translate(-50%, -50%) rotate(3deg) scale(1.05)' 
              : 'translate(-50%, -50%) rotate(2deg)',
            zIndex: 10,
            background: 'linear-gradient(145deg, #fefefe 0%, #e8e8e8 100%)',
            padding: '6px 6px 32px 6px',
          }}
        >
          <img src={album.cover} alt={album.title} className="w-full h-full object-cover rounded-sm" />
          
          {album.hasFilm && (
            <div 
              className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
            >
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              <span className="text-[10px] text-white font-medium">Film</span>
            </div>
          )}
        </div>
        
        {/* Glow effect */}
        <div 
          className={`absolute left-1/2 top-1/2 w-[260px] h-[320px] -translate-x-1/2 -translate-y-1/2 rounded-3xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: isDark ? 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(14,116,144,0.25) 0%, transparent 70%)', filter: 'blur(20px)', zIndex: 0 }}
        />
      </div>
      
      {/* Info */}
      <div className="text-center mt-4">
        <h3 className={`text-xl font-light transition-colors ${isDark ? 'text-white group-hover:text-cyan-300' : 'text-gray-900 group-hover:text-cyan-700'}`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
          {album.title}
        </h3>
        <p className={`text-sm mt-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{album.perspectives} perspectives</p>
        {album.quote && (
          <p className={`text-sm italic mt-2 max-w-[220px] mx-auto ${isDark ? 'text-white/50' : 'text-gray-500'}`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
            {album.quote}
          </p>
        )}
      </div>
    </Link>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function HomePage() {
  const { userName } = useUserName();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showEvaModal, setShowEvaModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeMemory, setActiveMemory] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  const totalStories = FAMILY.reduce((a, f) => a + f.stories, 0);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
      onMouseMove={handleMouseMove}
    >
      {/* ================================================================== */}
      {/* AMBIENT BACKGROUND - Dreamy gradients */}
      {/* ================================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Main ambient orb - follows mouse subtly */}
        <div 
          className="absolute w-[1000px] h-[1000px] rounded-full transition-all duration-[2000ms] ease-out"
          style={{ 
            background: isDark
              ? 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 40%, transparent 70%)'
              : 'radial-gradient(circle, rgba(14,116,144,0.18) 0%, rgba(14,116,144,0.07) 40%, transparent 70%)',
            left: `${30 + mousePos.x * 20}%`,
            top: `${20 + mousePos.y * 20}%`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(60px)',
          }}
        />
        
        {/* Secondary warm orb */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full transition-all duration-[2500ms] ease-out"
          style={{ 
            background: isDark
              ? 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(180,140,60,0.14) 0%, transparent 60%)',
            right: `${5 + (1 - mousePos.x) * 15}%`,
            bottom: `${10 + (1 - mousePos.y) * 15}%`,
            filter: 'blur(80px)',
          }}
        />

        {/* Subtle purple accent */}
        <div 
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{ 
            background: isDark
              ? 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 60%)',
            left: '60%',
            top: '70%',
            filter: 'blur(60px)',
          }}
        />

        {/* Starfield dots - dark mode: white, light mode: golden warm sparkles */}
        {/* Uses deterministic positions to avoid SSR hydration mismatch */}
        <div className="absolute inset-0">
          {[
            [54,50,3.0,3.1],[88,15,2.2,6.8],[48,86,3.7,3.6],[70,24,1.7,4.2],[75,69,2.3,5.9],
            [20,74,0.4,4.9],[83,83,3.6,6.4],[33,52,0.8,3.6],[50,62,0.1,5.5],[54,57,1.2,6.1],
            [81,66,3.8,6.8],[84,48,2.9,3.4],[49,22,0.2,3.8],[44,90,2.9,5.5],[82,43,3.2,4.3],
            [45,17,1.4,4.4],[59,59,2.5,4.2],[31,22,1.9,5.4],[79,85,3.9,5.0],[56,22,0.1,5.0],
            [76,75,3.6,4.3],[88,14,3.0,6.4],[66,7,4.7,6.1],[9,14,4.1,4.7],[68,1,3.2,6.3],
            [33,94,0.5,6.0],[16,48,4.2,5.2],[100,1,1.6,5.6],[59,50,1.8,5.3],[99,28,2.8,5.8],
          ].map(([x, y, delay, dur], i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-twinkle"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${dur}s`,
                backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(160,130,80,0.3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* FLOATING MEMORIES - Around the edges */}
      {/* ================================================================== */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {FLOATING_MEMORIES.map((memory) => (
          <div
            key={memory.id}
            className={`absolute transition-all duration-1000 pointer-events-auto cursor-pointer ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              left: `${memory.x + (mousePos.x - 0.5) * 4}%`,
              top: `${memory.y + (mousePos.y - 0.5) * 4}%`,
              width: memory.size,
              transitionDelay: `${memory.floatDelay * 0.3}s`,
              zIndex: activeMemory === memory.id ? 100 : 10,
              animation: isLoaded ? `float-${memory.id % 3} ${6 + memory.id}s ease-in-out ${memory.floatDelay}s infinite` : 'none',
            }}
            onMouseEnter={() => setActiveMemory(memory.id)}
            onMouseLeave={() => setActiveMemory(null)}
          >
            {/* Polaroid card */}
            <div 
              className={`relative rounded-sm transition-all duration-500 ${
                activeMemory === memory.id 
                  ? 'scale-125 shadow-cyan-500/30 rotate-0' 
                  : 'hover:scale-110'
              }`}
              style={{ 
                background: isDark 
                  ? 'linear-gradient(145deg, #fefefe 0%, #f0f0f0 100%)'
                  : 'linear-gradient(145deg, #ffffff 0%, #f5f0e6 100%)',
                padding: '6px 6px 28px 6px',
                transform: activeMemory === memory.id ? 'rotate(0deg)' : `rotate(${memory.rotation}deg)`,
                boxShadow: isDark 
                  ? '0 25px 50px -12px rgba(0,0,0,0.6)'
                  : '0 10px 40px -8px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              {/* Photo */}
              <div className="overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <img 
                  src={memory.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Tape effect on top */}
              <div 
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 opacity-60"
                style={{ 
                  background: isDark
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(200,200,180,0.6) 100%)'
                    : 'linear-gradient(180deg, rgba(210,200,180,0.7) 0%, rgba(180,170,150,0.5) 100%)',
                  transform: `translateX(-50%) rotate(${-memory.rotation * 0.5}deg)`,
                }}
              />
            </div>
            
            {/* Quote tooltip */}
            <div 
              className={`absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all duration-300 ${
                activeMemory === memory.id ? 'opacity-100 -bottom-10' : 'opacity-0 -bottom-6'
              }`}
              style={{ 
                background: 'rgba(0,0,0,0.9)',
                color: 'white',
                fontFamily: 'var(--font-crimson), Georgia, serif',
                fontStyle: 'italic',
                backdropFilter: 'blur(10px)',
              }}
            >
              {memory.quote} <span className="text-cyan-400">— {memory.author}</span>
            </div>

            {/* Glow effect on hover */}
            <div 
              className={`absolute inset-0 rounded-sm transition-opacity duration-500 pointer-events-none ${
                activeMemory === memory.id ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                boxShadow: isDark 
                  ? '0 0 60px 20px rgba(6,182,212,0.3)'
                  : '0 0 50px 15px rgba(14,116,144,0.35)',
                zIndex: -1,
              }}
            />
          </div>
        ))}
      </div>

      {/* ================================================================== */}
      {/* CENTER CONTENT - Clear zone, high z-index */}
      {/* ================================================================== */}
      <div 
        className="relative h-screen flex flex-col items-center justify-center px-6"
        style={{ zIndex: 50 }}
      >
        {/* Main content wrapper with backdrop for readability */}
        <div 
          className={`text-center max-w-2xl transition-all duration-1000 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* EVA Orb - Large and central */}
          <div className="relative mb-8 inline-block">
            <EVAOrb size={120} isSpeaking={false} onClick={() => setShowEvaModal(true)} />
            
            {/* Online status */}
            <div 
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-4 flex items-center justify-center"
              style={{ borderColor: 'var(--bg-primary)' }}
            >
              <div className="absolute inset-1 rounded-full bg-green-400 animate-ping opacity-75" />
            </div>
          </div>

          {/* EVA Label */}
          <p className={`text-sm tracking-[0.3em] uppercase mb-4 font-medium ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
            EVA · Memory Companion
          </p>
          
          {/* Main Greeting */}
          <h1 
            className={`text-4xl md:text-5xl lg:text-6xl font-light leading-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Hello, {userName}
          </h1>
          
          {/* Subtext */}
          <p className={`text-lg md:text-xl mb-10 leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Your family has preserved <span className={isDark ? 'text-white' : 'text-gray-900'}>{totalStories} stories</span> together.
            <br className="hidden md:block" />
            Ready to add another?
          </p>

          {/* Primary CTA */}
          <button
            onClick={() => setShowEvaModal(true)}
            className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-full text-white font-medium text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/30"
            style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            
            <svg className="w-6 h-6 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span className="relative">Talk to EVA</span>
          </button>

          {/* Family avatars */}
          <div 
            className={`flex items-center justify-center gap-4 mt-12 transition-all duration-1000 delay-500 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex -space-x-3">
              {FAMILY.map((member) => (
                <div
                  key={member.name}
                  className="w-11 h-11 rounded-full border-3 flex items-center justify-center text-white text-sm font-medium shadow-lg transition-transform hover:scale-110 hover:z-10 cursor-pointer"
                  style={{ backgroundColor: member.color, borderColor: 'var(--bg-primary)' }}
                  title={`${member.name} · ${member.stories} stories`}
                >
                  {member.name[0]}
                </div>
              ))}
            </div>
            <Link 
              href="/family"
              className={`text-sm transition-colors ${isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {FAMILY.length} family members →
            </Link>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SCROLL INDICATOR */}
      {/* ================================================================== */}
      <div 
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-center transition-all duration-1000 delay-700 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 50 }}
      >
        <p className={`text-sm mb-3 ${isDark ? 'text-white/40' : 'text-[#6b5e4e]'}`}>See what your family has been sharing</p>
        <div className={`w-6 h-10 rounded-full border-2 mx-auto flex justify-center pt-2 ${isDark ? 'border-white/20' : 'border-[#b0a490]'}`}>
          <div className={`w-1.5 h-3 rounded-full animate-bounce ${isDark ? 'bg-white/40' : 'bg-[#9a8b72]'}`} />
        </div>
      </div>

      {/* ================================================================== */}
      {/* BELOW THE FOLD - Family Activity */}
      {/* ================================================================== */}
      <div className="relative" style={{ zIndex: 30 }}>
        {/* Continued ambient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute w-[800px] h-[800px] rounded-full"
            style={{ 
              background: isDark
                ? 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(14,116,144,0.12) 0%, transparent 60%)',
              left: '-20%',
              top: '20%',
              filter: 'blur(80px)',
            }}
          />
          <div 
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{ 
              background: isDark
                ? 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)',
              right: '-10%',
              top: '50%',
              filter: 'blur(80px)',
            }}
          />
          <div 
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{ 
              background: isDark
                ? 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(180,140,60,0.08) 0%, transparent 60%)',
              left: '30%',
              bottom: '10%',
              filter: 'blur(80px)',
            }}
          />
        </div>

        <div className="relative px-6 md:px-10 pt-20 pb-24">
          <div className="max-w-5xl mx-auto">
            
            {/* Section Header */}
            <div className="text-center mb-16">
              <p className={`text-sm tracking-[0.3em] uppercase mb-4 ${isDark ? 'text-cyan-400/60' : 'text-cyan-700/60'}`}>What's Happening</p>
              <h2 
                className={`text-4xl md:text-5xl font-light mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Family Stories
              </h2>
              <p className={`text-lg ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Memories being preserved by your loved ones</p>
            </div>

            {/* Activity Feed - Immersive Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className={`absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b ${isDark ? 'from-cyan-500/50 via-cyan-500/20' : 'from-teal-600/50 via-teal-600/20'} to-transparent`} />
              
              <div className="space-y-12">
                {RECENT_ACTIVITY.map((activity, index) => (
                  <div 
                    key={activity.id}
                    className={`relative flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                  >
                    {/* Timeline dot */}
                    <div 
                      className={`absolute left-6 md:left-1/2 w-3 h-3 rounded-full transform -translate-x-1/2 mt-8 z-10 ${isDark ? 'bg-cyan-400' : 'bg-teal-600'}`}
                      style={{ boxShadow: isDark ? '0 0 12px rgba(34,211,238,0.5)' : '0 0 14px rgba(13,148,136,0.6), 0 0 4px rgba(13,148,136,0.3)' }}
                    >
                      <div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${isDark ? 'bg-cyan-400' : 'bg-teal-600'}`} />
                    </div>
                    
                    {/* Spacer for timeline */}
                    <div className="hidden md:block md:w-1/2" />
                    
                    {/* Card */}
                    <div className={`ml-12 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pl-12' : 'md:pr-12'}`}>
                      <Link
                        href={`/album/${activity.albumId}`}
                        className="group block"
                      >
                        <div 
                          className="relative rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl"
                          style={{ 
                            background: isDark 
                              ? 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                              : '#ffffff',
                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                            boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
                            borderRadius: '16px',
                          }}
                        >
                          {/* Photo header */}
                          <div className="relative h-48 overflow-hidden">
                            <img 
                              src={activity.photoUrl}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0" style={{ background: isDark ? 'linear-gradient(to top, #0d0b09, transparent)' : 'linear-gradient(to top, #ffffff, transparent)' }} />
                            
                            {/* Avatar floating on image */}
                            <div 
                              className={`absolute bottom-4 left-4 w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl shadow-xl ring-4 ${isDark ? 'ring-[#0d0b09]' : 'ring-white'}`}
                              style={{ backgroundColor: activity.member.color }}
                            >
                              {activity.member.name[0]}
                            </div>
                            
                            {/* Time badge */}
                            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs text-white/70 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.5)' }}>
                              {activity.timeAgo}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{activity.member.name}</span>
                              <span className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{activity.action}</span>
                            </div>
                            
                            {/* Quote */}
                            <p 
                              className={`text-xl leading-relaxed mb-4 ${isDark ? 'text-white/80' : 'text-gray-700'}`}
                              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                            >
                              {activity.content}
                            </p>
                            
                            {/* Album link */}
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${isDark ? 'text-white/30' : 'text-gray-500'}`}>in {activity.album}</span>
                              <span className={`text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                                View →
                              </span>
                            </div>
                          </div>
                          
                          {/* Hover glow effect */}
                          <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                            style={{ 
                              boxShadow: isDark
                                ? '0 0 60px rgba(6,182,212,0.2), inset 0 0 0 1px rgba(6,182,212,0.3)'
                                : '0 0 50px rgba(14,116,144,0.2), inset 0 0 0 1px rgba(14,116,144,0.35)',
                            }}
                          />
                        </div>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Albums Section - Stacked Polaroids */}
            <div className="mt-32 mb-12 text-center">
              <div className="flex items-center gap-4 justify-center mb-3">
                <div className={`h-px w-16 bg-gradient-to-r from-transparent ${isDark ? 'to-cyan-500/50' : 'to-teal-600/50'}`} />
                <p className={`text-sm tracking-[0.3em] uppercase ${isDark ? 'text-cyan-400/60' : 'text-teal-700/70'}`}>Explore</p>
                <div className={`h-px w-16 bg-gradient-to-l from-transparent ${isDark ? 'to-cyan-500/50' : 'to-teal-600/50'}`} />
              </div>
              <h2 
                className={`text-4xl md:text-5xl font-light mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Memory Collections
              </h2>
              <p className={`text-lg ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Albums with stories waiting to be told</p>
            </div>

            <div className="flex flex-wrap justify-center gap-12 md:gap-16">
              {FEATURED_ALBUMS.map((album) => (
                <StackedAlbumCard key={album.id} album={album} isDark={isDark} />
              ))}
            </div>

            {/* View All CTA */}
            <div className="text-center mt-16">
              <Link
                href="/album"
                className={`group inline-flex items-center gap-3 px-10 py-5 rounded-full font-medium text-lg transition-all duration-300 hover:scale-105 ${
                  isDark 
                    ? 'text-white hover:shadow-xl hover:shadow-cyan-500/20' 
                    : 'text-cyan-800 hover:shadow-xl hover:shadow-cyan-600/15'
                }`}
                style={{ 
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(14,116,144,0.12) 0%, rgba(14,116,144,0.06) 100%)',
                  border: isDark ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(14,116,144,0.25)',
                }}
              >
                Explore All Albums
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* EVA Modal */}
      <EVACompanionModal 
        isOpen={showEvaModal} 
        onClose={() => setShowEvaModal(false)} 
      />

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes float-0 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.5); }
        }
        .animate-twinkle {
          animation: twinkle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
