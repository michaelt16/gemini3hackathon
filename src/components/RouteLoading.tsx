'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function RouteLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Show loading when route changes
    setIsLoading(true);
    
    // Hide loading after route change completes
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: '#0d0b09' }}
    >
      <img 
        src="/livingmemory.png" 
        alt="Living Memory" 
        className="h-16 md:h-20 w-auto object-contain mb-8 opacity-90"
      />
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-white/60 rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
