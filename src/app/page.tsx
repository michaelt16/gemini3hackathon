'use client';

import Link from 'next/link';
import Image from 'next/image';
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
          <Image
            src="/livingmemory.png"
            alt="Living Memory"
            width={120}
            height={120}
            className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain"
            priority
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

      {/* Content Layer */}
      <div className="relative z-20 h-full flex flex-col justify-end pb-[16vh] px-8 md:px-16 lg:px-24">
        
        {/* Main Title - Large, cinematic */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h1 
            className="text-[4rem] md:text-[7rem] lg:text-[9rem] xl:text-[11rem] font-light text-white leading-[0.85] tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Living
            <br />
            <span className="italic font-normal">Memory</span>
          </h1>
        </div>

        {/* Tagline - Simple, elegant */}
        <p 
          className="text-white/70 text-lg md:text-xl lg:text-2xl mt-6 md:mt-8 max-w-md font-light tracking-wide animate-fade-in-up"
          style={{ animationDelay: '0.6s' }}
        >
          Preserve what matters most.
        </p>

        {/* CTA - Minimal, inline */}
        <div 
          className="flex items-center gap-6 mt-10 md:mt-12 animate-fade-in-up"
          style={{ animationDelay: '0.9s' }}
        >
          <Link 
            href="/capture"
            className="group flex items-center gap-3 text-white text-sm md:text-base tracking-widest uppercase hover:text-white/80 transition-colors"
          >
            <span>Enter</span>
            <svg 
              className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          
          <span className="text-white/30">|</span>
          
          <Link 
            href="/album"
            className="text-white/50 text-sm md:text-base tracking-widest uppercase hover:text-white/80 transition-colors"
          >
            Browse Album
          </Link>
        </div>
      </div>
    </main>
  );
}
