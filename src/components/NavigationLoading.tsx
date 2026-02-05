'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

// Context is no longer needed, but keeping for backward compatibility
const NavigationLoadingContext = createContext<{ setLoading: (loading: boolean) => void }>({
  setLoading: () => {},
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [showLoader, setShowLoader] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  const loadingStartTime = useRef<number | null>(null);

  // Ensure we're mounted on client before tracking pathname changes
  useEffect(() => {
    setIsMounted(true);
    // Initialize prevPathname on mount
    prevPathname.current = pathname;
  }, []);

  // Only show loading when navigating from "/" to "/album"
  useEffect(() => {
    // Skip on initial mount to avoid hydration mismatch
    if (!isMounted) return;
    
    // Check if we're navigating from home to album
    if (prevPathname.current === '/' && pathname === '/album') {
      loadingStartTime.current = Date.now();
      setShowLoader(true);
      
      // Hide after minimum display time
      const timer = setTimeout(() => {
        setShowLoader(false);
        loadingStartTime.current = null;
      }, 1500);
      
      return () => clearTimeout(timer);
    }
    
    // Update previous pathname
    prevPathname.current = pathname;
  }, [pathname, isMounted]);

  return (
    <NavigationLoadingContext.Provider value={{ setLoading: () => {} }}>
      {children}
      {showLoader && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300"
          style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0b09 50%, #0f0a15 100%)' }}
        >
          {/* Ambient glow effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(16,185,129,0.1) 40%, transparent 70%)',
                filter: 'blur(80px)',
              }}
            />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 60%)',
                filter: 'blur(60px)',
                animation: 'pulse 3s ease-in-out infinite'
              }}
            />
          </div>
          
          {/* EVA Orb */}
          <div className="relative mb-8">
            <EVAOrb size={120} isSpeaking={true} />
          </div>
          
          {/* EVA text */}
          <h2 
            className="text-3xl md:text-4xl font-extralight tracking-wide mb-2 bg-clip-text text-transparent"
            style={{ 
              fontFamily: 'var(--font-crimson), Georgia, serif',
              backgroundImage: 'linear-gradient(90deg, #22d3ee, #06b6d4, #10b981)',
            }}
          >
            EVA
          </h2>
          
          {/* Loading indicator */}
          <div className="flex items-center gap-2 mt-6">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          
          <p className="text-white/40 text-sm mt-4 tracking-wider">Loading your memories...</p>
        </div>
      )}
    </NavigationLoadingContext.Provider>
  );
}
