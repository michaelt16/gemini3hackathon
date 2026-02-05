'use client';

import { useState } from 'react';
import Link from 'next/link';
import EVAOrb from '@/components/EVAOrb';

// Mock data for the concept demo
const MOCK_MEMORIES = [
  {
    id: '1',
    image: '/pic1.PNG',
    date: 'Summer 1987',
    caption: 'The day we brought you home',
    story: 'Your grandmother held you for the first time that afternoon. She said you had your father\'s eyes...',
    hasStory: true,
  },
  {
    id: '2',
    image: '/pic2.PNG',
    date: 'Christmas 1989',
    caption: 'Your first Christmas tree',
    story: '',
    hasStory: false,
  },
  {
    id: '3',
    image: '/pic3.PNG',
    date: 'Spring 1991',
    caption: 'Easter at Grandma\'s house',
    story: 'We drove all the way from Ohio. You slept the whole way, and woke up just as we pulled into the driveway...',
    hasStory: true,
  },
  {
    id: '4',
    image: '/pic4.PNG',
    date: 'July 1992',
    caption: 'Beach vacation',
    story: '',
    hasStory: false,
  },
  {
    id: '5',
    image: '/pic5.PNG',
    date: 'Fall 1993',
    caption: 'First day of school',
    story: 'You were so nervous that morning. But by the time I picked you up, you had already made three friends...',
    hasStory: true,
  },
];

const MOCK_QUESTIONS = [
  { id: '1', from: 'Sarah', avatar: '#f472b6', question: 'Who\'s the kid on the left in the beach photo?' },
  { id: '2', from: 'Michael', avatar: '#60a5fa', question: 'What was grandma laughing about here?' },
];

export default function AlbumV2Page() {
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [isEVAActive, setIsEVAActive] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Warm paper texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30 mix-blend-multiply"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      />

      {/* Header - Warm, inviting */}
      <header className="sticky top-0 z-40 bg-[#faf8f5]/95 backdrop-blur-sm border-b border-amber-200/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/album" className="text-amber-800/50 hover:text-amber-800 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-serif text-amber-900">Childhood Memories</h1>
                <p className="text-sm text-amber-700/60">1987 - 1995 • 12 memories</p>
              </div>
            </div>
            
            {/* EVA Companion - Softer presentation */}
            <button 
              onClick={() => setIsEVAActive(!isEVAActive)}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-amber-100/80 hover:bg-amber-200/80 transition-colors"
            >
              <EVAOrb size={28} isSpeaking={isEVAActive} />
              <span className="text-amber-800 text-sm font-medium">Talk to EVA</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Family Questions - Gentle notification */}
        {MOCK_QUESTIONS.length > 0 && (
          <div className="mb-10 p-5 bg-white/80 rounded-2xl border border-amber-200/50 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <h3 className="text-amber-900 font-medium">Your family is curious...</h3>
            </div>
            <div className="space-y-3">
              {MOCK_QUESTIONS.map(q => (
                <div key={q.id} className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: q.avatar }}
                  >
                    {q.from.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-900 text-sm">&ldquo;{q.question}&rdquo;</p>
                    <p className="text-amber-600/60 text-xs mt-0.5">from {q.from}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-full bg-amber-200/50 hover:bg-amber-200 text-amber-800 text-xs font-medium transition-colors">
                    Answer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Journal - Scrapbook style */}
        <div className="space-y-16">
          {MOCK_MEMORIES.map((memory, idx) => (
            <article 
              key={memory.id}
              className={`relative ${idx % 2 === 1 ? 'ml-auto mr-0' : 'mr-auto ml-0'} max-w-2xl`}
            >
              {/* Date marker - handwritten style */}
              <div className="mb-4">
                <span className="inline-block px-4 py-1.5 bg-amber-100/80 rounded-full text-amber-800 text-sm font-medium" style={{ fontFamily: 'Georgia, serif' }}>
                  {memory.date}
                </span>
              </div>

              {/* Photo with tape/corner effect */}
              <div 
                className={`relative group cursor-pointer ${idx % 2 === 1 ? '-rotate-1' : 'rotate-1'} hover:rotate-0 transition-transform duration-300`}
                onClick={() => setSelectedMemory(selectedMemory === memory.id ? null : memory.id)}
              >
                {/* Paper/polaroid frame */}
                <div className="bg-white p-3 pb-16 rounded shadow-lg">
                  {/* Tape effect */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-amber-200/60 rounded-sm transform rotate-2" />
                  
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
                    <img 
                      src={memory.image} 
                      alt={memory.caption}
                      className="w-full h-full object-cover filter sepia-[0.15] contrast-[1.05]"
                    />
                    
                    {/* Story indicator */}
                    {memory.hasStory && (
                      <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-amber-500/90 flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-amber-900/0 group-hover:bg-amber-900/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-amber-900/70 px-4 py-2 rounded-full">
                        {memory.hasStory ? 'Read the story' : 'Add a story'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Caption - handwritten style */}
                  <p className="absolute bottom-4 left-0 right-0 text-center text-amber-800" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    {memory.caption}
                  </p>
                </div>
              </div>

              {/* Expanded story */}
              {selectedMemory === memory.id && memory.hasStory && (
                <div className="mt-6 p-6 bg-white/90 rounded-xl border border-amber-200/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-4">
                    <EVAOrb size={40} isSpeaking={false} />
                    <div className="flex-1">
                      <p className="text-amber-900 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                        {memory.story}
                      </p>
                      <button className="mt-4 flex items-center gap-2 text-amber-600 hover:text-amber-800 text-sm transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Listen to EVA narrate
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add story prompt for photos without stories */}
              {selectedMemory === memory.id && !memory.hasStory && (
                <div className="mt-6 p-6 bg-amber-50/80 rounded-xl border border-amber-200/50 border-dashed">
                  <div className="text-center">
                    <EVAOrb size={48} isSpeaking={false} />
                    <p className="mt-4 text-amber-800 font-medium">This memory is waiting for its story</p>
                    <p className="mt-1 text-amber-600/70 text-sm">Tell EVA what you remember about this moment</p>
                    <button className="mt-4 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-full transition-colors">
                      Tell the Story
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Add more memories */}
        <div className="mt-20 text-center">
          <button className="group px-6 py-4 bg-white/80 hover:bg-white rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-400 transition-colors">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-amber-800 font-medium">Add more memories</p>
            <p className="text-amber-600/60 text-sm mt-1">Upload photos to grow your collection</p>
          </button>
        </div>
      </main>

      {/* EVA Companion Panel - Slides in from right */}
      {isEVAActive && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300">
          <div className="h-full flex flex-col">
            {/* EVA Header */}
            <div className="p-5 border-b border-amber-200/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EVAOrb size={40} isSpeaking={true} />
                <div>
                  <h3 className="text-amber-900 font-medium">EVA</h3>
                  <p className="text-amber-600/60 text-xs">Your memory companion</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEVAActive(false)}
                className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conversation area */}
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="space-y-4">
                <div className="bg-amber-50 rounded-2xl rounded-tl-none p-4">
                  <p className="text-amber-900 text-sm leading-relaxed">
                    Welcome back to your Childhood Memories album. I noticed Sarah asked about the beach photo — would you like to answer her question?
                  </p>
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="p-5 border-t border-amber-200/50">
              <div className="flex items-center gap-3">
                <button className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <p className="text-amber-600/60 text-sm">Tap to speak with EVA</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Concept label */}
      <div className="fixed bottom-4 left-4 px-3 py-1.5 bg-amber-900/90 text-amber-100 text-xs rounded-full">
        Memory Journal Concept (v2 Mock UI)
      </div>
    </div>
  );
}
