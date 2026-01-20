'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

// SVG Icons
const AlbumIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const CameraIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const SettingsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function AlbumSidebar() {
  const { sidebarCollapsed } = useSidebar();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = isHovered;

  return (
    <>
      <aside 
        className={`
          fixed left-0 top-[96px] bottom-0 z-40
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isExpanded ? 'w-72' : 'w-20'}
          lg:translate-x-0
        `}
        style={{ 
          background: 'linear-gradient(to bottom, #1f1a15 0%, #15120e 100%)',
          borderRight: '1px solid rgba(180, 140, 100, 0.1)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="h-full flex flex-col py-6 px-3">
          <nav className="flex-1 space-y-2">
            <Link
              href="/album"
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-amber-100 transition-all ${isExpanded ? '' : 'justify-center'}`}
              style={{ background: 'rgba(255, 251, 235, 0.08)' }}
              title="Albums"
            >
              <AlbumIcon className="w-6 h-6 flex-shrink-0" />
              {isExpanded && <span className="text-sm font-medium">Albums</span>}
            </Link>
            <Link
              href="/capture"
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-amber-200/50 hover:text-amber-100 hover:bg-white/5 transition-all ${isExpanded ? '' : 'justify-center'}`}
              title="Capture"
            >
              <CameraIcon className="w-6 h-6 flex-shrink-0" />
              {isExpanded && <span className="text-sm font-medium">Capture</span>}
            </Link>
            
            <div className="my-6" style={{ borderTop: '1px solid rgba(180, 140, 100, 0.1)' }} />
            
            <Link
              href="#"
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-amber-200/30 hover:text-amber-200/50 transition-all ${isExpanded ? '' : 'justify-center'}`}
              title="Settings"
            >
              <SettingsIcon className="w-6 h-6 flex-shrink-0" />
              {isExpanded && <span className="text-sm font-medium">Settings</span>}
            </Link>
          </nav>

          <div className="pt-4" style={{ borderTop: '1px solid rgba(180, 140, 100, 0.1)' }}>
            <div className={`flex items-center ${isExpanded ? 'gap-3 px-4 py-2' : 'justify-center py-2'}`}>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-amber-100 text-sm font-medium flex-shrink-0"
                style={{ background: 'rgba(255, 251, 235, 0.1)' }}
              >
                U
              </div>
              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-100 truncate">User</p>
                  <p className="text-xs text-amber-200/40 truncate">user@example.com</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
