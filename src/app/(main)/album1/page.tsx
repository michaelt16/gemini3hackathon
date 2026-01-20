'use client';

import Link from 'next/link';
import { useState } from 'react';

// Mock events
const mockEvents = [
  { 
    id: '1', 
    title: 'Summer 2024 Reunion', 
    date: '2024-07-15', 
    location: 'Lake Tahoe, CA',
    photoCount: 12,
    contributors: ['Mom', 'Dad', 'Sarah'],
    hasSummary: true,
    hasRecap: true,
    coverUrl: null,
  },
  { 
    id: '2', 
    title: 'Grandma\'s 80th Birthday', 
    date: '2024-03-22', 
    location: 'Chicago, IL',
    photoCount: 8,
    contributors: ['Uncle Joe', 'Aunt Mary'],
    hasSummary: true,
    hasRecap: false,
    coverUrl: null,
  },
  { 
    id: '3', 
    title: 'Christmas 2023', 
    date: '2023-12-25', 
    location: 'Home',
    photoCount: 24,
    contributors: ['Mom', 'Dad', 'Grandpa', 'Sarah', 'Tom'],
    hasSummary: true,
    hasRecap: true,
    coverUrl: null,
  },
];

export default function Album1Page() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar Navigation */}
      <aside className={`
        fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-full flex flex-col p-6">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Memory Keeper</h1>
            <p className="text-sm text-gray-500">Preserve your stories</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            <Link
              href="/album1"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 text-gray-900 font-medium transition-colors"
            >
              <span>📚</span>
              <span>Albums</span>
            </Link>
            <Link
              href="/capture"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>📷</span>
              <span>Capture</span>
            </Link>
            <Link
              href="/playground"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>🎮</span>
              <span>Playground</span>
            </Link>
            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/album2"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
              >
                <span>🎨</span>
                <span>View Style 2</span>
              </Link>
              <Link
                href="/album3"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
              >
                <span>📅</span>
                <span>View Style 3</span>
              </Link>
              <Link
                href="/album4"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
              >
                <span>✨</span>
                <span>View Style 4</span>
              </Link>
              <Link
                href="/album5"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
              >
                <span>🖼️</span>
                <span>View Style 5</span>
              </Link>
              <Link
                href="/album6"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
              >
                <span>📖</span>
                <span>View Style 6</span>
              </Link>
            </div>
          </nav>

          {/* User Section */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                U
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">User</p>
                <p className="text-xs text-gray-500 truncate">user@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xl">☰</span>
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Albums</h2>
                  <p className="text-sm text-gray-500">{mockEvents.length} collections</p>
                </div>
              </div>
              <Link
                href="/capture"
                className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all shadow-sm hover:shadow-md font-medium text-sm"
              >
                + New Album
              </Link>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 sm:p-6 lg:p-8">

          {/* Minimalist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockEvents.map((event) => (
            <Link
              key={event.id}
              href={`/album/${event.id}`}
              className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              onMouseEnter={() => setHoveredId(event.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Cover Image */}
              <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
                {event.coverUrl ? (
                  <img 
                    src={event.coverUrl} 
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-4xl">📸</span>
                    </div>
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Badge */}
                {event.hasRecap && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold rounded-full">
                      🎬 Video
                    </span>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {event.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>•</span>
                  <span>{event.photoCount} photos</span>
                </div>
                
                {/* Contributors */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {event.contributors.slice(0, 3).map((name, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center border-2 border-white shadow-sm"
                      >
                        {name[0]}
                      </div>
                    ))}
                    {event.contributors.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold flex items-center justify-center border-2 border-white">
                        +{event.contributors.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {event.contributors.length} people
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

          {/* Empty State */}
          {mockEvents.length === 0 && (
            <div className="text-center py-24">
              <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <span className="text-6xl">📖</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Start Your Memory Collection
              </h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg">
                Capture and preserve your family stories with AI-powered photo albums.
              </p>
              <Link
                href="/capture"
                className="inline-flex px-8 py-4 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                Create First Album
              </Link>
            </div>
          )}
        </main>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
