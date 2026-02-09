'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentUser } from '@/hooks/use-current-user';

// ============================================================================
// TYPES
// ============================================================================

interface FeedItem {
  id: string;
  type: 'photo' | 'animation' | 'question' | 'story' | 'album' | 'film' | 'storybook';
  createdAt: string;
  memberName: string;
  memberColor: string;
  albumTitle: string;
  albumId: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  animatedUrl?: string;
  animationType?: string;
  questionText?: string;
  answerText?: string;
  answeredAt?: string;
  answeredByName?: string;
  answeredByColor?: string;
  storyExcerpt?: string;
  audioUrl?: string;
  voiceCloneId?: string | null;
  videoUrl?: string;
  photoCount?: number;
  storiesCount?: number;
  coverUrl?: string;
  location?: string;
  likes: number;
  comments: number;
  liked?: boolean;
}

// Pseudo-random but stable social counts per feed item
const LIKES_POOL = [47, 12, 63, 18, 51, 24, 38, 9, 72, 7, 44, 14, 55, 19, 41, 29, 33, 8, 23, 15];
const COMMENTS_POOL = [12, 1, 18, 6, 14, 8, 9, 2, 21, 4, 15, 5, 16, 7, 10, 8, 12, 3, 5, 6];

// ============================================================================
// HELPERS
// ============================================================================

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// ICONS
// ============================================================================

const HeartIcon = ({ filled, className = "w-5 h-5" }: { filled?: boolean; className?: string }) => filled ? (
  <svg className={className} fill="#ef4444" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
) : (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
);

const CommentIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
);

const ShareIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
);

const PlayIcon = () => (
  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
);

const SparklesIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
);

const MapPinIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
);

const PhotoStackIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /></svg>
);

const MicIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0014 0" strokeLinecap="round" /><path d="M12 17v4m-3 0h6" strokeLinecap="round" /></svg>
);

// ============================================================================
// INTERACTION BAR — clean, horizontal
// ============================================================================

function InteractionBar({ item, isDark, onLike }: { item: FeedItem; isDark: boolean; onLike: () => void }) {
  return (
    <div className="flex items-center gap-1 mt-3">
      <button
        onClick={onLike}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all active:scale-90 ${
          item.liked
            ? 'text-red-500'
            : isDark ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-[#65676b] hover:bg-[#f2f2f2]'
        }`}
      >
        <HeartIcon filled={item.liked} className="w-5 h-5" />
        <span className="text-[13px] font-semibold">{item.likes}</span>
      </button>
      <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${isDark ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-[#65676b] hover:bg-[#f2f2f2]'}`}>
        <CommentIcon className="w-5 h-5" />
        <span className="text-[13px] font-semibold">{item.comments}</span>
      </button>
      <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${isDark ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-[#65676b] hover:bg-[#f2f2f2]'}`}>
        <ShareIcon className="w-5 h-5" />
        <span className="text-[13px] font-semibold">Share</span>
      </button>
    </div>
  );
}

// ============================================================================
// FULL-WIDTH CARD COMPONENTS
// ============================================================================

function PhotoCard({ item, isDark, onLike }: { item: FeedItem; isDark: boolean; onLike: () => void }) {
  return (
    <div className="group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ backgroundColor: item.memberColor }}>
          {item.memberName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-[#1c1e21]'}`}>{item.memberName}</p>
          <p className={`text-[12px] ${isDark ? 'text-white/40' : 'text-[#65676b]'}`}>
            added {item.photoCount || 1} photo{(item.photoCount || 1) > 1 ? 's' : ''} to <Link href={`/album/${item.albumId}`} className={`font-medium hover:underline ${isDark ? 'text-cyan-400' : 'text-[#0e7490]'}`}>{item.albumTitle}</Link> · {timeAgo(item.createdAt)}
          </p>
        </div>
      </div>
      {/* Image */}
      <Link href={`/album/${item.albumId}`}>
        <div className="relative overflow-hidden rounded-xl cursor-pointer">
          <img src={item.photoUrl || '/testphoto.jpg'} alt="" className="w-full aspect-[16/9] object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
          {(item.photoCount || 0) > 1 && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-semibold">
              <PhotoStackIcon /> +{(item.photoCount || 1) - 1}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

function AnimationCard({ item, isDark, onLike }: { item: FeedItem; isDark: boolean; onLike: () => void }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ backgroundColor: item.memberColor }}>
          {item.memberName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-[#1c1e21]'}`}>{item.memberName}</p>
          <p className={`text-[12px] ${isDark ? 'text-white/40' : 'text-[#65676b]'}`}>
            created a <span className={isDark ? 'text-purple-400 font-medium' : 'text-[#7c3aed] font-medium'}>{item.animationType}</span> animation · {timeAgo(item.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)', color: isDark ? '#a78bfa' : '#7c3aed' }}>
          <SparklesIcon className="w-3 h-3" /> AI
        </div>
      </div>
      {/* Video */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl cursor-pointer"
        onClick={() => {
          if (playing) { videoRef.current?.pause(); setPlaying(false); }
          else { videoRef.current?.play(); setPlaying(true); }
        }}
      >
        <video ref={videoRef} src={item.animatedUrl} className="w-full aspect-[16/9] object-cover" loop muted playsInline poster={item.photoUrl || '/testphoto.jpg'} />
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${playing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <div className="text-gray-800 ml-1"><PlayIcon /></div>
          </div>
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-bold">
          <SparklesIcon className="w-3.5 h-3.5" /> {item.animationType}
        </div>
        {playing && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Playing
          </div>
        )}
      </div>
      {/* Album link */}
      <p className={`text-[13px] mt-2.5 ${isDark ? 'text-white/50' : 'text-[#65676b]'}`}>
        in <Link href={`/album/${item.albumId}`} className={`font-semibold hover:underline ${isDark ? 'text-cyan-400' : 'text-[#0e7490]'}`}>{item.albumTitle}</Link>
      </p>
    </div>
  );
}

function QuestionCard({ item, isDark, onLike }: { item: FeedItem; isDark: boolean; onLike: () => void }) {
  const isAnswered = !!item.answerText;
  return (
    <div className="group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ backgroundColor: item.memberColor }}>
          {item.memberName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-[#1c1e21]'}`}>{item.memberName}</p>
          <p className={`text-[12px] ${isDark ? 'text-white/40' : 'text-[#65676b]'}`}>
            asked a question in <Link href={`/album/${item.albumId}`} className={`font-medium hover:underline ${isDark ? 'text-cyan-400' : 'text-[#0e7490]'}`}>{item.albumTitle}</Link> · {timeAgo(item.createdAt)}
          </p>
        </div>
      </div>
      {/* Photo with question */}
      <div className="relative overflow-hidden rounded-xl">
        {item.photoUrl && (
          <img src={item.photoUrl} alt="" className="w-full aspect-[16/9] object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-5">
          <p className="text-white text-lg font-semibold leading-snug" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            &ldquo;{item.questionText}&rdquo;
          </p>
        </div>
      </div>
      {/* Answer or CTA */}
      {isAnswered ? (
        <div className={`mt-3 p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/8' : 'bg-[#f0fdf4] border border-[#bbf7d0]'}`}>
          <div className="flex items-center gap-2 mb-2">
            {item.answeredByName ? (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: item.answeredByColor || '#06b6d4' }}>
                {item.answeredByName[0]}
              </div>
            ) : (
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              </div>
            )}
            <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {item.answeredByName ? `Answered by ${item.answeredByName}` : 'Answered'}
            </span>
          </div>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-white/70' : 'text-[#374151]'}`}>{item.answerText}</p>
        </div>
      ) : (
        <button className="mt-3 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-md active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0d9488)' }}>
          Share what you know
        </button>
      )}
    </div>
  );
}

function StoryCard({ item, isDark, onLike }: { item: FeedItem; isDark: boolean; onLike: () => void }) {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const handleVoicePlay = async () => {
    if (isPlayingVoice && audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
      setIsPlayingVoice(false);
      return;
    }

    if (!item.voiceCloneId || !item.storyExcerpt) return;
    setVoiceLoading(true);

    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.storyExcerpt,
          voiceId: item.voiceCloneId,
          options: { stability: 0.5, similarityBoost: 0.75 },
        }),
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        if (!audioElRef.current) audioElRef.current = new Audio();
        audioElRef.current.src = data.audioUrl;
        audioElRef.current.onended = () => setIsPlayingVoice(false);
        audioElRef.current.onerror = () => setIsPlayingVoice(false);
        await audioElRef.current.play();
        setIsPlayingVoice(true);
      }
    } catch { /* ignore */ } finally {
      setVoiceLoading(false);
    }
  };

  return (
    <div className="group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ backgroundColor: item.memberColor }}>
          {item.memberName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-[#1c1e21]'}`}>{item.memberName}</p>
          <p className={`text-[12px] ${isDark ? 'text-white/40' : 'text-[#65676b]'}`}>
            shared a memory about <Link href={`/album/${item.albumId}`} className={`font-medium hover:underline ${isDark ? 'text-cyan-400' : 'text-[#0e7490]'}`}>{item.albumTitle}</Link> · {timeAgo(item.createdAt)}
          </p>
        </div>
      </div>
      {/* Photo with story */}
      <div className="relative overflow-hidden rounded-xl">
        <img src={item.photoUrl || '/testphoto.jpg'} alt="" className="w-full aspect-[16/9] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-5">
          <p
            className="text-white text-lg leading-relaxed italic line-clamp-3"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          >
            &ldquo;{item.storyExcerpt}&rdquo;
          </p>
          <div className="flex items-center gap-2 mt-3">
            {item.voiceCloneId && (
              <button
                onClick={handleVoicePlay}
                disabled={voiceLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  isPlayingVoice
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                    : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                }`}
              >
                {voiceLoading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                ) : isPlayingVoice ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                ) : (
                  <MicIcon />
                )}
                {isPlayingVoice ? `Playing in ${item.memberName}'s voice` : voiceLoading ? 'Loading...' : `Listen in ${item.memberName}'s voice`}
              </button>
            )}
            {!item.voiceCloneId && item.audioUrl && (
              <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold hover:bg-white/30 transition-all">
                <MicIcon /> Listen to story
              </button>
            )}
          </div>
          {isPlayingVoice && (
            <div className="flex items-center gap-0.5 mt-2">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-cyan-400/70 rounded-full animate-pulse"
                  style={{
                    height: `${4 + Math.random() * 10}px`,
                    animationDelay: `${i * 0.08}s`,
                    animationDuration: `${0.3 + Math.random() * 0.4}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlbumCard({ item, isDark, onLike }: { item: FeedItem; isDark: boolean; onLike: () => void }) {
  return (
    <div className="group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ backgroundColor: item.memberColor }}>
          {item.memberName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-[#1c1e21]'}`}>{item.memberName}</p>
          <p className={`text-[12px] ${isDark ? 'text-white/40' : 'text-[#65676b]'}`}>
            created a new album · {timeAgo(item.createdAt)}
          </p>
        </div>
      </div>
      {/* Cover */}
      <Link href={`/album/${item.albumId}`}>
        <div className="relative overflow-hidden rounded-xl cursor-pointer">
          <img src={item.coverUrl || '/testphoto.jpg'} alt="" className="w-full aspect-[16/9] object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-5">
            <h3 className="text-white text-xl font-bold mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              {item.albumTitle}
            </h3>
            <div className="flex items-center gap-4 text-white/80 text-sm">
              {item.photoCount != null && <span className="flex items-center gap-1"><PhotoStackIcon />{item.photoCount} photos</span>}
              {item.location && <span className="flex items-center gap-1"><MapPinIcon />{item.location}</span>}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function FilmCard({ item, isDark, onLike }: { item: FeedItem; isDark: boolean; onLike: () => void }) {
  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ backgroundColor: item.memberColor }}>
          {item.memberName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-[#1c1e21]'}`}>{item.memberName}</p>
          <p className={`text-[12px] ${isDark ? 'text-white/40' : 'text-[#65676b]'}`}>
            exported a memory film · {timeAgo(item.createdAt)}
          </p>
        </div>
      </div>
      <Link href={`/album/${item.albumId}/storybook?mode=watch`}>
        <div className="relative overflow-hidden rounded-xl cursor-pointer">
          {item.videoUrl ? (
            <video src={item.videoUrl} className="w-full aspect-[16/9] object-cover" muted playsInline preload="metadata" />
          ) : (
            <img src={item.coverUrl || '/testphoto.jpg'} alt="" className="w-full aspect-[16/9] object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-5">
            <h3 className="text-white text-lg font-bold mb-0.5" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              {item.albumTitle}
            </h3>
            <p className="text-white/70 text-sm">Memory Film · {item.photoCount || 0} clips</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function StorybookCard({ item, isDark, onLike }: { item: FeedItem; isDark: boolean; onLike: () => void }) {
  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ backgroundColor: item.memberColor }}>
          {item.memberName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-[#1c1e21]'}`}>{item.memberName}</p>
          <p className={`text-[12px] ${isDark ? 'text-white/40' : 'text-[#65676b]'}`}>
            created a Living Storybook for <Link href={`/album/${item.albumId}`} className={`font-medium hover:underline ${isDark ? 'text-cyan-400' : 'text-[#0e7490]'}`}>{item.albumTitle}</Link> · {timeAgo(item.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/album/${item.albumId}/storybook?mode=watch`} className="flex-1">
          <div className="relative overflow-hidden rounded-xl cursor-pointer">
            <img src={item.coverUrl || '/testphoto.jpg'} alt="" className="w-full aspect-[16/9] object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 p-4">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                <span className="text-cyan-300 text-xs font-medium">Living Storybook</span>
              </div>
              <h3 className="text-white text-lg font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {item.albumTitle}
              </h3>
              <p className="text-white/60 text-xs mt-1">{item.photoCount || 0} moments · Play, Read, or Slideshow</p>
            </div>
          </div>
        </Link>
      </div>
      <div className="flex gap-2 mt-2">
        <Link href={`/album/${item.albumId}/storybook?mode=watch`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Play
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// FILTER TABS
// ============================================================================

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'animation', label: 'Animations' },
  { id: 'photo', label: 'Photos' },
  { id: 'story', label: 'Stories' },
  { id: 'question', label: 'Questions' },
  { id: 'album', label: 'Albums' },
] as const;

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function FeedPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user: currentUser } = useCurrentUser();
  const pathname = usePathname();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const fetchCounterRef = useRef(0);

  // Fetch feed from API — always bust cache with timestamp
  const loadFeed = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    const fetchId = ++fetchCounterRef.current;
    try {
      const familyCode = currentUser.familyCode;
      const ts = Date.now(); // cache bust
      const url = familyCode
        ? `/api/feed?family_code=${encodeURIComponent(familyCode)}&_t=${ts}`
        : `/api/feed?_t=${ts}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (fetchId !== fetchCounterRef.current) return; // stale request
      if (!res.ok) { setLoading(false); return; }
      const apiData = await res.json();
      if (!Array.isArray(apiData) || apiData.length === 0) {
        setFeedItems([]);
        setLoading(false);
        return;
      }

      // Add client-side social counts (no likes table yet)
      const items: FeedItem[] = apiData.map((d: FeedItem, i: number) => ({
        ...d,
        likes: LIKES_POOL[i % LIKES_POOL.length],
        comments: COMMENTS_POOL[i % COMMENTS_POOL.length],
      }));

      setFeedItems(items);
    } catch {
      if (fetchId !== fetchCounterRef.current) return;
      setFeedItems([]);
    }
    setLoading(false);
  }, [currentUser.familyCode]);

  // Refetch every time we navigate to /feed (pathname changes) or familyCode changes
  useEffect(() => {
    if (pathname === '/feed') {
      loadFeed();
    }
  }, [pathname, loadFeed]);

  // Also listen for questions-updated event (fires from AnswerPromptModal)
  useEffect(() => {
    const handleQuestionsUpdated = () => {
      loadFeed(false);
    };
    window.addEventListener('questions-updated', handleQuestionsUpdated);
    return () => {
      window.removeEventListener('questions-updated', handleQuestionsUpdated);
    };
  }, [loadFeed]);

  const handleLike = useCallback((id: string) => {
    setFeedItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) }
        : item
    ));
  }, []);

  const filteredItems = activeFilter === 'all'
    ? feedItems
    : feedItems.filter(item => {
        if (activeFilter === 'album') return item.type === 'album' || item.type === 'film' || item.type === 'storybook';
        return item.type === activeFilter;
      });

  const renderCard = (item: FeedItem) => {
    const props = { item, isDark, onLike: () => handleLike(item.id) };
    switch (item.type) {
      case 'photo': return <PhotoCard {...props} />;
      case 'animation': return <AnimationCard {...props} />;
      case 'question': return <QuestionCard {...props} />;
      case 'storybook': return <StorybookCard {...props} />;
      case 'story': return <StoryCard {...props} />;
      case 'album': return <AlbumCard {...props} />;
      case 'film': return <FilmCard {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: isDark ? 'var(--bg-primary)' : '#eef0f3' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: isDark ? 'rgba(18,18,20,0.9)' : 'rgba(255,255,255,0.85)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#1c1e21]'}`}>
            Family Feed
          </h1>
          {/* Filters */}
          <div className="flex items-center gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                  activeFilter === f.id
                    ? 'text-white shadow-sm'
                    : isDark
                      ? 'text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08]'
                      : 'text-[#65676b] hover:text-[#1c1e21] bg-[#e4e6eb] hover:bg-[#d8dadf]'
                }`}
                style={activeFilter === f.id ? { background: isDark ? 'linear-gradient(135deg, #06b6d4, #0d9488)' : '#0e7490' } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="py-6 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderTopColor: '#06b6d4' }} />
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-[#8a8d91]'}`}>Loading feed...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4 opacity-30">{activeFilter === 'all' ? '📸' : activeFilter === 'animation' ? '🎬' : activeFilter === 'photo' ? '🖼️' : activeFilter === 'story' ? '📖' : activeFilter === 'question' ? '❓' : '📁'}</div>
            <p className={`text-lg font-semibold mb-1 ${isDark ? 'text-white/50' : 'text-[#65676b]'}`}>
              {activeFilter === 'all' ? 'No activity yet' : `No ${activeFilter}s yet`}
            </p>
            <p className={`text-sm ${isDark ? 'text-white/30' : 'text-[#8a8d91]'}`}>
              {currentUser.familyCode ? 'Be the first to share a memory' : 'Join a family network to see shared memories'}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4 px-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl px-5 pt-4 pb-2"
                style={{
                  background: isDark ? 'var(--bg-secondary)' : '#ffffff',
                  boxShadow: isDark
                    ? '0 1px 2px rgba(0,0,0,0.3)'
                    : '0 1px 2px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
                }}
              >
                {renderCard(item)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
