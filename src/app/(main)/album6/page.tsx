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

export default function Album6Page() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-serif font-bold text-amber-900 mb-3">
            Family Photo Album
          </h1>
          <p className="text-amber-700 text-lg">
            {mockEvents.length} memories preserved
          </p>
        </div>

        {/* Photo Book Shelf */}
        <div className="relative">
          {/* Shelf Surface */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-200 to-amber-300 rounded-t-3xl shadow-2xl border-t-4 border-amber-400" />
          
          {/* Books Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-32 relative z-10">
            {mockEvents.map((event, index) => (
              <Link
                key={event.id}
                href={`/album6/${event.id}`}
                className="group relative"
                onMouseEnter={() => setHoveredId(event.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Book Container with 3D Effect */}
                <div className={`
                  relative perspective-1000
                  transition-all duration-500
                  ${hoveredId === event.id ? 'transform translate-y-[-20px] scale-105' : ''}
                `}>
                  {/* Book Shadow */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 rounded-full blur-xl transition-all duration-500" 
                    style={{ 
                      transform: hoveredId === event.id ? 'scale(1.2)' : 'scale(1)',
                      opacity: hoveredId === event.id ? 0.3 : 0.2
                    }}
                  />
                  
                  {/* Book Spine/Binding */}
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-600 rounded-l-lg shadow-lg z-20" />
                  
                  {/* Book Cover */}
                  <div className={`
                    relative ml-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-r-lg shadow-2xl
                    border-2 border-amber-300
                    transition-all duration-500
                    ${hoveredId === event.id ? 'shadow-amber-500/50' : ''}
                  `}
                  style={{
                    transform: hoveredId === event.id ? 'rotateY(-5deg)' : 'rotateY(0deg)',
                    transformStyle: 'preserve-3d',
                  }}>
                    {/* Cover Image */}
                    <div className="aspect-[3/4] relative overflow-hidden rounded-r-lg">
                      <div className="w-full h-full bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200">
                        {event.coverUrl ? (
                          <img 
                            src={event.coverUrl} 
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <span className="text-6xl opacity-40">📷</span>
                              <div className="mt-4 w-24 h-1 bg-amber-400/30 mx-auto rounded-full" />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Vintage Photo Corner Clips */}
                      <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600/30" />
                      <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600/30" />
                      <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600/30" />
                      <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600/30" />
                      
                      {/* Badge */}
                      {event.hasRecap && (
                        <div className="absolute top-3 right-3">
                          <div className="px-2.5 py-1 bg-amber-900/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-amber-700 shadow-lg">
                            🎬 Video
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Book Title on Cover */}
                    <div className="p-4 bg-gradient-to-b from-amber-50/80 to-transparent backdrop-blur-sm">
                      <h3 className="text-lg font-serif font-bold text-amber-900 mb-1 line-clamp-2 group-hover:text-amber-700 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-xs text-amber-700/70 font-serif">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    
                    {/* Page Edges Effect */}
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
                    
                    {/* Hover Effect - Pages Peeking */}
                    {hoveredId === event.id && (
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-amber-50/60 rounded-r-lg transition-all duration-500" />
                    )}
                  </div>
                  
                  {/* Book Pages Stack Effect */}
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-50/40 rounded-r-lg -z-10 transform translate-x-1" />
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-50/20 rounded-r-lg -z-20 transform translate-x-2" />
                </div>
                
                {/* Book Info Card (appears on hover) */}
                <div className={`
                  mt-4 p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-amber-200
                  transition-all duration-300
                  ${hoveredId === event.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                `}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-amber-900">
                      {event.photoCount} photos
                    </span>
                    <span className="text-xs text-amber-600">
                      {event.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {event.contributors.slice(0, 3).map((name, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm"
                        >
                          {name[0]}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-amber-700">
                      {event.contributors.length} contributors
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Add New Book */}
        <div className="flex justify-center mt-12">
          <Link
            href="/capture"
            className="group relative perspective-1000"
          >
            <div className="relative">
              {/* Shadow */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 rounded-full blur-xl" />
              
              {/* Spine */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 rounded-l-lg shadow-lg z-20" />
              
              {/* Cover */}
              <div className="ml-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-r-lg shadow-2xl border-2 border-dashed border-amber-400 p-8 group-hover:shadow-amber-500/50 transition-all duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-300/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">+</span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-amber-900 mb-1">
                    New Album
                  </h3>
                  <p className="text-xs text-amber-700 font-serif">
                    Add memories
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Empty State */}
        {mockEvents.length === 0 && (
          <div className="text-center py-24">
            <div className="relative inline-block perspective-1000 mb-8">
              {/* Empty Book */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-amber-700 to-amber-600 rounded-l-lg shadow-lg" />
                <div className="ml-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-r-lg shadow-2xl border-2 border-amber-300 p-12">
                  <span className="text-7xl opacity-40">📖</span>
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-serif font-bold text-amber-900 mb-3">
              Your Photo Album Awaits
            </h2>
            <p className="text-amber-700 mb-8 max-w-md mx-auto text-lg font-serif">
              Start preserving your family memories in a beautiful photo book
            </p>
            <Link
              href="/capture"
              className="inline-flex px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all shadow-lg hover:shadow-xl font-serif font-semibold"
            >
              Create First Album
            </Link>
          </div>
        )}

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-orange-200/20 rounded-full blur-3xl" />
      </div>
      
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .rotateY-5 {
          transform: rotateY(-5deg);
        }
      `}</style>
    </div>
  );
}
