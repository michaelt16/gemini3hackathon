'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock events for now - will be replaced with real data
const mockEvents = [
  { id: '1', title: 'Summer 2024 Reunion', date: '2024-07-15', photoCount: 12 },
  { id: '2', title: 'Grandma\'s 80th Birthday', date: '2024-03-22', photoCount: 8 },
];

export default function CapturePage() {
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');

  const handleCreateEvent = () => {
    if (!newEventTitle.trim()) return;
    // TODO: Create event via API
    console.log('Creating event:', newEventTitle);
    setNewEventTitle('');
    setShowNewEvent(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 
          className="text-3xl font-semibold text-[var(--accent)] mb-2"
          style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
        >
          Capture Memories
        </h1>
        <p className="text-[var(--foreground)] opacity-60">
          Select an event or create a new one to start capturing stories
        </p>
      </div>

      {/* Create New Event */}
      <div className="mb-8">
        {showNewEvent ? (
          <div className="paper-texture p-6 rounded-xl border border-[var(--accent-light)] border-opacity-30">
            <h3 className="font-medium text-[var(--accent)] mb-4">New Event</h3>
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder="Event name (e.g., Summer 2024 Family Reunion)"
              className="w-full p-3 rounded-lg border border-[var(--accent-light)] border-opacity-30 bg-white focus:outline-none focus:border-[var(--accent)] mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateEvent}
                className="flex-1 py-2 px-4 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-light)] transition-colors"
              >
                Create Event
              </button>
              <button
                onClick={() => setShowNewEvent(false)}
                className="py-2 px-4 border border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:bg-opacity-5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewEvent(true)}
            className="w-full py-4 px-6 border-2 border-dashed border-[var(--accent-light)] text-[var(--accent)] rounded-xl hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:bg-opacity-5 transition-all"
          >
            <span className="text-2xl mr-2">+</span>
            Create New Event
          </button>
        )}
      </div>

      {/* Existing Events */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">
          Your Events
        </h2>
        
        {mockEvents.length === 0 ? (
          <div className="text-center py-12 text-[var(--foreground)] opacity-50">
            <div className="text-4xl mb-4">📷</div>
            <p>No events yet. Create your first one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockEvents.map((event) => (
              <Link
                key={event.id}
                href={`/capture/${event.id}`}
                className="block paper-texture p-4 rounded-xl border border-transparent hover:border-[var(--accent)] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-sm text-[var(--foreground)] opacity-50">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {event.photoCount > 0 && ` • ${event.photoCount} photos`}
                    </p>
                  </div>
                  <div className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Start Tip */}
      <div className="mt-12 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <h4 className="font-medium text-blue-800 mb-1">Quick Start</h4>
            <p className="text-sm text-blue-600">
              Create an event, then use your camera to scan through old photo albums. 
              Talk naturally about your memories - the AI will capture your stories automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
