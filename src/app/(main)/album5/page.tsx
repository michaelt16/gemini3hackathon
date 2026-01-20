'use client';

import Link from 'next/link';
import { useState } from 'react';

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

export default function Album5Page() {
  const [featuredId, setFeaturedId] = useState(mockEvents[0]?.id || null);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="pt-12 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold mb-2">My Albums</h1>
              <p className="text-gray-400 text-lg">
                {mockEvents.length} collections
              </p>
            </div>
            <Link
              href="/capture"
              className="px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-lg"
            >
              + New Album
            </Link>
          </div>
        </div>

        {/* Featured Hero Image */}
        {featuredId && (
          <div className="mb-12 relative h-96 rounded-2xl overflow-hidden shadow-2xl">
            {(() => {
              const featured = mockEvents.find(e => e.id === featuredId);
              if (!featured) return null;
              
              return (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative">
                  {featured.coverUrl ? (
                    <img 
                      src={featured.coverUrl} 
                      alt={featured.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-8xl opacity-30">📸</span>
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex items-center gap-3 mb-3">
                      {featured.hasRecap && (
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-sm font-semibold rounded-full border border-white/30">
                          🎬 Video Available
                        </span>
                      )}
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-sm font-semibold rounded-full border border-white/30">
                        {featured.photoCount} Photos
                      </span>
                    </div>
                    <Link href={`/album/${featured.id}`}>
                      <h2 className="text-4xl font-bold mb-2 hover:text-blue-300 transition-colors">
                        {featured.title}
                      </h2>
                    </Link>
                    <p className="text-gray-300 text-lg mb-4">
                      {new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {featured.location}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {featured.contributors.slice(0, 4).map((name, i) => (
                          <div
                            key={i}
                            className="w-10 h-10 rounded-full bg-white text-gray-900 text-sm font-bold flex items-center justify-center border-2 border-gray-900"
                          >
                            {name[0]}
                          </div>
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {featured.contributors.length} contributors
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Grid of Albums */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
          {mockEvents.map((event) => (
            <Link
              key={event.id}
              href={`/album/${event.id}`}
              onClick={() => setFeaturedId(event.id)}
              className={`
                group relative aspect-square rounded-xl overflow-hidden
                transition-all duration-300
                ${featuredId === event.id 
                  ? 'ring-4 ring-blue-500 scale-105' 
                  : 'hover:scale-105 hover:ring-2 hover:ring-white/50'
                }
              `}
            >
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800">
                {event.coverUrl ? (
                  <img 
                    src={event.coverUrl} 
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl opacity-40">📷</span>
                  </div>
                )}
              </div>
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-white font-bold mb-1 line-clamp-1">
                  {event.title}
                </h3>
                <p className="text-gray-300 text-xs">
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>

              {/* Badge */}
              {event.hasRecap && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded-full">
                    🎬
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Add New */}
        <div className="pb-12">
          <Link
            href="/capture"
            className="block aspect-square rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors border-2 border-dashed border-gray-600 hover:border-gray-500 flex items-center justify-center group"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 group-hover:bg-gray-600 flex items-center justify-center transition-colors">
                <span className="text-3xl">+</span>
              </div>
              <p className="text-gray-400 group-hover:text-gray-300 font-medium">
                New Album
              </p>
            </div>
          </Link>
        </div>

        {/* Empty State */}
        {mockEvents.length === 0 && (
          <div className="text-center py-24">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-6xl">📖</span>
            </div>
            <h2 className="text-3xl font-bold mb-3">
              Start Your Collection
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
              Create beautiful memory albums with AI-powered storytelling
            </p>
            <Link
              href="/capture"
              className="inline-flex px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-lg"
            >
              Create First Album
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
