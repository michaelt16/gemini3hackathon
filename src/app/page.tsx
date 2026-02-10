'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

// ============================================================================
// ANIMATION VIDEOS — cycles pic1 → pic9 → pic1 …
// ============================================================================

const HERO_VIDEOS = [
  '/animations/pic1.mp4',
  '/animations/pic2.mp4',
  '/animations/pic3.mp4',
  '/animations/pic4.mp4',
  '/animations/pic5.mp4',
  '/animations/pic6.mp4',
  '/animations/pic7.mp4',
  '/animations/pic8.mp4',
  '/animations/pic9.mp4',
];

function HeroBackground() {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const indexRef = useRef(0);

  // Advance to the next video in the cycle
  const advance = useCallback(() => {
    indexRef.current = (indexRef.current + 1) % HERO_VIDEOS.length;
    const nextSrc = HERO_VIDEOS[indexRef.current];

    if (activeSlot === 'A') {
      // Load next into B, crossfade A→B
      const vb = videoBRef.current;
      if (vb) {
        vb.src = nextSrc;
        vb.load();
        vb.play().catch(() => {});
      }
      setActiveSlot('B');
    } else {
      // Load next into A, crossfade B→A
      const va = videoARef.current;
      if (va) {
        va.src = nextSrc;
        va.load();
        va.play().catch(() => {});
      }
      setActiveSlot('A');
    }
  }, [activeSlot]);

  // Start the first video on mount
  useEffect(() => {
    const va = videoARef.current;
    if (va) {
      va.src = HERO_VIDEOS[0];
      va.load();
      va.play().catch(() => {});
    }
  }, []);

  // Listen for "ended" on whichever slot is active
  useEffect(() => {
    const activeVideo = activeSlot === 'A' ? videoARef.current : videoBRef.current;
    if (!activeVideo) return;
    const onEnded = () => advance();
    activeVideo.addEventListener('ended', onEnded);
    return () => activeVideo.removeEventListener('ended', onEnded);
  }, [activeSlot, advance]);

  return (
    <>
      <video
        ref={videoARef}
        muted
        playsInline
        preload="auto"
        className="absolute left-0 right-0 bottom-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
        style={{
          top: '8vh',
          filter: 'brightness(0.35) saturate(0.6)',
          opacity: activeSlot === 'A' ? 1 : 0,
        }}
      />
      <video
        ref={videoBRef}
        muted
        playsInline
        preload="auto"
        className="absolute left-0 right-0 bottom-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
        style={{
          top: '8vh',
          filter: 'brightness(0.35) saturate(0.6)',
          opacity: activeSlot === 'B' ? 1 : 0,
        }}
      />
    </>
  );
}

// ============================================================================
// SCROLL REVEAL
// ============================================================================

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <div className={className}>{children}</div>;
}

// ============================================================================
// PAGE
// ============================================================================

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <main className="bg-[#111113] text-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* ================================================================ */}
      {/* HERO — Sticky so mission slides over it like a book page         */}
      {/* ================================================================ */}
      <section className="relative h-screen overflow-hidden bg-black">

        {/* Letterbox top bar */}
        <div className="absolute top-0 left-0 right-0 h-[8vh] bg-black z-30" />

        {/* Google logo — top left, inside letterbox */}
        <div className="absolute top-0 left-0 h-[8vh] flex items-center px-6 md:px-10 z-40">
          <svg className="w-[72px] h-[24px] opacity-70" viewBox="0 0 74 24" fill="none">
            <path d="M9.24 8.19v2.46h5.88c-.18 1.38-.64 2.39-1.34 3.1-.86.86-2.2 1.8-4.54 1.8-3.62 0-6.45-2.92-6.45-6.54s2.83-6.54 6.45-6.54c1.95 0 3.38.77 4.43 1.76L15.4 2.5C13.94 1.08 11.98 0 9.24 0 4.28 0 .11 4.04.11 9s4.17 9 9.13 9c2.68 0 4.7-.88 6.28-2.52 1.62-1.62 2.13-3.91 2.13-5.75 0-.57-.04-1.1-.13-1.54H9.24z" fill="#fff"/>
            <path d="M25 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z" fill="#fff"/>
            <path d="M53.58 7.49h-.09c-.57-.68-1.67-1.3-3.06-1.3C47.53 6.19 45 8.72 45 12c0 3.26 2.53 5.81 5.43 5.81 1.39 0 2.49-.62 3.06-1.32h.09v.81c0 2.22-1.19 3.41-3.1 3.41-1.56 0-2.53-1.12-2.93-2.07l-2.22.92c.64 1.54 2.33 3.43 5.15 3.43 2.99 0 5.52-1.76 5.52-6.05V6.49h-2.42v1zm-2.93 8.03c-1.76 0-3.1-1.5-3.1-3.52 0-2.05 1.34-3.52 3.1-3.52 1.74 0 3.1 1.5 3.1 3.54 0 2.02-1.36 3.5-3.1 3.5z" fill="#fff"/>
            <path d="M38.25 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z" fill="#fff"/>
            <path d="M58 .24h2.51v17.57H58z" fill="#fff"/>
            <path d="M68.26 15.52c-1.3 0-2.22-.59-2.82-1.76l7.77-3.21-.26-.66c-.48-1.3-1.96-3.7-4.97-3.7-2.99 0-5.48 2.35-5.48 5.81 0 3.26 2.46 5.81 5.76 5.81 2.66 0 4.2-1.63 4.84-2.57l-1.98-1.32c-.66.96-1.56 1.6-2.86 1.6zm-.18-7.15c1.03 0 1.91.53 2.2 1.28l-5.25 2.17c0-2.44 1.73-3.45 3.05-3.45z" fill="#fff"/>
          </svg>
        </div>

        {/* Sign in — top right */}
        <div className="absolute top-0 right-0 h-[8vh] flex items-center px-6 md:px-10 z-40">
          <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
            Sign in
          </Link>
        </div>

        {/* Animated photo slideshow background — pic1→9 crossfading loop */}
        <HeroBackground />

        {/* Cinematic vignette */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)' }}
        />

        {/* Dark gradient for bottom-left text readability */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 30%, transparent 60%)' }}
        />

        {/* Title block — bottom left, calligraphy style */}
        <div
          className="absolute z-20 bottom-0 left-0 px-8 md:px-16 lg:px-24 pb-[10vh]"
          style={{
            opacity: Math.max(0, 1 - scrollY / 500),
            transform: `translateY(${scrollY * 0.25}px)`,
          }}
        >
          {/* Logo mark + Pre-title */}
          <Image
            src="/livingmemory.png"
            alt="Living Memory"
            width={180}
            height={180}
            className="mb-5 animate-fade-in-up object-contain"
            style={{ animationDelay: '0.1s' }}
            priority
          />

          {/* Pre-title */}
          <p
            className="text-white/40 text-xs md:text-sm tracking-[0.35em] uppercase mb-5 animate-fade-in-up"
            style={{ animationDelay: '0.3s', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
          >
            Preserve what matters most
          </p>

          {/* Main title — serif calligraphy, two lines */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <h1
              className="text-[4rem] md:text-[6rem] lg:text-[7.5rem] xl:text-[8.5rem] font-extralight leading-[0.85] tracking-[-0.02em]"
              style={{
                fontFamily: 'var(--font-crimson), Georgia, serif',
                textShadow: '0 4px 40px rgba(0,0,0,0.6)',
              }}
            >
              Living<br />Memory
            </h1>
          </div>

          {/* Subtitle line */}
          <div className="flex items-center gap-4 mt-5 md:mt-7 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="w-10 md:w-14 h-px bg-white/20" />
            <p
              className="text-white/50 text-base md:text-lg font-light italic"
              style={{
                fontFamily: 'var(--font-crimson), Georgia, serif',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              Where your family stories become forever
            </p>
          </div>

          {/* CTA */}
          <div className="mt-10 md:mt-14 animate-fade-in-up" style={{ animationDelay: '1.1s' }}>
            <Link
              href="/intro"
              className="inline-flex items-center gap-3 px-7 py-3.5 bg-white text-[#0a0a0a] rounded-full text-sm font-medium hover:bg-white/90 transition-all active:scale-[0.97]"
            >
              Get started
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Scroll cue — bottom right */}
        <div
          className="absolute bottom-8 right-8 md:right-16 z-20"
          style={{ opacity: Math.max(0, 1 - scrollY / 200) }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-white/20 text-[10px] tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-5 h-8 rounded-full border border-white/15 flex justify-center pt-1.5">
              <div className="w-0.5 h-2 bg-white/30 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* MISSION STATEMENT — full screen, immersive                       */}
      {/* ================================================================ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 bg-[#111113]">
        {/* Top edge shadow to sell the "page over hero" effect */}
        <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)' }} />
        <div className="max-w-3xl mx-auto text-center py-24">
          <Reveal>
            <Image
              src="/livingmemory.png"
              alt="Living Memory"
              width={140}
              height={140}
              className="mx-auto mb-12 object-contain"
            />
          </Reveal>
          <Reveal delay={100}>
            <p className="text-xs tracking-[0.3em] uppercase text-white/15 mb-10">Our mission</p>
          </Reveal>
          <Reveal delay={200}>
            <h2
              className="text-[1.5rem] md:text-[2.8rem] md:leading-[1.4] font-light text-white/80"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              Every family has stories worth preserving — but they live in fading
              photographs and aging memories. We built Living Memory so that no
              story is ever lost.
            </h2>
          </Reveal>
          <Reveal delay={350}>
            <div className="w-12 h-px bg-white/10 mx-auto mt-12" />
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* MEET EVA — full screen, immersive                                */}
      {/* ================================================================ */}
      <section className="relative flex items-center px-6 overflow-hidden bg-[#111113]">
        {/* Ambient blue glow behind EVA */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 20% 40%, rgba(6,182,212,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 80% 60%, rgba(59,130,246,0.05) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-5xl mx-auto grid md:grid-cols-[auto_1fr] gap-12 md:gap-20 items-center relative z-10 py-24">
          <Reveal>
            <div className="flex justify-center md:justify-start">
              <EVAOrb size={160} isSpeaking={false} />
            </div>
          </Reveal>
          <div>
            <Reveal delay={100}>
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">Meet EVA</p>
            </Reveal>
            <Reveal delay={200}>
              <h2
                className="text-2xl md:text-[2.8rem] md:leading-[1.35] font-light text-white/90 mb-8"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                EVA is your AI memory companion. She sees your photographs, hears your
                stories, and transforms them into cinematic memories that last forever.
              </h2>
            </Reveal>
            <Reveal delay={350}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/20 tracking-widest uppercase">Powered by</span>
                <span className="text-sm text-white/45">Google Gemini</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 01 — CAPTURE                                                     */}
      {/* ================================================================ */}
      <section className="py-24 md:py-36 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <Reveal>
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">01 — Capture</p>
              <h3
                className="text-2xl md:text-[2.2rem] md:leading-[1.3] font-light text-white/90 mb-6"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Show me your photographs
              </h3>
              <p className="text-[15px] text-white/35 leading-relaxed mb-8 max-w-lg">
                Old albums. Faded prints. Shoeboxes of memories. Point your camera at any
                photograph and EVA detects, captures, and enhances it — all in real time.
                Nano Banana, powered by Gemini&apos;s native image output, extracts and
                cleans up each photo to pristine quality.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/20">
                <span>Real-time detection</span>
                <span>Nano Banana cleanup</span>
                <span>Auto enhancement</span>
                <span>Prints & screens</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden">
                <Image src="/pic7.jpg" alt="Family memory" width={700} height={500} className="w-full object-cover" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg overflow-hidden"><Image src="/pic1.PNG" alt="" width={230} height={170} className="w-full h-24 object-cover" /></div>
                <div className="rounded-lg overflow-hidden"><Image src="/pic5.jpg" alt="" width={230} height={170} className="w-full h-24 object-cover" /></div>
                <div className="rounded-lg overflow-hidden"><Image src="/pic3.PNG" alt="" width={230} height={170} className="w-full h-24 object-cover" /></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 02 — REMEMBER                                                    */}
      {/* ================================================================ */}
      <section className="py-24 md:py-36 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <Reveal>
            <div className="order-2 md:order-1 relative">
              <div className="rounded-xl overflow-hidden">
                <Image src="/pic5.jpg" alt="Family memory" width={700} height={500} className="w-full object-cover" />
              </div>
              {/* Simulated conversation bubbles */}
              <div className="absolute -bottom-4 -right-4 md:right-4 bg-[#141416] border border-white/[0.06] rounded-2xl px-5 py-4 max-w-[240px] shadow-2xl shadow-black/50">
                <p className="text-[11px] text-white/25 mb-1">EVA</p>
                <p className="text-[13px] text-white/60 leading-relaxed italic" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                  &ldquo;Who is holding you in this photo?&rdquo;
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="order-1 md:order-2">
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">02 — Remember</p>
              <h3
                className="text-2xl md:text-[2.2rem] md:leading-[1.3] font-light text-white/90 mb-6"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Tell me what happened
              </h3>
              <p className="text-[15px] text-white/35 leading-relaxed mb-8 max-w-lg">
                Just talk. Share who&apos;s in the photo, what happened that day, why it
                matters. EVA listens through Gemini Live, transcribes every word, and
                links your stories to each photo. Every family member can add
                their own perspective.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/20">
                <span>Gemini Live voice</span>
                <span>AI transcription</span>
                <span>Multi-perspective stories</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 03 — ANIMATE (the WOW section)                                   */}
      {/* ================================================================ */}
      <section className="py-24 md:py-36 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="max-w-2xl mb-14">
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">03 — Animate</p>
              <h3
                className="text-2xl md:text-[2.2rem] md:leading-[1.3] font-light text-white/90 mb-6"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Watch still photos come alive
              </h3>
              <p className="text-[15px] text-white/35 leading-relaxed max-w-lg">
                Choose your animation engine — Google&apos;s Veo 3 for cinematic realism
                or Grok for stylistic flair. Before animating, transform photos into
                entirely new art styles: Disney&nbsp;/ Pixar, Studio Ghibli, or Anime.
                Each photo becomes a living moment.
              </p>
            </div>
          </Reveal>

          {/* Before/after: static photo → animated video */}
          <Reveal delay={150}>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div className="relative rounded-xl overflow-hidden">
                <Image src="/pic7.jpg" alt="Original photograph" width={700} height={500} className="w-full object-cover" />
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] text-white/60 tracking-wider uppercase">Original photo</span>
                </div>
              </div>
              <div className="relative rounded-xl overflow-hidden">
                <video autoPlay muted loop playsInline className="w-full object-cover">
                  <source src="/animations/pic7.mp4" type="video/mp4" />
                </video>
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] text-white/60 tracking-wider uppercase">Animated with Veo 3</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Animation hover strip */}
          <Reveal delay={250}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                { photo: '/pic1.PNG', video: '/animations/pic1.mp4' },
                { photo: '/pic3.PNG', video: '/animations/pic3.mp4' },
                { photo: '/pic5.jpg', video: '/animations/pic5.mp4' },
                { photo: '/pic6.jpg', video: '/animations/pic6.mp4' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg overflow-hidden group relative cursor-pointer">
                  <Image src={item.photo} alt="" width={350} height={260} className="w-full h-40 object-cover group-hover:opacity-0 transition-opacity duration-500" />
                  <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <source src={item.video} type="video/mp4" />
                  </video>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-white/15 mt-3">Hover to see animations</p>
          </Reveal>

          {/* Style options + engines */}
          <Reveal delay={350}>
            <div className="mt-12 grid md:grid-cols-2 gap-8">
              {/* Animation engines */}
              <div className="p-6 rounded-xl border border-white/[0.04] bg-white/[0.015]">
                <p className="text-[11px] tracking-[0.2em] uppercase text-white/20 mb-4">Animation engines</p>
                <div className="space-y-3">
                  {[
                    { name: 'Veo 3', tag: 'Google', desc: 'Cinematic, natural motion with temporal coherence' },
                    { name: 'Grok Imagine', tag: 'xAI', desc: 'Fast stylistic animations with creative flair' },
                  ].map((e, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm text-white/60 font-medium">{e.name}</span>
                        <span className="text-[11px] text-white/15 ml-2">{e.tag}</span>
                        <p className="text-[12px] text-white/20 mt-0.5">{e.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Art styles */}
              <div className="p-6 rounded-xl border border-white/[0.04] bg-white/[0.015]">
                <p className="text-[11px] tracking-[0.2em] uppercase text-white/20 mb-4">Art style transfer</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '🎬', name: 'Cinematic', desc: 'Natural film-like motion' },
                    { icon: '✨', name: 'Disney / Pixar', desc: '3D animated CGI style' },
                    { icon: '🍃', name: 'Studio Ghibli', desc: 'Hand-painted watercolor' },
                    { icon: '⚡', name: 'Anime', desc: 'Vibrant Shinkai style' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-2">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <p className="text-[13px] text-white/60">{s.name}</p>
                        <p className="text-[11px] text-white/15">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 04 — PRESERVE YOUR VOICE                                         */}
      {/* ================================================================ */}
      <section className="py-24 md:py-36 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <Reveal>
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">04 — Preserve</p>
              <h3
                className="text-2xl md:text-[2.2rem] md:leading-[1.3] font-light text-white/90 mb-6"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Clone your voice. Narrate your story.
              </h3>
              <p className="text-[15px] text-white/35 leading-relaxed mb-8 max-w-lg">
                Upload a short voice sample and Living Memory creates a digital clone
                of your voice. When it&apos;s time to narrate, your stories are told not
                by a stranger — but by you, in your voice, forever.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/20">
                <span>Instant voice cloning</span>
                <span>Multi-sample support</span>
                <span>Perspective playback</span>
                <span>Family voice library</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            {/* Voice waveform visual */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/[0.06] flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </div>
                <div>
                  <p className="text-sm text-white/60 font-medium">Voice Sample</p>
                  <p className="text-[12px] text-white/20">Recording 1 of 3 — 0:42</p>
                </div>
              </div>
              {/* Animated waveform bars */}
              <div className="flex items-center justify-center gap-[3px] h-16">
                {Array.from({ length: 40 }, (_, i) => {
                  const baseH = Math.sin(i * 0.5) * 25 + 35;
                  const dur = 0.6 + Math.sin(i * 0.7) * 0.4;
                  const del = i * 0.05;
                  return (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-gradient-to-t from-cyan-500/30 to-cyan-400/50"
                      style={{
                        height: `${baseH}%`,
                        animation: `lm-wave ${dur}s ease-in-out ${del}s infinite alternate`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 text-[11px] text-white/15">
                <span>ElevenLabs Instant Voice Cloning</span>
                <span className="text-cyan-400/40">● Recording</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 05 — CREATE FILMS                                                */}
      {/* ================================================================ */}
      <section className="py-24 md:py-36 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <Reveal>
            <div className="order-2 md:order-1 rounded-xl overflow-hidden border border-white/[0.06]">
              <video autoPlay muted loop playsInline className="w-full">
                <source src="/animations/pic6.mp4" type="video/mp4" />
              </video>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="order-1 md:order-2">
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">05 — Create</p>
              <h3
                className="text-2xl md:text-[2.2rem] md:leading-[1.3] font-light text-white/90 mb-6"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Context-aware narrated films
              </h3>
              <p className="text-[15px] text-white/35 leading-relaxed mb-5 max-w-lg">
                Gemini sees every photo and reads every conversation you&apos;ve had about
                it — then generates narration that understands the full context. It knows
                who&apos;s in each frame, what happened, and how each clip connects to the next.
              </p>
              <p className="text-[15px] text-white/35 leading-relaxed mb-8 max-w-lg">
                Reorder your clips and the narration adapts. Move a childhood photo before a
                wedding and EVA rewrites the story to bridge them naturally — all multimodal,
                all context-aware.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/20">
                <span>Multimodal understanding</span>
                <span>Context-aware narration</span>
                <span>Drag-to-reorder</span>
                <span>Watch / read / film</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 06 — TOGETHER                                                    */}
      {/* ================================================================ */}
      <section className="py-24 md:py-36 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <Reveal>
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">06 — Together</p>
              <h3
                className="text-2xl md:text-[2.2rem] md:leading-[1.3] font-light text-white/90 mb-6"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Everyone remembers differently
              </h3>
              <p className="text-[15px] text-white/35 leading-relaxed mb-8 max-w-lg">
                Mom remembers the laughter. Dad remembers the drive. Each family member
                joins with a code, adds their perspective, and EVA weaves every voice
                into one complete story. Ask questions, share answers, build a family
                tree — together.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/20">
                <span>Family codes</span>
                <span>Multi-perspective</span>
                <span>Questions & answers</span>
                <span>Family tree</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div>
              {/* Photo scatter simulating family contributions */}
              <div className="relative h-[360px] md:h-[420px]">
                <div className="absolute top-0 left-0 w-[55%] rounded-xl overflow-hidden shadow-2xl shadow-black/40" style={{ transform: 'rotate(-2deg)' }}>
                  <Image src="/pic7.jpg" alt="" width={400} height={300} className="w-full object-cover" />
                </div>
                <div className="absolute top-12 right-0 w-[50%] rounded-xl overflow-hidden shadow-2xl shadow-black/40" style={{ transform: 'rotate(1.5deg)' }}>
                  <Image src="/pic1.PNG" alt="" width={400} height={300} className="w-full object-cover" />
                </div>
                <div className="absolute bottom-0 left-[15%] w-[45%] rounded-xl overflow-hidden shadow-2xl shadow-black/40" style={{ transform: 'rotate(0.5deg)' }}>
                  <Image src="/pic3.PNG" alt="" width={400} height={300} className="w-full object-cover" />
                </div>
                {/* Family member avatars */}
                <div className="absolute bottom-4 right-4 flex -space-x-2">
                  {['bg-cyan-500', 'bg-purple-500', 'bg-amber-500'].map((c, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] text-white font-medium`}>
                      {['M', 'S', 'D'][i]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* VIEWS — Four ways to experience                                   */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 px-6 md:px-10 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="max-w-2xl mb-14">
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">Present</p>
              <h3
                className="text-2xl md:text-[2.2rem] md:leading-[1.3] font-light text-white/90 mb-6"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                Four ways to experience your memories
              </h3>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { name: 'Cinema', desc: 'Full-screen featured carousel', video: '/animations/pic7.mp4' },
                { name: 'Animated Slideshow', desc: 'Auto-playing animated gallery', video: '/animations/pic1.mp4' },
                { name: 'Storybook', desc: 'Narrated Living Storybook', video: '/animations/pic6.mp4' },
                { name: 'Scrapbook', desc: 'Polaroid prints with tape', video: '/animations/pic5.mp4' },
              ].map((v, i) => (
                <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.015] overflow-hidden group">
                  {/* Video placeholder */}
                  <div className="aspect-[4/3] bg-black/40 overflow-hidden relative">
                    <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-500">
                      <source src={v.video} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] tracking-[0.15em] uppercase text-white/30 bg-black/40 px-2 py-1 rounded">{v.name} view</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-white/70 font-medium mb-1">{v.name}</p>
                    <p className="text-[12px] text-white/20 leading-relaxed">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FEED                                                             */}
      {/* ================================================================ */}
      <section className="py-24 md:py-36 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <Reveal>
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-white/20 mb-6">Share</p>
              <h3
                className="text-2xl md:text-[2.2rem] md:leading-[1.3] font-light text-white/90 mb-6"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                A living family feed
              </h3>
              <p className="text-[15px] text-white/35 leading-relaxed mb-8 max-w-lg">
                See what your family is remembering. New photos, animations,
                stories, answered questions, and completed storybooks — all in
                a chronological feed. Filter by type to find exactly what you&apos;re
                looking for.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/20">
                <span>Photos</span>
                <span>Animations</span>
                <span>Stories</span>
                <span>Questions</span>
                <span>Albums</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            {/* Simulated feed cards */}
            <div className="space-y-3">
              {[
                { user: 'Mom', avatar: 'bg-purple-500', action: 'added 3 photos to', target: 'Childhood Memories', time: '2h ago', photo: '/pic5.jpg' },
                { user: 'Dad', avatar: 'bg-amber-500', action: 'animated a photo in', target: 'Summer 1994', time: '4h ago', photo: '/pic1.PNG' },
                { user: 'Sarah', avatar: 'bg-cyan-500', action: 'answered a question in', target: 'Grandma\'s Kitchen', time: 'Yesterday', photo: '/pic3.PNG' },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl border border-white/[0.04] bg-white/[0.015]">
                  <div className={`w-8 h-8 rounded-full ${item.avatar} flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0`}>
                    {item.user[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/50">
                      <span className="text-white/70 font-medium">{item.user}</span>{' '}
                      {item.action}{' '}
                      <span className="text-white/70">{item.target}</span>
                    </p>
                    <p className="text-[11px] text-white/15 mt-1">{item.time}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={item.photo} alt="" width={48} height={48} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FUTURE — Roadmap                                                 */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 px-6 md:px-10 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-xs tracking-[0.2em] uppercase text-white/15 mb-6">What&apos;s next</p>
          </Reveal>
          <div className="space-y-16 mt-10">
            {/* Google Genie */}
            <Reveal delay={100}>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[15px] text-white/70 font-medium">Google Genie</p>
                  <span className="text-[10px] text-white/15 tracking-widest uppercase border border-white/[0.06] px-2 py-0.5 rounded">Coming soon</span>
                </div>
                <p className="text-[14px] text-white/30 leading-relaxed max-w-2xl mb-5">
                  Step inside your photographs. Genie will transform flat images into
                  explorable 3D worlds — walk through grandma&apos;s kitchen, revisit
                  a childhood playground.
                </p>
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/[0.06]">
                  <iframe
                    src="https://www.youtube.com/embed/YxkGdX4WIBE?rel=0"
                    title="Google Genie preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            </Reveal>

            {/* Family Tree & Knowledge Base */}
            <Reveal delay={200}>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[15px] text-white/70 font-medium">Family Tree & Knowledge Base</p>
                  <span className="text-[10px] text-white/15 tracking-widest uppercase border border-white/[0.06] px-2 py-0.5 rounded">In progress</span>
                </div>
                <p className="text-[14px] text-white/30 leading-relaxed max-w-2xl mb-5">
                  EVA builds a deep understanding of your family over time — faces,
                  relationships, and context from every conversation. Your family tree
                  informs every story: EVA understands who&apos;s who, linking memories
                  across decades with relationship-aware narration. Each story becomes
                  richer than the last.
                </p>
                <div className="w-full rounded-xl overflow-hidden border border-white/[0.06]">
                  <img
                    src="/family-tree-context.png"
                    alt="Family tree with relationships and generations"
                    className="w-full object-cover"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TECH — Built with Google                                         */}
      {/* ================================================================ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-xs tracking-[0.2em] uppercase text-white/15 mb-12">Built with Google AI</p>
          </Reveal>
          <Reveal delay={100}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-y-10 gap-x-8 md:gap-x-10">
              {[
                { name: 'Gemini 2.0 Flash', desc: 'Photo understanding, story generation, fact extraction, and Nano Banana image output' },
                { name: 'Gemini Live', desc: 'Real-time voice conversations — talk to EVA naturally about your memories' },
                { name: 'Veo 3', desc: 'Transforms static photographs into cinematic animated video' },
                { name: 'Cloud TTS', desc: 'Text-to-speech narration with multiple voice options' },
                { name: 'Genie', desc: '3D world generation from photographs (coming soon)' },
              ].map((tech, i) => (
                <div key={i}>
                  <p className="text-sm text-white/60 font-medium mb-2">{tech.name}</p>
                  <p className="text-[12px] text-white/20 leading-relaxed">{tech.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CTA                                                              */}
      {/* ================================================================ */}
      <section className="relative py-32 md:py-44 px-6 text-center overflow-hidden">
        {/* Subtle blue hue behind EVA */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 70% at 50% 40%, rgba(59,130,246,0.06) 0%, transparent 70%)',
          }}
        />
        <Reveal>
          <div className="relative z-10 flex justify-center mb-10">
            <EVAOrb size={100} isSpeaking={false} />
          </div>
        </Reveal>
        <Reveal delay={100}>
          <h2
            className="text-3xl md:text-[3rem] md:leading-[1.2] font-light text-white/90 mb-6 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Your stories are waiting
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <p className="text-[15px] text-white/25 mb-10 max-w-md mx-auto">
            Start preserving your family memories today.
          </p>
        </Reveal>
        <Reveal delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/intro"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white text-[#0a0a0a] text-sm font-medium hover:bg-white/90 transition-all active:scale-[0.97]"
            >
              Get started
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link href="/login" className="text-sm text-white/25 hover:text-white/50 transition-colors px-4 py-3">
              Sign in
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}
      <footer className="py-8 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/livingmemory.png" alt="" width={20} height={20} className="opacity-30" />
            <p className="text-xs text-white/15">Living Memory — A Google Labs experiment. AI outputs may vary.</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/15">
            <Link href="#" className="hover:text-white/30 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white/30 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
