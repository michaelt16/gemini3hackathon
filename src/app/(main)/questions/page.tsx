'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import EVAOrb from '@/components/EVAOrb';
import AnswerPromptModal from '@/components/AnswerPromptModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentUser } from '@/hooks/use-current-user';

interface Member {
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
  from_member: Member | null;
  to_member: Member | null;
  question: string;
  question_type: 'photo' | 'general';
  answered_at: string | null;
  answer_text: string | null;
  created_at: string;
}

type TabType = 'for-me' | 'awaiting';

interface Album {
  id: string;
  title: string;
}

interface AlbumPhoto {
  id: string;
  thumbnail_url: string;
  original_url: string;
  summary?: string;
}

export default function QuestionsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user: currentUser, loaded: userLoaded } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabType>('for-me');
  const [forMePrompts, setForMePrompts] = useState<FamilyPrompt[]>([]);
  const [awaitingPrompts, setAwaitingPrompts] = useState<FamilyPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<FamilyPrompt | null>(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);

  // Ask Question state
  const [showAskModal, setShowAskModal] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Member[]>([]);
  const [askAlbumId, setAskAlbumId] = useState('');
  const [askAlbumPhotos, setAskAlbumPhotos] = useState<AlbumPhoto[]>([]);
  const [askPhotoId, setAskPhotoId] = useState<string | null>(null);
  const [askPhotosLoading, setAskPhotosLoading] = useState(false);
  const [askMemberId, setAskMemberId] = useState('');
  const [askText, setAskText] = useState('');
  const [askSending, setAskSending] = useState(false);

  const fetchPrompts = useCallback(async () => {
    if (!userLoaded) return;
    setLoading(true);
    try {
      // Fetch questions FOR the current user (they need to answer)
      const forMeRes = await fetch(`/api/prompts?for_user=${currentUser.id}&include_answered=true`);
      // Fetch questions FROM the current user (awaiting others' responses)
      const fromMeRes = await fetch(`/api/prompts?from_user=${currentUser.id}&include_answered=true`);

      if (forMeRes.ok) {
        const data = await forMeRes.json();
        setForMePrompts(data.prompts || []);
      }

      if (fromMeRes.ok) {
        const data = await fromMeRes.json();
        setAwaitingPrompts(data.prompts || []);
      }
    } catch (e) {
      console.error('Failed to fetch prompts:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, userLoaded]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Fetch albums and family members for "Ask" modal
  useEffect(() => {
    const loadData = async () => {
      const [albumRes, memberRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/auth/members'),
      ]);
      if (albumRes.ok) {
        const data = await albumRes.json();
        setAlbums((Array.isArray(data) ? data : []).map((e: { id: string; title: string }) => ({ id: e.id, title: e.title })));
      }
      if (memberRes.ok) {
        const data = await memberRes.json();
        setFamilyMembers(Array.isArray(data) ? data.filter((m: Member) => m.id !== currentUser.id) : []);
      }
    };
    if (userLoaded) loadData();
  }, [userLoaded, currentUser.id]);

  // Fetch photos when album changes
  useEffect(() => {
    if (!askAlbumId) {
      setAskAlbumPhotos([]);
      setAskPhotoId(null);
      return;
    }
    const loadPhotos = async () => {
      setAskPhotosLoading(true);
      setAskPhotoId(null);
      try {
        const res = await fetch(`/api/events/${askAlbumId}/photos`);
        if (res.ok) {
          const data = await res.json();
          setAskAlbumPhotos((data.photos || []).map((p: any) => ({
            id: p.id,
            thumbnail_url: p.thumbnail_url || p.original_url || '/testphoto.jpg',
            original_url: p.original_url || '/testphoto.jpg',
            summary: p.summary,
          })));
        }
      } catch { /* ignore */ }
      setAskPhotosLoading(false);
    };
    loadPhotos();
  }, [askAlbumId]);

  const handleSendQuestion = async () => {
    if (!askText.trim() || !askAlbumId) return;
    setAskSending(true);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: askAlbumId,
          photo_id: askPhotoId || null,
          from_member_id: currentUser.id,
          to_member_id: askMemberId || null,
          question: askText.trim(),
          question_type: askPhotoId ? 'photo' : 'general',
        }),
      });
      if (res.ok) {
        setShowAskModal(false);
        setAskText('');
        setAskAlbumId('');
        setAskPhotoId(null);
        setAskMemberId('');
        fetchPrompts();
        // Dispatch event so feed can update
        window.dispatchEvent(new Event('questions-updated'));
      }
    } catch (e) {
      console.error('Failed to send question:', e);
    } finally {
      setAskSending(false);
    }
  };

  const handleAnswerPrompt = (prompt: FamilyPrompt) => {
    setSelectedPrompt(prompt);
    setShowAnswerModal(true);
  };

  const handleAnswerSaved = (answerText: string) => {
    // Update local state with the real answer text
    setForMePrompts(prev => prev.map(p =>
      p.id === selectedPrompt?.id
        ? { ...p, answered_at: new Date().toISOString(), answer_text: answerText }
        : p
    ));
    setShowAnswerModal(false);
    setSelectedPrompt(null);
    // Refetch to ensure data is fresh
    setTimeout(() => fetchPrompts(), 500);
  };

  const currentPrompts = activeTab === 'for-me' ? forMePrompts : awaitingPrompts;
  const unansweredForMe = forMePrompts.filter(p => !p.answered_at).length;
  const unansweredAwaiting = awaitingPrompts.filter(p => !p.answered_at).length;

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero Header */}
      <div className="relative h-[200px] md:h-[280px] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(20,184,166,0.1) 50%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(14,116,144,0.12) 0%, rgba(20,184,166,0.08) 50%, rgba(232,224,208,0) 100%)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />

        <div className="absolute bottom-8 left-0 right-0 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(6,182,212,0.2)' }}
              >
                <svg className="w-7 h-7" style={{ color: 'var(--eva-cyan)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              {unansweredForMe > 0 && (
                <span
                  className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))', color: 'white' }}
                >
                  {unansweredForMe} waiting for you
                </span>
              )}
            </div>
            <h1 className={`text-3xl md:text-4xl font-light mb-2 ${isDark ? 'text-white' : 'text-[#2d2a26]'}`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
              Family Questions
            </h1>
            <p className={`text-base ${isDark ? 'text-white/50' : 'text-[#2d2a26]/60'}`}>
              Signed in as <span className="font-medium" style={{ color: currentUser.avatarColor }}>{currentUser.name}</span>
              {currentUser.relationship && currentUser.relationship !== 'Self' ? ` (${currentUser.relationship})` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 py-8">
        {/* Tabs + Ask button */}
        <div className="flex items-center gap-4 mb-8">
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('for-me')}
            className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'for-me'
                ? 'text-white shadow-md'
                : isDark ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'for-me' ? { background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' } : {}}
          >
            For Me
            {unansweredForMe > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === 'for-me' ? 'bg-white/25 text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'
              }`}>
                {unansweredForMe}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('awaiting')}
            className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'awaiting'
                ? 'text-white shadow-md'
                : isDark ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'awaiting' ? { background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' } : {}}
          >
            Awaiting Response
            {unansweredAwaiting > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === 'awaiting' ? 'bg-white/25 text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'
              }`}>
                {unansweredAwaiting}
              </span>
            )}
          </button>
        </div>

          {/* Ask a Question button */}
          <button
            onClick={() => setShowAskModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-105 active:scale-95 shadow-md"
            style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Ask a Question
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <EVAOrb size={64} isSpeaking={true} />
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-[#2d2a26]/60'}`}>Loading questions...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && currentPrompts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(6, 182, 212, 0.1)' }}
            >
              <svg className="w-12 h-12" style={{ color: 'var(--eva-cyan)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-light mb-3 ${isDark ? 'text-white' : 'text-[#2d2a26]'}`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
              {activeTab === 'for-me' ? 'No questions for you yet' : "You haven't asked any questions yet"}
            </h2>
            <p className={`text-base max-w-md mb-8 ${isDark ? 'text-white/50' : 'text-[#2d2a26]/60'}`}>
              {activeTab === 'for-me'
                ? "When family members ask you questions about photos, they'll appear here."
                : "Open a photo in the editor and use \"Ask Question\" to send a question to a family member."}
            </p>
            <Link
              href="/album"
              className="px-6 py-3 rounded-full text-base font-medium transition-colors text-white"
              style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))' }}
            >
              Browse Your Albums
            </Link>
          </div>
        )}

        {/* Questions Grid */}
        {!loading && currentPrompts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {currentPrompts.map((prompt) => {
              const isAnswered = !!prompt.answered_at;
              // For Me tab: show who asked (from_member)
              // Awaiting tab: show who we asked (to_member)
              const displayMember = activeTab === 'for-me' ? prompt.from_member : prompt.to_member;

              return (
                <div
                  key={prompt.id}
                  className={`group rounded-2xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl ${
                    activeTab === 'for-me' ? 'cursor-pointer' : ''
                  }`}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                  onClick={() => activeTab === 'for-me' && handleAnswerPrompt(prompt)}
                >
                  {/* Photo */}
                  {prompt.photo && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={prompt.photo.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-black/60' : 'from-black/40'} to-transparent`} />

                      {/* Status badge */}
                      <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full backdrop-blur-sm text-xs font-medium ${
                        isAnswered
                          ? 'bg-green-500/20 text-green-300'
                          : activeTab === 'awaiting'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/20 text-white'
                      }`}>
                        {isAnswered ? 'Answered' : activeTab === 'awaiting' ? 'Waiting...' : 'New'}
                      </div>
                    </div>
                  )}

                  {/* No photo - show a compact header instead */}
                  {!prompt.photo && (
                    <div className="relative h-20 flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.08)' }}>
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${
                        isAnswered
                          ? isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                          : activeTab === 'awaiting'
                            ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'
                            : isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {isAnswered ? 'Answered' : activeTab === 'awaiting' ? 'Waiting...' : 'New'}
                      </div>
                      <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-gray-400'}`}>General Question</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5">
                    {/* Member info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: displayMember?.avatar_color || 'var(--eva-cyan)' }}
                      >
                        {displayMember?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-[#2d2a26]'}`}>
                          {activeTab === 'for-me'
                            ? `From ${displayMember?.name || 'Family member'}`
                            : `To ${displayMember?.name || 'Family member'}`}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#2d2a26]/50'}`}>
                          {displayMember?.relationship || 'family'} · {timeAgo(prompt.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Question */}
                    <p className={`text-base leading-relaxed mb-4 ${isDark ? 'text-white/90' : 'text-[#2d2a26]/85'}`} style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                      &ldquo;{prompt.question}&rdquo;
                    </p>

                    {/* Answer text (if answered) */}
                    {isAnswered && prompt.answer_text && (
                      <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <p className={`text-xs font-medium mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          {activeTab === 'for-me' ? 'Your answer:' : `${prompt.to_member?.name || 'Their'} answer:`}
                        </p>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{prompt.answer_text}</p>
                      </div>
                    )}

                    {/* Action button - For Me tab, unanswered */}
                    {activeTab === 'for-me' && !isAnswered && (
                      <button
                        className="w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))', color: 'white' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnswerPrompt(prompt);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Share Your Memory
                      </button>
                    )}

                    {/* Change answer button - For Me tab, answered */}
                    {activeTab === 'for-me' && isAnswered && (
                      <button
                        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          isDark ? 'bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10' : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnswerPrompt(prompt);
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        Change Answer
                      </button>
                    )}

                    {/* Awaiting tab, unanswered */}
                    {activeTab === 'awaiting' && !isAnswered && (
                      <div className={`w-full py-3 rounded-xl text-sm text-center ${isDark ? 'text-amber-400/70 bg-amber-500/10' : 'text-amber-600 bg-amber-50'}`}>
                        Waiting for {prompt.to_member?.name || 'response'}...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ask Question Modal — Full-screen immersive */}
      {showAskModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowAskModal(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          <div
            className="relative w-full h-full sm:w-[94vw] sm:h-[88vh] sm:max-w-6xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              background: isDark
                ? 'linear-gradient(145deg, #111115 0%, #0c0c10 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Top bar ── */}
            <div className={`flex items-center justify-between px-6 py-3.5 flex-shrink-0 ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)' }}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ask a Question</h3>
                  <p className={`text-[11px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Select an album and photo to ask about</p>
                </div>
              </div>

              {/* Album dropdown — right side of header */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={askAlbumId}
                    onChange={(e) => setAskAlbumId(e.target.value)}
                    className={`appearance-none pl-4 pr-9 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                      isDark
                        ? 'bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.1]'
                        : 'bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100'
                    } ${!askAlbumId ? (isDark ? 'text-white/40' : 'text-gray-400') : ''}`}
                    style={{ colorScheme: isDark ? 'dark' : 'light' }}
                  >
                    <option value="" style={{ background: isDark ? '#1e1e24' : '#ffffff', color: isDark ? '#999' : '#666' }}>Select album...</option>
                    {albums.map(a => (
                      <option key={a.id} value={a.id} style={{ background: isDark ? '#1e1e24' : '#ffffff', color: isDark ? '#eee' : '#111' }}>{a.title}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </div>
                <button onClick={() => setShowAskModal(false)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-gray-100 text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* ── Main content area ── */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

              {/* ── LEFT: Photo gallery ── */}
              <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-black/20' : 'bg-gray-50/50'}`}>
                {!askAlbumId ? (
                  /* Empty state — no album selected */
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center px-8">
                      <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                        <svg className={`w-10 h-10 ${isDark ? 'text-white/15' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Choose an album to see photos</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-white/15' : 'text-gray-300'}`}>Select from the dropdown above</p>
                    </div>
                  </div>
                ) : askPhotosLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
                      <p className={`text-sm ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Loading photos...</p>
                    </div>
                  </div>
                ) : askAlbumPhotos.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center px-8">
                      <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                        <svg className={`w-10 h-10 ${isDark ? 'text-white/15' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white/30' : 'text-gray-400'}`}>No photos yet</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-white/15' : 'text-gray-300'}`}>This album doesn't have any photos</p>
                    </div>
                  </div>
                ) : askPhotoId ? (
                  /* ── Selected: full-frame hero photo ── */
                  (() => {
                    const photo = askAlbumPhotos.find(p => p.id === askPhotoId);
                    if (!photo) return null;
                    return (
                      <div className="relative h-full flex flex-col">
                        {/* Full-frame selected photo */}
                        <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                          <img
                            src={photo.original_url || photo.thumbnail_url}
                            alt={photo.summary || ''}
                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-2xl"
                          />
                        </div>
                        {/* Top overlay: change photo button */}
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                          <button
                            onClick={() => setAskPhotoId(null)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium backdrop-blur-md transition-colors ${isDark ? 'bg-black/40 text-white/80 hover:bg-black/60 hover:text-white' : 'bg-white/80 text-gray-700 hover:bg-white shadow-lg'}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                            Change photo
                          </button>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white backdrop-blur-md" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.9), rgba(13,148,136,0.9))' }}>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Selected
                          </div>
                        </div>
                        {/* Thumb strip at bottom */}
                        <div className={`flex-shrink-0 overflow-x-auto py-3 px-4 ${isDark ? 'bg-black/30' : 'bg-white/50'}`}>
                          <div className="flex gap-2 justify-center">
                            {askAlbumPhotos.map(p => (
                              <button
                                key={p.id}
                                onClick={() => setAskPhotoId(p.id)}
                                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                                  askPhotoId === p.id ? 'ring-2 ring-cyan-400 scale-105 shadow-lg' : 'opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* ── Grid: no selection yet ── */
                  <div className="p-4">
                    <p className={`text-xs text-center mb-3 ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                      Tap a photo to see it full-size and ask about it
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {askAlbumPhotos.map(photo => (
                        <button
                          key={photo.id}
                          onClick={() => setAskPhotoId(photo.id)}
                          className="group relative aspect-[4/3] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                        >
                          <img src={photo.thumbnail_url} alt={photo.summary || ''} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          {photo.summary && (
                            <div className="absolute bottom-0 inset-x-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-white/90 line-clamp-2 leading-relaxed drop-shadow-lg">{photo.summary}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT: Question form panel ── */}
              <div className={`lg:w-[380px] flex-shrink-0 flex flex-col ${isDark ? 'border-t lg:border-t-0 lg:border-l border-white/[0.06]' : 'border-t lg:border-t-0 lg:border-l border-gray-100'}`}>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                  {/* Selected photo indicator (optional — main view is left panel) */}
                  {askPhotoId && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-50'}`}>
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={askAlbumPhotos.find(p => p.id === askPhotoId)?.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p className={`text-xs font-medium ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>Asking about this photo</p>
                    </div>
                  )}

                  {/* Ask who */}
                  <div>
                    <label className={`text-[11px] font-semibold uppercase tracking-wider mb-2 block ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                      Ask who?
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setAskMemberId('')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          askMemberId === ''
                            ? 'text-white shadow-sm'
                            : isDark ? 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                        style={askMemberId === '' ? { background: 'linear-gradient(135deg, #06b6d4, #0d9488)' } : {}}
                      >
                        Anyone
                      </button>
                      {familyMembers.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setAskMemberId(m.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            askMemberId === m.id
                              ? 'text-white shadow-sm'
                              : isDark ? 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                          }`}
                          style={askMemberId === m.id ? { background: m.avatar_color } : {}}
                        >
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: m.avatar_color }}>{m.name[0]}</span>
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question text */}
                  <div>
                    <label className={`text-[11px] font-semibold uppercase tracking-wider mb-2 block ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                      Your question
                    </label>
                    <textarea
                      value={askText}
                      onChange={(e) => setAskText(e.target.value)}
                      placeholder={askPhotoId ? "Who is in this photo? Where was this taken? What's the story behind it?" : "What do you remember about this day? Tell me about this memory..."}
                      rows={4}
                      className={`w-full px-4 py-3 rounded-xl text-sm resize-none transition-colors ${isDark ? 'bg-white/[0.04] text-white placeholder:text-white/20 border-white/[0.06] focus:bg-white/[0.06] focus:border-cyan-500/30' : 'bg-gray-50 text-gray-900 placeholder:text-gray-400 border-gray-100 focus:bg-white focus:border-cyan-200'} border focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
                    />
                  </div>
                </div>

                {/* Send bar */}
                <div className={`p-4 flex-shrink-0 ${isDark ? 'border-t border-white/[0.06]' : 'border-t border-gray-100'}`}>
                  <button
                    onClick={handleSendQuestion}
                    disabled={!askText.trim() || !askAlbumId || askSending}
                    className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98] disabled:opacity-25 disabled:hover:shadow-none"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)' }}
                  >
                    {askSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                        Send Question
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

    </div>
  );
}
