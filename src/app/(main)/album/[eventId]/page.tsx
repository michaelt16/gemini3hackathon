'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Mock data - will be replaced with real API data
const mockEventData = {
  '1': {
    id: '1',
    title: 'Summer 2024 Reunion',
    date: '2024-07-15',
    location: 'Lake Tahoe, CA',
    summary: 'A wonderful weekend where four generations came together at the lake house. Grandpa shared stories about his first visit here in 1962, and the kids learned to fish for the first time.',
    timeline: [
      { time: '1962', event: 'Grandpa first visited Lake Tahoe' },
      { time: 'July 15, 2024', event: 'Family reunion weekend begins' },
      { time: 'July 16, 2024', event: 'Kids caught their first fish' },
    ],
    people: ['Grandpa Joe', 'Grandma Ruth', 'Dad', 'Mom', 'Sarah', 'Tommy'],
    contributors: [
      { name: 'Mom', snippets: 3 },
      { name: 'Dad', snippets: 2 },
      { name: 'Sarah', snippets: 1 },
    ],
    photos: Array(12).fill(null).map((_, i) => ({ id: `p${i}`, animated: i < 4 })),
    hasRecap: true,
  },
  '2': {
    id: '2',
    title: "Grandma's 80th Birthday",
    date: '2024-03-22',
    location: 'Chicago, IL',
    summary: 'A surprise party that brought tears of joy. Family flew in from 5 different states.',
    timeline: [
      { time: 'March 22, 1944', event: 'Grandma Ruth was born' },
      { time: 'March 22, 2024', event: 'Surprise 80th birthday party' },
    ],
    people: ['Grandma Ruth', 'Uncle Joe', 'Aunt Mary', 'Cousins'],
    contributors: [
      { name: 'Uncle Joe', snippets: 4 },
      { name: 'Aunt Mary', snippets: 2 },
    ],
    photos: Array(8).fill(null).map((_, i) => ({ id: `p${i}`, animated: i < 2 })),
    hasRecap: false,
  },
};

type Tab = 'overview' | 'photos' | 'timeline' | 'contributors';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const event = mockEventData[eventId as keyof typeof mockEventData] || mockEventData['1'];

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'photos', label: 'Photos', icon: '🖼️' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'contributors', label: 'Contributors', icon: '👥' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/album" className="text-sm text-[var(--accent)] hover:underline mb-2 inline-block">
          ← Back to Album
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--accent)] mb-1" style={{ fontFamily: 'var(--font-crimson)' }}>
              {event.title}
            </h1>
            <p className="text-[var(--foreground)] opacity-60">
              {new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {event.location && ` • ${event.location}`}
            </p>
          </div>
          {event.hasRecap && (
            <button className="py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm hover:opacity-90">
              🎬 Watch Recap
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--accent)] border-opacity-20 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--foreground)] opacity-60 hover:opacity-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="paper-texture p-6 rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-3">Story Summary</h3>
            <p className="text-[var(--foreground)] leading-relaxed">{event.summary}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="paper-texture p-4 rounded-xl">
              <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">People ({event.people.length})</h3>
              <div className="flex flex-wrap gap-2">
                {event.people.map((person, i) => (
                  <span key={i} className="px-3 py-1 bg-[var(--accent)] bg-opacity-10 rounded-full text-sm">{person}</span>
                ))}
              </div>
            </div>
            <div className="paper-texture p-4 rounded-xl">
              <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">Stats</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="opacity-60">Photos:</span> {event.photos.length}</div>
                <div><span className="opacity-60">Animated:</span> {event.photos.filter(p => p.animated).length}</div>
                <div><span className="opacity-60">Contributors:</span> {event.contributors.length}</div>
                <div><span className="opacity-60">Recap:</span> {event.hasRecap ? 'Yes' : 'Not yet'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {event.photos.map((photo, i) => (
            <div key={photo.id} className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">📷</div>
              {photo.animated && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">✨ Animated</div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="paper-texture p-6 rounded-xl">
          <div className="space-y-4">
            {event.timeline.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-24 text-sm text-[var(--accent)] font-medium shrink-0">{item.time}</div>
                <div className="flex-1 pb-4 border-l-2 border-[var(--accent)] border-opacity-30 pl-4 -ml-px">
                  <div className="w-3 h-3 bg-[var(--accent)] rounded-full -ml-[22px] mb-2" />
                  <p className="text-[var(--foreground)]">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contributors' && (
        <div className="space-y-4">
          {event.contributors.map((c, i) => (
            <div key={i} className="paper-texture p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-medium">{c.name[0]}</div>
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-[var(--foreground)] opacity-50">{c.snippets} stories shared</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex gap-3 justify-center">
        <Link href={`/capture/${event.id}`} className="py-2 px-4 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-sm hover:bg-[var(--accent)] hover:bg-opacity-5">
          + Add More Stories
        </Link>
        {!event.hasRecap && (
          <button className="py-2 px-4 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent-light)]">
            Generate Recap Video
          </button>
        )}
      </div>
    </div>
  );
}
