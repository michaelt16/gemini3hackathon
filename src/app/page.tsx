'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= 9) {
        video.currentTime = 0;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.currentTime = 0;

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  return (
    <main className="h-screen w-screen relative overflow-hidden bg-black">
      {/* Cinematic letterbox - top bar */}
      <div className="absolute top-0 left-0 right-0 h-[9vh] bg-black z-30" />

      {/* Logo Header - Centered vertically in letterbox bar */}
      <div className="absolute top-0 left-6 md:left-8 h-[9vh] flex items-center z-40 py-2">
        <Link href="/" className="group flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img
            src="/livingmemory.png"
            alt="Living Memory"
            className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain"
          />
        </Link>
      </div>

      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="metadata"
        className="absolute w-full h-full object-cover"
        style={{ top: '9.5vh', bottom: 0 }}
      >
        <source src="/remento.mp4" type="video/mp4" />
      </video>

      {/* Cinematic vignette overlay */}
      <div 
        className="absolute z-10 pointer-events-none"
        style={{
          top: '8.5vh',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.6) 100%)'
        }}
      />

      {/* Film grain texture */}
      <div 
        className="absolute z-20 pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{
          top: '9.5vh',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Dark gradient for text readability */}
      <div 
        className="absolute inset-0 z-15 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)'
        }}
      />

      {/* EVA Ambient Effects - Behind content */}
      <div className="absolute inset-0 z-15 pointer-events-none overflow-hidden">
        {/* Aurora glow behind title area */}
        <div 
          className="absolute left-0 bottom-[15vh] w-[600px] h-[400px] opacity-40 animate-pulse"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.4) 0%, rgba(16,185,129,0.2) 40%, transparent 70%)',
            filter: 'blur(60px)',
            animationDuration: '4s'
          }}
        />
        {/* Secondary glow */}
        <div 
          className="absolute left-[100px] bottom-[25vh] w-[300px] h-[300px] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)',
            filter: 'blur(50px)',
            animation: 'float 8s ease-in-out infinite'
          }}
        />
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${3 + (i % 4) * 2}px`,
              height: `${3 + (i % 4) * 2}px`,
              left: `${5 + (i * 7) % 40}%`,
              bottom: `${15 + (i * 11) % 35}vh`,
              background: i % 3 === 0 
                ? 'rgba(6,182,212,0.6)' 
                : i % 3 === 1 
                  ? 'rgba(16,185,129,0.5)' 
                  : 'rgba(139,92,246,0.4)',
              boxShadow: `0 0 ${10 + i * 2}px currentColor`,
              animation: `float ${6 + (i % 4) * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              opacity: 0.7
            }}
          />
        ))}
        {/* Subtle orbital ring hint */}
        <div 
          className="absolute left-[50px] bottom-[20vh] w-[500px] h-[200px] opacity-20"
          style={{
            border: '1px solid rgba(6,182,212,0.3)',
            borderRadius: '50%',
            transform: 'rotateX(70deg) rotateZ(-15deg)',
            animation: 'spin 20s linear infinite'
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-20 h-full flex flex-col justify-end pb-[10vh] px-8 md:px-16 lg:px-24">
        
        {/* Title Block - Cinematic left-aligned */}
        <div className="max-w-3xl relative">
          {/* Pre-title / Studio line */}
          <p 
            className="text-white/60 text-xs md:text-sm tracking-[0.4em] uppercase mb-4 md:mb-6 animate-fade-in-up"
            style={{ 
              fontFamily: 'var(--font-lora), Georgia, serif', 
              animationDelay: '0.2s',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)'
            }}
          >
            Preserve what matters most
          </p>
          
          {/* Main Title - EVA in orb colors */}
          <div className="animate-fade-in-up relative" style={{ animationDelay: '0.5s' }}>
            {/* Glow layer behind text */}
            <div 
              className="absolute inset-0 blur-2xl opacity-60"
              style={{
                background: 'linear-gradient(90deg, rgba(34,211,238,0.4), rgba(6,182,212,0.3), rgba(16,185,129,0.3))',
                transform: 'scale(1.1)'
              }}
            />
            <h1 
              className="relative text-[8rem] md:text-[12rem] lg:text-[15rem] xl:text-[18rem] font-extralight leading-[0.75] tracking-[-0.02em] bg-clip-text text-transparent"
              style={{ 
                fontFamily: 'var(--font-crimson), Georgia, serif',
                backgroundImage: 'linear-gradient(90deg, #22d3ee, #06b6d4, #10b981)',
                WebkitBackgroundClip: 'text',
              }}
            >
              EVA
            </h1>
          </div>
          
          {/* Subtitle */}
          <div className="flex items-center gap-4 mt-4 md:mt-6 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="w-12 md:w-16 h-px bg-gradient-to-r from-cyan-400/60 to-transparent" />
            <p 
              className="text-white/80 text-xl md:text-2xl lg:text-3xl italic font-light tracking-wide"
              style={{ 
                fontFamily: 'var(--font-crimson), Georgia, serif',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
              }}
            >
              Living Memory
            </p>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-8 mt-12 md:mt-16 animate-fade-in-up" style={{ animationDelay: '1.1s' }}>
            <Link 
              href="/intro"
              className="group flex items-center gap-3 px-8 py-4 bg-cyan-500/10 backdrop-blur-sm border border-cyan-400/30 text-white text-sm md:text-base tracking-[0.2em] uppercase hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              <span>Begin</span>
              <svg 
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            
            <Link 
              href="/album"
              className="text-white/50 text-sm md:text-base tracking-[0.2em] uppercase hover:text-cyan-300/80 transition-colors"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              Skip
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
