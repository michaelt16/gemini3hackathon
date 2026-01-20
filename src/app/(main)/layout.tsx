'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

function NavigationContent({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0b09' }}>
      {/* Navigation - transparent initially, solid on scroll */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'backdrop-blur-xl' 
            : ''
        }`}
        style={{ 
          background: scrolled 
            ? 'rgba(13, 11, 9, 0.95)' 
            : 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none'
        }}
      >
        <div className="flex items-center justify-between h-[68px] px-4 md:px-10">
          {/* Left - Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link 
              href="/" 
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img 
                src="/livingmemory.png" 
                alt="Living Memory" 
                className="h-10 md:h-12 w-auto object-contain"
              />
            </Link>
            
            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/album" 
                className="text-sm font-medium text-white hover:text-white/70 transition-colors"
              >
                Memories
              </Link>
              <Link 
                href="/capture" 
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Capture
              </Link>
              <Link 
                href="#" 
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                People
              </Link>
            </nav>
          </div>
          
          {/* Right - Actions */}
          <div className="flex items-center gap-4">
            <button className="text-white/70 hover:text-white transition-colors">
              <SearchIcon />
            </button>
            
            <Link 
              href="/capture"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all text-white"
              style={{ 
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)'
              }}
            >
              <PlusIcon />
              New Memory
            </Link>
            
            <button className="text-white/70 hover:text-white transition-colors hidden md:block">
              <BellIcon />
            </button>
            
            {/* Profile */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 group"
              >
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #8B7355 0%, #6B5344 100%)' }}
                >
                  U
                </div>
                <ChevronDownIcon />
              </button>
              
              {profileOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileOpen(false)}
                  />
                  <div 
                    className="absolute right-0 top-full mt-2 w-48 py-2 rounded-md z-50"
                    style={{ 
                      background: 'rgba(20,18,16,0.98)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                    }}
                  >
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-sm text-white font-medium">User</p>
                      <p className="text-xs text-white/50">user@example.com</p>
                    </div>
                    <Link 
                      href="#" 
                      className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      My Profile
                    </Link>
                    <Link 
                      href="#" 
                      className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Settings
                    </Link>
                    <div className="border-t border-white/10 mt-2 pt-2">
                      <button className="block w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavigationContent>{children}</NavigationContent>;
}
