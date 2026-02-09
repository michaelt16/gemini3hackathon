'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

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
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0b09 50%, #0f0a15 100%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />
      </div>
      
      {/* Mini EVA Orb */}
      <div className="relative mb-4">
        <EVAOrb size={96} isSpeaking={true} />
      </div>
      
      {/* Loading dots */}
      <div className="flex items-center gap-1.5 mt-4">
        <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0s' }} />
        <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
        <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
      </div>
    </div>
  );
}
