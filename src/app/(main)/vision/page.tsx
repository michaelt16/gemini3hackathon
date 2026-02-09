'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeContext';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

export default function VisionPage() {
  const [activeDemo, setActiveDemo] = useState<'explore' | 'interact' | 'world' | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(6,182,212,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(236,72,153,0.08) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(6,182,212,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(236,72,153,0.06) 0%, transparent 60%)'
          }}
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: isDark
              ? 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 md:px-12 pt-16 pb-20">
          {/* Badge */}
          <div className="flex items-center gap-3 mb-8">
            <span 
              className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))', color: 'var(--eva-cyan)' }}
            >
              Coming 2025
            </span>
            <span className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Future Roadmap</span>
          </div>

          {/* Title */}
          <h1 
            className={`text-4xl md:text-6xl lg:text-7xl font-light mb-6 leading-tight ${isDark ? 'text-white' : 'text-gray-800'}`}
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Step Into Your<br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Memories
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`text-xl md:text-2xl font-light max-w-2xl mb-10 leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
            What if you could walk through grandma's kitchen one more time? 
            Explore the beach from that 1985 vacation? 
            <span className={isDark ? 'text-white/80' : 'text-gray-800'}> That's where we're headed.</span>
          </p>

          {/* EVA + Quote */}
          <div 
            className="flex items-start gap-5 p-6 rounded-2xl max-w-xl"
            style={{ 
              background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)', 
              border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(139,92,246,0.15)' 
            }}
          >
            <EVAOrb size={56} isSpeaking={false} />
            <div>
              <p className={`text-sm italic leading-relaxed mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                "Memories shouldn't just be looked at. They should be experienced. 
                Soon, I'll be able to take you inside your photographs."
              </p>
              <p className="text-purple-400 text-xs font-medium">— EVA, on the future</p>
            </div>
          </div>
        </div>
      </div>

      {/* Google Genie Section */}
      <div className="relative py-20 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.05) 50%, transparent 100%)' }}
        />
        
        <div className="relative max-w-5xl mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4285f4, #ea4335, #fbbc05, #34a853)' }}
            >
              <span className="text-white text-lg">✦</span>
            </div>
            <span className={`text-sm uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Powered by</span>
          </div>
          
          <h2 
            className={`text-3xl md:text-4xl font-light mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Google Genie Integration
          </h2>
          
          <p className={`text-lg max-w-2xl mb-12 leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
            Google Genie transforms single images into explorable, interactive 3D worlds. 
            We're integrating this technology to turn your static memories into 
            <span className={isDark ? 'text-white' : 'text-gray-800'}> living, walkable experiences</span>.
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: Step Into Photo */}
            <div 
              className="group rounded-2xl p-6 transition-all cursor-pointer hover:scale-[1.02]"
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-subtle)' 
              }}
              onClick={() => setActiveDemo('explore')}
            >
              <div 
                className="aspect-video rounded-xl mb-5 overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))' }}
              >
                {/* Placeholder for demo video */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div 
                      className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ background: 'rgba(139,92,246,0.3)' }}
                    >
                      <svg className="w-6 h-6 text-purple-300 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Demo coming soon</span>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <div className={`h-1 flex-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                  <div className="h-1 w-8 rounded-full bg-purple-400/50" />
                </div>
              </div>
              
              <h3 className={`font-medium text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Step Into the Photo</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                Walk through a 3D environment generated from a single photograph. 
                Explore grandma's kitchen, the old family home, that beach vacation.
              </p>
            </div>

            {/* Card 2: Interactive Memories */}
            <div 
              className="group rounded-2xl p-6 transition-all cursor-pointer hover:scale-[1.02]"
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-subtle)' 
              }}
              onClick={() => setActiveDemo('interact')}
            >
              <div 
                className="aspect-video rounded-xl mb-5 overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(139,92,246,0.2))' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div 
                      className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ background: 'rgba(236,72,153,0.3)' }}
                    >
                      <svg className="w-6 h-6 text-pink-300 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Demo coming soon</span>
                  </div>
                </div>
                
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <div className={`h-1 flex-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                  <div className="h-1 w-8 rounded-full bg-pink-400/50" />
                </div>
              </div>
              
              <h3 className={`font-medium text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Interactive Memories</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                Interact with AI representations of loved ones in their remembered environments. 
                Like Black Mirror's "Eulogy" — but real.
              </p>
            </div>

            {/* Card 3: Memory Worlds */}
            <div 
              className="group rounded-2xl p-6 transition-all cursor-pointer hover:scale-[1.02]"
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-subtle)' 
              }}
              onClick={() => setActiveDemo('world')}
            >
              <div 
                className="aspect-video rounded-xl mb-5 overflow-hidden relative"
                style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(34,197,94,0.2))' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div 
                      className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ background: 'rgba(6,182,212,0.3)' }}
                    >
                      <svg className="w-6 h-6 text-cyan-300 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Demo coming soon</span>
                  </div>
                </div>
                
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <div className={`h-1 flex-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                  <div className="h-1 w-8 rounded-full bg-cyan-400/50" />
                </div>
              </div>
              
              <h3 className={`font-medium text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Memory Worlds</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                Multiple photos from the same event stitched into an explorable 3D world. 
                Preserve not just moments, but <em>places</em>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Will Work Section */}
      <div className="py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <h2 
            className={`text-3xl md:text-4xl font-light mb-4 text-center ${isDark ? 'text-white' : 'text-gray-800'}`}
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            How It Works
          </h2>
          <p className={`text-center mb-16 max-w-xl mx-auto ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
            From a single photograph to an explorable world
          </p>

          {/* Steps */}
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { 
                step: '01', 
                title: 'Select Memory', 
                desc: 'Choose a photograph from your collection',
                icon: '📷',
                color: 'rgba(139,92,246,0.2)'
              },
              { 
                step: '02', 
                title: 'AI Analysis', 
                desc: 'Gemini 3 analyzes depth, objects, and context',
                icon: '🧠',
                color: 'rgba(6,182,212,0.2)'
              },
              { 
                step: '03', 
                title: 'World Generation', 
                desc: 'Genie creates an explorable 3D environment',
                icon: '🌍',
                color: 'rgba(236,72,153,0.2)'
              },
              { 
                step: '04', 
                title: 'Step Inside', 
                desc: 'Walk through your memory in real-time',
                icon: '🚪',
                color: 'rgba(34,197,94,0.2)'
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div 
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: item.color }}
                >
                  {item.icon}
                </div>
                <div className={`text-xs font-mono mb-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{item.step}</div>
                <h3 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.title}</h3>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-600'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Demo Placeholder */}
      <div className="py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="text-center mb-10">
            <h2 
              className={`text-3xl md:text-4xl font-light mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              See It In Action
            </h2>
            <p className={isDark ? 'text-white/50' : 'text-gray-600'}>
              Watch as a single photograph transforms into an explorable world
            </p>
          </div>

          {/* Large Video Placeholder */}
          <div 
            className="aspect-video rounded-2xl overflow-hidden relative"
            style={{ 
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.1) 50%, rgba(236,72,153,0.1) 100%)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/YxkGdX4WIBE?rel=0"
              title="Google Genie preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Technical Architecture */}
      <div className="py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <h2 
            className={`text-3xl md:text-4xl font-light mb-4 text-center ${isDark ? 'text-white' : 'text-gray-800'}`}
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Technical Architecture
          </h2>
          <p className={`text-center mb-12 max-w-xl mx-auto ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
            How Gemini 3 and Google Genie work together
          </p>

          {/* Architecture Diagram */}
          <div 
            className="rounded-2xl p-8 md:p-12"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="grid md:grid-cols-3 gap-8 items-center">
              {/* Input */}
              <div className="text-center">
                <div 
                  className="w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
                >
                  <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <h3 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>Your Photo</h3>
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Single memory image</p>
              </div>

              {/* Processing */}
              <div className="text-center relative">
                {/* Arrows */}
                <div className={`hidden md:block absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                  →
                </div>
                <div className={`hidden md:block absolute right-0 top-1/2 translate-x-full -translate-y-1/2 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                  →
                </div>
                
                <div 
                  className="w-32 h-32 mx-auto mb-4 rounded-2xl flex flex-col items-center justify-center gap-2"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))', 
                    border: '1px solid rgba(6,182,212,0.3)' 
                  }}
                >
                  <span className="text-2xl">🧠</span>
                  <span className="text-cyan-400 text-xs font-semibold">Gemini 3</span>
                  <span className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>+</span>
                  <span className="text-purple-400 text-xs font-semibold">Genie</span>
                </div>
                <h3 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>AI Processing</h3>
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Analysis + Generation</p>
              </div>

              {/* Output */}
              <div className="text-center">
                <div 
                  className="w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                </div>
                <h3 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>3D World</h3>
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Explorable environment</p>
              </div>
            </div>

            {/* Tech stack */}
            <div className="mt-10 pt-8 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex flex-wrap justify-center gap-3">
                {['Gemini 3 Pro', 'Gemini 3 Flash', 'Google Genie', 'WebGL', 'Three.js'].map((tech) => (
                  <span 
                    key={tech}
                    className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <EVAOrb size={80} isSpeaking={false} />
          
          <h2 
            className={`text-3xl md:text-4xl font-light mt-8 mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            The Future of Memory
          </h2>
          <p className={`text-lg mb-8 max-w-xl mx-auto ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
            While we build this next chapter, start preserving your memories today. 
            The photos you capture now will be the worlds you explore tomorrow.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/home"
              className="px-8 py-3 rounded-xl text-white font-medium transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
            >
              Start Preserving Memories
            </Link>
            <Link
              href="/album"
              className={`px-8 py-3 rounded-xl font-medium transition-all ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-700 hover:bg-black/10'}`}
              style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: '1px solid var(--border-subtle)' }}
            >
              View Albums
            </Link>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="py-8 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className={`text-sm ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
          Google Genie integration is in development. Features shown are conceptual previews.
        </p>
      </div>
    </div>
  );
}
