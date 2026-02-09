'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useUserName } from '@/hooks/use-user-name';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CreateAlbumProvider } from '@/contexts/CreateAlbumContext';
import { useTheme } from '@/contexts/ThemeContext';
import CreateAlbumModal from '@/components/CreateAlbumModal';
import dynamic from 'next/dynamic';

const EVAPanel = dynamic(() => import('@/components/EVAPanel'), { ssr: false });

// Icons
const HomeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const AlbumIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const FamilyIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const QuestionsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const SettingsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const VisionIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const FeedIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
  </svg>
);

const MenuIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// Theme toggle icons
const SunIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const MoonIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

function NavigationContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userName, avatarLetter } = useUserName();
  const { user: currentUser, loaded: userLoaded } = useCurrentUser();
  const { theme, toggleTheme } = useTheme();
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  
  const isDark = theme === 'dark';
  
  // Use current user info for display
  const displayName = userLoaded && currentUser.name !== 'You' ? currentUser.name : userName;
  const displayLetter = displayName ? displayName.charAt(0).toUpperCase() : avatarLetter;
  const displayColor = userLoaded ? currentUser.avatarColor : undefined;

  // Fetch question count for current user
  useEffect(() => {
    if (!userLoaded) return;

    async function fetchQuestionCount() {
      try {
        const res = await fetch(`/api/prompts?for_user=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          const unanswered = (data.prompts || []).filter((p: { answered_at?: string }) => !p.answered_at);
          setQuestionCount(unanswered.length);
        }
      } catch (e) {
        console.error('Failed to fetch question count:', e);
      }
    }

    fetchQuestionCount();

    // Poll every 30s so badge updates when new questions arrive
    const interval = setInterval(fetchQuestionCount, 30000);

    // Refetch when tab becomes visible (e.g. user switched back)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchQuestionCount();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Refetch when a question is answered or new one arrives (e.g. from editor)
    const onQuestionsUpdated = () => fetchQuestionCount();
    window.addEventListener('questions-updated', onQuestionsUpdated);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('questions-updated', onQuestionsUpdated);
    };
  }, [pathname, currentUser.id, userLoaded]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/album') {
      return pathname === '/album' || pathname?.startsWith('/album/');
    }
    if (path === '/feed') {
      return pathname === '/feed';
    }
    return pathname === path;
  };

  const navItems: NavItem[] = [
    { href: '/album', label: 'Albums', icon: HomeIcon },
    { href: '/feed', label: 'Feed', icon: FeedIcon },
    { href: '/questions', label: 'Questions', icon: QuestionsIcon, badge: questionCount },
  ];

  const comingSoonItems: NavItem[] = [
    { href: '/family', label: 'Family Tree', icon: FamilyIcon },
    { href: '/vision', label: 'Genie', icon: VisionIcon },
  ];

  const bottomNavItems: NavItem[] = [
    { href: '/profile', label: 'Settings', icon: SettingsIcon },
  ];

  // Sidebar is collapsed by default, expands on hover
  const isExpanded = sidebarHovered;

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    
    return (
      <Link
        href={item.href}
        className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
          active
            ? isDark ? 'bg-white/10 text-white' : 'bg-black/6 text-[#1d1d1f]'
            : isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/4'
        }`}
        title={!isExpanded ? item.label : undefined}
      >
        <Icon className={`w-6 h-6 flex-shrink-0 ${active ? (isDark ? 'text-white' : 'text-[#1d1d1f]') : ''}`} />
        <span 
          className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${
            isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
          }`}
        >
          {item.label}
        </span>
        {item.badge !== undefined && item.badge > 0 && (
          isExpanded ? (
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-white/15 text-white/80' : 'bg-black/6 text-[#1d1d1f]'}`}>
              {item.badge}
            </span>
          ) : (
            <span className="absolute -top-1 right-0 w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar - Collapsed by default, expands on hover */}
      <aside 
        className={`hidden md:flex flex-col fixed top-0 left-0 h-full z-40 transition-all duration-300 ease-out ${
          isExpanded ? 'w-[280px]' : 'w-[80px]'
        }`}
        style={{ 
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)'
        }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Logo */}
        <div className={`flex items-center py-6 px-5 border-b ${isExpanded ? 'justify-start' : 'justify-center'}`} style={{ borderColor: 'var(--border-subtle)' }}>
          <Link href="/" className={`flex items-center hover:opacity-80 transition-opacity ${isExpanded ? 'gap-5' : ''}`}>
            <Image 
              src="/livingmemory.png" 
              alt="Living Memory" 
              width={72}
              height={72}
              className="object-contain flex-shrink-0"
            />
            <div 
              className={`flex flex-col gap-0.5 whitespace-nowrap transition-all duration-200 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              }`}
            >
              <span 
                className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                EVA
              </span>
              <span 
                className={`text-[11px] tracking-[0.2em] uppercase ${isDark ? 'text-white/50' : 'text-gray-400'}`}
              >
                Living Memory
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Coming Soon section */}
        <div className="py-3 px-3 space-y-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {isExpanded && (
            <p className={`px-3 text-[10px] uppercase tracking-wider font-medium mb-1 ${isDark ? 'text-white/25' : 'text-gray-400'}`}>Coming Soon</p>
          )}
          {comingSoonItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isDark ? 'text-white/30 hover:text-white/50 hover:bg-white/5' : 'text-gray-400 hover:text-gray-500 hover:bg-black/4'
                }`}
                title={!isExpanded ? `${item.label} (Coming Soon)` : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0 opacity-60" />
                <span 
                  className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                  }`}
                >
                  {item.label}
                </span>
                {isExpanded && (
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/8 text-white/30' : 'bg-gray-200 text-gray-400'}`}>
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="py-4 px-3 space-y-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all w-full ${
              isDark 
                ? 'text-white/60 hover:text-white hover:bg-white/5' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <SunIcon className="w-6 h-6 flex-shrink-0" /> : <MoonIcon className="w-6 h-6 flex-shrink-0" />}
            <span 
              className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              }`}
            >
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
          
          {/* User profile */}
          <div className={`flex items-center gap-3 px-3 py-3 rounded-xl ${isExpanded ? '' : 'justify-center'}`}>
            <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                style={{ background: displayColor || 'linear-gradient(135deg, var(--eva-cyan) 0%, #8b5cf6 100%)' }}
              >
                {displayLetter}
              </div>
              <div 
                className={`flex-1 min-w-0 transition-all duration-200 ${
                  isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                }`}
              >
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{displayName}</p>
                <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>View profile</p>
              </div>
            </Link>
            <Link
              href="/login"
              className={`flex-shrink-0 transition-all duration-200 ${
                isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              }`}
            >
              <span className={`text-xs px-2 py-1 rounded-md ${isDark ? 'text-cyan-400 hover:bg-white/5' : 'text-cyan-600 hover:bg-black/5'}`}>
                Switch
              </span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header 
        className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4"
        style={{ 
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`p-2 ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <MenuIcon />
        </button>
        
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/livingmemory.png" 
            alt="Living Memory" 
            width={44}
            height={44}
            className="object-contain"
          />
          <div className="flex flex-col">
            <span className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>EVA</span>
            <span className={`text-[9px] tracking-widest uppercase -mt-0.5 ${isDark ? 'text-white/60' : 'text-gray-400'}`}>Living Memory</span>
          </div>
        </Link>
        
        <Link href="/profile">
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ background: displayColor || 'linear-gradient(135deg, var(--eva-cyan) 0%, #8b5cf6 100%)' }}
          >
            {displayLetter}
          </div>
        </Link>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-black/60 z-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div 
            className="md:hidden fixed top-0 left-0 bottom-0 w-[280px] z-50 flex flex-col"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <Link href="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                <Image 
                  src="/livingmemory.png" 
                  alt="Living Memory" 
                  width={44}
                  height={44}
                  className="object-contain"
                />
                <div className="flex flex-col">
                  <span className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>EVA</span>
                  <span className={`text-[9px] tracking-widest uppercase -mt-0.5 ${isDark ? 'text-white/60' : 'text-gray-400'}`}>Living Memory</span>
                </div>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2 ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      active
                        ? isDark ? 'bg-white/10 text-white' : 'bg-black/6 text-[#1d1d1f]'
                        : isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/4'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${active ? (isDark ? 'text-white' : 'text-[#1d1d1f]') : ''}`} />
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-white/15 text-white/80' : 'bg-black/6 text-[#1d1d1f]'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Coming Soon section */}
              <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className={`px-3 text-[10px] uppercase tracking-wider font-medium mb-2 ${isDark ? 'text-white/25' : 'text-gray-400'}`}>Coming Soon</p>
                {comingSoonItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isDark ? 'text-white/30 hover:text-white/50 hover:bg-white/5' : 'text-gray-400 hover:text-gray-500 hover:bg-black/4'
                      }`}
                    >
                      <Icon className="w-5 h-5 opacity-60" />
                      <span className="font-medium text-sm">{item.label}</span>
                      <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/8 text-white/30' : 'bg-gray-200 text-gray-400'}`}>
                        Soon
                      </span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Bottom */}
            <div className="py-4 px-3 space-y-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {/* Theme toggle in mobile */}
              <button
                onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all w-full ${
                  isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
                }`}
              >
                {isDark ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                <span className="font-medium text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              
              {bottomNavItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      active
                        ? isDark ? 'bg-white/10 text-white' : 'bg-black/6 text-[#1d1d1f]'
                        : isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/4'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${active ? (isDark ? 'text-white' : 'text-[#1d1d1f]') : ''}`} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                );
              })}
              
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 flex-1 min-w-0"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ background: displayColor || 'linear-gradient(135deg, var(--eva-cyan) 0%, #8b5cf6 100%)' }}
                  >
                    {displayLetter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{displayName}</p>
                    <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>View profile</p>
                  </div>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-shrink-0"
                >
                  <span className={`text-xs px-2 py-1 rounded-md ${isDark ? 'text-cyan-400 hover:bg-white/5' : 'text-cyan-600 hover:bg-black/5'}`}>
                    Switch
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-[80px] mt-16 md:mt-0`}
      >
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
        <EVAPanel />
      </CreateAlbumProvider>
    </SidebarProvider>
  );
}
