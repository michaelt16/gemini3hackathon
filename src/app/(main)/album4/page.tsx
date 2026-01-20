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

export default function Album4Page() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-3">
            Memory Albums
          </h1>
          <p className="text-gray-600 text-lg">
            {mockEvents.length} collections • {mockEvents.reduce((sum, e) => sum + e.photoCount, 0)} photos
          </p>
        </div>

        {/* Card Grid with Hover Effects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockEvents.map((event, index) => (
            <Link
              key={event.id}
              href={`/album/${event.id}`}
              className="group relative"
              onMouseEnter={() => setSelectedId(event.id)}
              onMouseLeave={() => setSelectedId(null)}
            >
              <div className={`
                relative bg-white rounded-3xl overflow-hidden shadow-lg
                transition-all duration-500 ease-out
                ${selectedId === event.id ? 'scale-105 shadow-2xl' : 'hover:scale-102'}
                ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}
                group-hover:rotate-0
              `}>
                {/* Cover Image */}
                <div className="aspect-[3/4] relative overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-violet-200 via-fuchsia-200 to-pink-200">
                    {event.coverUrl ? (
                      <img 
                        src={event.coverUrl} 
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center">
                          <span className="text-5xl">📷</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Animated Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Floating Badge */}
                  {event.hasRecap && (
                    <div className="absolute top-4 right-4 transform group-hover:scale-110 transition-transform duration-300">
                      <div className="px-3 py-1.5 bg-white rounded-full shadow-lg backdrop-blur-sm">
                        <span className="text-sm font-bold text-gray-900">🎬 Video</span>
                      </div>
                    </div>
                  )}

                  {/* Photo Count Badge */}
                  <div className="absolute bottom-4 left-4 transform group-hover:translate-y-0 translate-y-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full">
                      <span className="text-sm font-semibold text-gray-900">{event.photoCount} photos</span>
                    </div>
                  </div>
                </div>
                
                {/* Content with Glass Effect */}
                <div className="p-6 bg-white/95 backdrop-blur-sm">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">
                    {event.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>•</span>
                    <span className="truncate">{event.location}</span>
                  </div>
                  
                  {/* Contributors with Animation */}
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {event.contributors.slice(0, 4).map((name, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-bold flex items-center justify-center border-3 border-white shadow-md transform group-hover:scale-110 transition-transform duration-300"
                          style={{ transitionDelay: `${i * 50}ms` }}
                        >
                          {name[0]}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {event.contributors.length} contributors
                    </span>
                  </div>
                </div>

                {/* Shine Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              </div>
            </Link>
          ))}
        </div>

        {/* Add New Card */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/capture"
            className="group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-violet-500"
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">+</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Create New Album
              </h3>
              <p className="text-sm text-gray-500">
                Start preserving memories
              </p>
            </div>
          </Link>
        </div>

        {/* Empty State */}
        {mockEvents.length === 0 && (
          <div className="text-center py-24">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
              <span className="text-6xl">📖</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Start Your Collection
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg">
              Create beautiful memory albums with AI-powered storytelling
            </p>
            <Link
              href="/capture"
              className="inline-flex px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-full hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              Create First Album
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
