'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import EVAOrb from '@/components/EVAOrb';
import AnswerPromptModal from '@/components/AnswerPromptModal';

interface AlbumMember {
  id: string;
  name: string;
  relationship?: string;
  avatar_color: string;
}

interface FamilyPrompt {
  id: string;
  event_id: string;
  album_title: string;
  photo_id: string | null;
  photo: {
    id: string;
    thumbnail_url: string;
  } | null;
  from_member: AlbumMember | null;
  question: string;
  question_type: 'photo' | 'general';
  answered_at: string | null;
  answer_text: string | null;
  created_at: string;
}

// Diverse mock questions for demo - different family members, albums, photos
const MOCK_QUESTIONS: FamilyPrompt[] = [
  {
    id: 'mock-1',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p1',
    photo: { id: 'p1', thumbnail_url: '/pic1.PNG' },
    from_member: { id: 'm1', name: 'Sarah', relationship: 'daughter', avatar_color: '#f472b6' },
    question: "Who's the kid on the left? I don't recognize them.",
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p2',
    photo: { id: 'p2', thumbnail_url: '/pic2.PNG' },
    from_member: { id: 'm2', name: 'Michael', relationship: 'son', avatar_color: '#60a5fa' },
    question: 'What was grandma laughing about here?',
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p3',
    photo: { id: 'p3', thumbnail_url: '/pic3.PNG' },
    from_member: { id: 'm3', name: 'Emma', relationship: 'granddaughter', avatar_color: '#a78bfa' },
    question: 'Where was this Easter photo taken? The house looks so different now.',
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p4',
    photo: { id: 'p4', thumbnail_url: '/pic4.PNG' },
    from_member: { id: 'm1', name: 'Sarah', relationship: 'daughter', avatar_color: '#f472b6' },
    question: 'What year was this beach trip? I think I was there but I was really young.',
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-5',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p5',
    photo: { id: 'p5', thumbnail_url: '/pic5.jpg' },
    from_member: { id: 'm2', name: 'Michael', relationship: 'son', avatar_color: '#60a5fa' },
    question: "Who took this first day of school photo? Mom or Dad?",
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-6',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p6',
    photo: { id: 'p6', thumbnail_url: '/pic6.jpg' },
    from_member: { id: 'm3', name: 'Emma', relationship: 'granddaughter', avatar_color: '#a78bfa' },
    question: "Is that Uncle Joe in the background? I've never seen him that young!",
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-7',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p7',
    photo: { id: 'p7', thumbnail_url: '/pic7.jpg' },
    from_member: { id: 'm1', name: 'Sarah', relationship: 'daughter', avatar_color: '#f472b6' },
    question: 'What were we celebrating in this one? The cake looks amazing.',
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-8',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p8',
    photo: { id: 'p8', thumbnail_url: '/pic8.jpg' },
    from_member: { id: 'm2', name: 'Michael', relationship: 'son', avatar_color: '#60a5fa' },
    question: "Do you remember what happened right after this was taken? Mom always said there was a funny story.",
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-9',
    event_id: '41eef81d-d2ac-430a-a94e-9b962fd7bc05',
    album_title: 'Childhood Memories',
    photo_id: 'p9',
    photo: { id: 'p9', thumbnail_url: '/pic9.jpg' },
    from_member: { id: 'm3', name: 'Emma', relationship: 'granddaughter', avatar_color: '#a78bfa' },
    question: "What's the story behind this photo? Grandma always wanted to tell me but we never got the chance.",
    question_type: 'photo',
    answered_at: null,
    answer_text: null,
    created_at: new Date().toISOString(),
  },
];

export default function QuestionsPage() {
  const [prompts, setPrompts] = useState<FamilyPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<FamilyPrompt | null>(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);

  useEffect(() => {
    async function fetchPrompts() {
      try {
        const res = await fetch('/api/prompts');
        if (res.ok) {
          const data = await res.json();
          const apiPrompts = data.prompts || [];
          // Prefer diverse mock questions for demo; use API only when explicitly desired
          setPrompts(MOCK_QUESTIONS);
        } else {
          setPrompts(MOCK_QUESTIONS);
        }
      } catch (e) {
        console.error('Failed to fetch prompts:', e);
        setPrompts(MOCK_QUESTIONS);
      } finally {
        setLoading(false);
      }
    }
    fetchPrompts();
  }, []);

  const handleAnswerPrompt = (prompt: FamilyPrompt) => {
    setSelectedPrompt(prompt);
    setShowAnswerModal(true);
  };

  const handleAnswerSaved = () => {
    // Remove the answered prompt from the list
    setPrompts(prev => prev.filter(p => p.id !== selectedPrompt?.id));
    setShowAnswerModal(false);
    setSelectedPrompt(null);
  };

  return (
    <div className="min-h-screen" style={{ background: '#0d0b09' }}>
      {/* Subtle grain */}
      <div 
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      <div className="max-w-5xl mx-auto px-[4%] pt-28 md:pt-[96px] pb-12">
        {/* Page Header - matching album style */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📬</span>
          <h1 className="text-xl md:text-2xl text-white font-medium tracking-tight">
            Questions from Family
          </h1>
          {prompts.length > 0 && (
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(232, 220, 196, 0.2)', color: '#e8dcc4' }}
            >
              {prompts.length}
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <EVAOrb size={64} isSpeaking={true} />
              <p className="text-white/50 text-sm">Loading questions...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && prompts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'rgba(232, 220, 196, 0.1)' }}
            >
              <svg className="w-10 h-10" style={{ color: '#c9b896' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-white mb-2">Your inbox is empty</h2>
            <p className="text-white/50 text-sm max-w-sm mb-6">
              When family members send you questions about your memories, they&apos;ll appear here.
            </p>
            <Link
              href="/album"
              className="px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
              style={{ 
                background: 'linear-gradient(135deg, #e8dcc4 0%, #c9b896 100%)',
                color: '#1a1510'
              }}
            >
              Browse Your Albums
            </Link>
          </div>
        )}

        {/* Questions - horizontal rectangular rows */}
        {!loading && prompts.length > 0 && (
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                className="flex items-center gap-6 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg px-5 py-4 cursor-pointer transition-all group"
                onClick={() => handleAnswerPrompt(prompt)}
              >
                {/* Avatar */}
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                  style={{ backgroundColor: prompt.from_member?.avatar_color || '#c9b896' }}
                >
                  {prompt.from_member?.name?.charAt(0) || '?'}
                </div>
                
                {/* Content - flex-1 to fill space */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-white font-medium text-sm">
                      {prompt.from_member?.name || 'Family member'}
                    </span>
                    {prompt.from_member?.relationship && (
                      <span className="text-white/40 text-xs">
                        ({prompt.from_member.relationship})
                      </span>
                    )}
                    <span className="text-white/30 text-xs">
                      · {prompt.album_title}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed truncate">
                    &quot;{prompt.question}&quot;
                  </p>
                </div>
                
                {/* Photo thumbnail if exists */}
                {prompt.photo && (
                  <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={prompt.photo.thumbnail_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Answer button - inline */}
                <button 
                  className="px-4 py-2 rounded text-sm font-medium transition-colors flex-shrink-0"
                  style={{ 
                    background: 'rgba(232, 220, 196, 0.15)',
                    color: '#e8dcc4'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnswerPrompt(prompt);
                  }}
                >
                  Answer with EVA →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Answer Modal */}
      <AnswerPromptModal
        isOpen={showAnswerModal}
        onClose={() => {
          setShowAnswerModal(false);
          setSelectedPrompt(null);
        }}
        prompt={selectedPrompt}
        onAnswerSaved={handleAnswerSaved}
      />

      {/* EVA Orb - Fixed corner (matching /album style) */}
      <div className="fixed bottom-6 right-6 z-50">
        <EVAOrb size={120} />
      </div>
    </div>
  );
}
