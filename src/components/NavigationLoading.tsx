'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

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
          style={{ background: '#0d0b09' }}
        >
          <img 
            src="/livingmemory.png" 
            alt="Living Memory" 
            className="h-32 md:h-40 lg:h-48 w-auto object-contain mb-12 opacity-95"
          />
          {/* Netflix-style spinner */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-[4px] border-white/15 rounded-full"></div>
            <div 
              className="absolute inset-0 border-[4px] border-transparent rounded-full animate-spin"
              style={{ 
                borderTopColor: '#22c55e', // Green
                borderRightColor: '#22c55e',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
                animation: 'spin 0.9s linear infinite'
              }}
            ></div>
          </div>
        </div>
      )}
    </NavigationLoadingContext.Provider>
  );
}
