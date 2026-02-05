'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useUserName } from '@/hooks/use-user-name';
import { CreateAlbumProvider } from '@/contexts/CreateAlbumContext';
import CreateAlbumModal from '@/components/CreateAlbumModal';

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

function NavigationContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userName, avatarLetter } = useUserName();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch question count
  useEffect(() => {
    async function fetchQuestionCount() {
      try {
        const res = await fetch('/api/prompts');
        if (res.ok) {
          const data = await res.json();
          setQuestionCount(data.prompts?.length || 0);
        }
      } catch (e) {
        console.error('Failed to fetch question count:', e);
      }
    }
    fetchQuestionCount();
  }, [pathname]); // Refresh when navigating

  const isActive = (path: string) => {
    if (path === '/album') {
      return pathname === '/album' || pathname?.startsWith('/album/');
    }
    return pathname === path;
  };

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
        <div className="flex items-center justify-between h-[88px] md:h-[96px] px-4 md:px-10">
          {/* Left - Logo & Nav */}
          <div className="flex items-center gap-10">
            <Link 
              href="/" 
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img 
                src="/livingmemory.png" 
                alt="Living Memory" 
                className="h-16 w-16 md:h-24 md:w-24 lg:h-28 lg:w-28 object-contain"
              />
            </Link>
            
            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-2">
              <Link 
                href="/album" 
                className={`px-5 py-2.5 rounded-xl text-base font-medium transition-all flex items-center gap-2.5 ${
                  isActive('/album') 
                    ? 'text-white bg-white/10' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Albums
              </Link>
              <Link 
                href="/questions" 
                className={`px-5 py-2.5 rounded-xl text-base font-medium transition-all flex items-center gap-2.5 ${
                  isActive('/questions') 
                    ? 'text-white bg-white/10' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                Questions
                {questionCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
                    {questionCount}
                  </span>
                )}
              </Link>
              <Link 
                href="/family" 
                className={`px-5 py-2.5 rounded-xl text-base font-medium transition-all flex items-center gap-2.5 ${
                  isActive('/family') 
                    ? 'text-white bg-white/10' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-2xl">🌳</span>
                Family
              </Link>
            </nav>
          </div>
          
          {/* Right - Profile */}
          <div className="flex items-center gap-4">
            {/* Profile */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 group"
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-medium"
                  style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' }}
                >
                  {avatarLetter}
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
                      <p className="text-sm text-white font-medium">{userName}</p>
                      <p className="text-xs text-white/50">user@example.com</p>
                    </div>
                    <Link 
                      href="/profile" 
                      className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      Profile & Settings
                    </Link>
                    <Link 
                      href="/family" 
                      className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      Manage Family
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
  return (
    <SidebarProvider>
      <CreateAlbumProvider>
        <NavigationContent>{children}</NavigationContent>
        <CreateAlbumModal />
      </CreateAlbumProvider>
    </SidebarProvider>
  );
}
