'use client';

import Link from 'next/link';

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

export default function Album2Page() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Photo Albums
              </h1>
              <p className="text-gray-500">
                {mockEvents.reduce((sum, e) => sum + e.photoCount, 0)} memories captured
              </p>
            </div>
            <Link
              href="/capture"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md"
            >
              + Add
            </Link>
          </div>
        </div>

        {/* Masonry/Pinterest Style Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {mockEvents.map((event) => (
            <Link
              key={event.id}
              href={`/album/${event.id}`}
              className="group block break-inside-avoid mb-6 bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
            >
              {/* Cover Image - Variable Heights */}
              <div 
                className={`relative overflow-hidden ${
                  event.id === '1' ? 'aspect-[3/4]' : 
                  event.id === '2' ? 'aspect-[4/5]' : 
                  'aspect-[4/3]'
                }`}
              >
                <div className="w-full h-full bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200">
                  {event.coverUrl ? (
                    <img 
                      src={event.coverUrl} 
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl opacity-40">📷</span>
                    </div>
                  )}
                </div>
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-900">
                      View Album →
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  {event.hasRecap && (
                    <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-semibold rounded-full shadow-sm">
                      🎬
                    </span>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                  {event.title}
                </h3>
                
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>•</span>
                  <span>{event.location}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {event.contributors.slice(0, 2).map((name, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white"
                        >
                          {name[0]}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {event.photoCount} photos
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {mockEvents.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <span className="text-5xl">📸</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No albums yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start creating your first memory album
            </p>
            <Link
              href="/capture"
              className="inline-flex px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Create Album
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
