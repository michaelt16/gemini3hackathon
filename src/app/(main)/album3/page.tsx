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
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export default function Album3Page() {
  const groupedByYear = mockEvents.reduce((acc, event) => {
    const year = new Date(event.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {} as Record<number, typeof mockEvents>);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Timeline
            </h1>
            <Link
              href="/capture"
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              + New Memory
            </Link>
          </div>
          <p className="text-gray-500">
            Your memories organized by time
          </p>
        </div>

        {/* Timeline View */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          <div className="space-y-12">
            {Object.entries(groupedByYear)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([year, events]) => (
                <div key={year} className="relative">
                  {/* Year Label */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-lg z-10 relative">
                      {year}
                    </div>
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-sm text-gray-500 font-medium">
                      {events.length} {events.length === 1 ? 'memory' : 'memories'}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-8 ml-24">
                    {events.map((event, idx) => (
                      <Link
                        key={event.id}
                        href={`/album/${event.id}`}
                        className="group block"
                      >
                        <div className="flex gap-6">
                          {/* Date Dot */}
                          <div className="relative flex-shrink-0">
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-4 h-4 rounded-full bg-emerald-600 border-4 border-gray-50 shadow-md z-10" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-4 w-0.5 h-full bg-gray-200" style={{ height: idx === events.length - 1 ? '0' : '100%' }} />
                          </div>

                          {/* Content Card */}
                          <div className="flex-1 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group-hover:scale-[1.02]">
                            <div className="flex">
                              {/* Image */}
                              <div className="w-48 h-48 flex-shrink-0 bg-gradient-to-br from-emerald-100 to-teal-100 relative overflow-hidden">
                                {event.coverUrl ? (
                                  <img 
                                    src={event.coverUrl} 
                                    alt={event.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl opacity-30">📸</span>
                                  </div>
                                )}
                                {event.hasRecap && (
                                  <div className="absolute top-2 right-2">
                                    <span className="px-2 py-1 bg-black/70 text-white text-xs rounded-full backdrop-blur-sm">
                                      🎬
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 p-6">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                                    {event.title}
                                  </h3>
                                </div>
                                
                                <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                                  <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                  <span>•</span>
                                  <span>{event.location}</span>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                      {event.contributors.slice(0, 3).map((name, i) => (
                                        <div
                                          key={i}
                                          className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center border-2 border-white"
                                        >
                                          {name[0]}
                                        </div>
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                      {event.contributors.length} people
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {event.photoCount} photos
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Empty State */}
        {mockEvents.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-5xl">📅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No memories yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start building your timeline
            </p>
            <Link
              href="/capture"
              className="inline-flex px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Add First Memory
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
