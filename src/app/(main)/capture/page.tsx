'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock events for now - will be replaced with real data
const mockEvents = [
  { id: '1', title: 'Summer 2024 Reunion', date: '2024-07-15', photoCount: 12, coverUrl: '/testphoto.jpg' },
  { id: '2', title: 'Grandma\'s 80th Birthday', date: '2024-03-22', photoCount: 8, coverUrl: '/pic1.PNG' },
];

export default function CapturePage() {
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');

  const handleCreateEvent = () => {
    if (!newEventTitle.trim()) return;
    console.log('Creating event:', newEventTitle);
    setNewEventTitle('');
    setShowNewEvent(false);
  };

  return (
    <div 
      className="min-h-screen pt-24 pb-12 px-6 md:px-10"
      style={{ background: '#0d0b09' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 
            className="text-4xl md:text-5xl text-white font-light mb-3"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Capture Memories
          </h1>
          <p className="text-white/50 text-lg">
            Select a memory to continue, or create a new one
          </p>
        </div>

        {/* Create New Event */}
        <div className="mb-10">
          {showNewEvent ? (
            <div 
              className="p-6 rounded-xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <h3 
                className="text-white text-lg mb-4"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                New Memory
              </h3>
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Give it a name (e.g., Summer 2024 Family Reunion)"
                className="w-full p-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50 mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateEvent}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create Memory
                </button>
                <button
                  onClick={() => setShowNewEvent(false)}
                  className="py-3 px-6 border border-white/20 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewEvent(true)}
              className="w-full py-6 px-8 border-2 border-dashed border-white/20 text-white/60 rounded-xl hover:border-green-500/50 hover:text-green-400 hover:bg-green-500/5 transition-all group"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center group-hover:border-green-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-lg">Create New Memory</span>
              </div>
            </button>
          )}
        </div>

        {/* Existing Events */}
        <div>
          <h2 className="text-white/40 text-sm font-medium uppercase tracking-widest mb-6">
            Your Memories
          </h2>
          
          {mockEvents.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
              <p>No memories yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/capture/${event.id}`}
                  className="group block rounded-xl overflow-hidden border border-white/10 hover:border-green-500/30 transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {/* Cover image */}
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img 
                      src={event.coverUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div 
                        className="w-16 h-16 rounded-full bg-green-500/90 flex items-center justify-center"
                        style={{ boxShadow: '0 0 30px rgba(34,197,94,0.4)' }}
                      >
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-5">
                    <h3 
                      className="text-white text-lg font-medium mb-1 group-hover:text-green-400 transition-colors"
                      style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                    >
                      {event.title}
                    </h3>
                    <p className="text-white/40 text-sm">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {event.photoCount > 0 && ` · ${event.photoCount} photos`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Info section */}
        <div 
          className="mt-12 p-6 rounded-xl border border-green-500/20"
          style={{ background: 'rgba(34,197,94,0.05)' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h4 
                className="text-green-400 font-medium mb-2"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                How it works
              </h4>
              <p className="text-white/50 text-sm leading-relaxed">
                Point your camera at old photo albums while talking naturally about your memories. 
                The AI listens, asks thoughtful questions, and helps you capture the stories behind each photo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle grain */}
      <div 
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
}
