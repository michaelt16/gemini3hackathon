'use client';

import Link from 'next/link';

// Mock events for now - will be replaced with real data
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

export default function AlbumPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-3xl font-semibold text-[var(--accent)] mb-2"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Family Album
          </h1>
          <p className="text-[var(--foreground)] opacity-60">
            {mockEvents.length} events • {mockEvents.reduce((sum, e) => sum + e.photoCount, 0)} photos
          </p>
        </div>
        
        <Link
          href="/capture"
          className="py-2 px-4 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-light)] transition-colors text-sm"
        >
          + Add Memories
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="paper-texture p-4 rounded-xl text-center">
          <div className="text-3xl font-semibold text-[var(--accent)]">
            {mockEvents.length}
          </div>
          <div className="text-sm text-[var(--foreground)] opacity-60">Events</div>
        </div>
        <div className="paper-texture p-4 rounded-xl text-center">
          <div className="text-3xl font-semibold text-[var(--accent)]">
            {mockEvents.reduce((sum, e) => sum + e.photoCount, 0)}
          </div>
          <div className="text-sm text-[var(--foreground)] opacity-60">Photos</div>
        </div>
        <div className="paper-texture p-4 rounded-xl text-center">
          <div className="text-3xl font-semibold text-[var(--accent)]">
            {new Set(mockEvents.flatMap(e => e.contributors)).size}
          </div>
          <div className="text-sm text-[var(--foreground)] opacity-60">Contributors</div>
        </div>
        <div className="paper-texture p-4 rounded-xl text-center">
          <div className="text-3xl font-semibold text-[var(--accent)]">
            {mockEvents.filter(e => e.hasRecap).length}
          </div>
          <div className="text-sm text-[var(--foreground)] opacity-60">Recap Videos</div>
        </div>
      </div>

      {/* Event Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockEvents.map((event) => (
          <Link
            key={event.id}
            href={`/album/${event.id}`}
            className="group paper-texture rounded-xl overflow-hidden border border-transparent hover:border-[var(--accent)] transition-all hover:shadow-lg"
          >
            {/* Cover Image */}
            <div className="aspect-video bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] relative overflow-hidden">
              {event.coverUrl ? (
                <img 
                  src={event.coverUrl} 
                  alt={event.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl opacity-30">📷</span>
                </div>
              )}
              
              {/* Badge overlays */}
              <div className="absolute top-3 right-3 flex gap-2">
                {event.hasRecap && (
                  <span className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                    🎬 Recap
                  </span>
                )}
              </div>
              
              <div className="absolute bottom-3 left-3">
                <span className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                  {event.photoCount} photos
                </span>
              </div>
            </div>
            
            {/* Event Info */}
            <div className="p-4">
              <h3 
                className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors mb-1"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                {event.title}
              </h3>
              
              <p className="text-sm text-[var(--foreground)] opacity-50 mb-3">
                {new Date(event.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                {event.location && ` • ${event.location}`}
              </p>
              
              {/* Contributors */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {event.contributors.slice(0, 3).map((name, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center border-2 border-white"
                      title={name}
                    >
                      {name[0]}
                    </div>
                  ))}
                  {event.contributors.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-light)] text-white text-xs flex items-center justify-center border-2 border-white">
                      +{event.contributors.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[var(--foreground)] opacity-50">
                  {event.contributors.length} contributor{event.contributors.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {mockEvents.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--accent)] bg-opacity-10 flex items-center justify-center">
            <span className="text-5xl">📖</span>
          </div>
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            No memories yet
          </h2>
          <p className="text-[var(--foreground)] opacity-50 mb-6 max-w-md mx-auto">
            Start capturing stories about your family photos to build your living memory album.
          </p>
          <Link
            href="/capture"
            className="inline-flex py-3 px-6 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-light)] transition-colors"
          >
            Start Capturing
          </Link>
        </div>
      )}
    </div>
  );
}
