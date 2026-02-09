'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateAlbum } from '@/contexts/CreateAlbumContext';
import { useTheme } from '@/contexts/ThemeContext';

const ALBUM_TYPES = [
  { 
    value: 'event', 
    label: 'Single Event', 
    description: 'Wedding, birthday, vacation – one cohesive story',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    )
  },
  { 
    value: 'theme', 
    label: 'Memory Collection', 
    description: 'Unrelated moments over time',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    )
  },
] as const;

export default function CreateAlbumModal() {
  const { isOpen, closeModal } = useCreateAlbum();
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [albumType, setAlbumType] = useState<'event' | 'theme'>('event');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name.trim(),
          album_type: albumType,
          date_start: date || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const created = await res.json();
      closeModal();
      setName('');
      setDate('');
      setAlbumType('event');
      router.push(`/album/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create album');
    } finally {
      setCreating(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.85)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ background: isLight ? 'var(--bg-elevated)' : '#141210' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.5)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header with gradient accent */}
        <div className="relative px-8 pt-8 pb-6">
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, #22c55e 0%, #059669 50%, #10b981 100%)' }}
          />
          <h2 
            className="text-2xl font-light"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif', color: isLight ? 'var(--text-primary)' : '#fff' }}
          >
            Create New Album
          </h2>
          <p className="text-sm mt-1" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>Start preserving your memories</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8">
          {/* Album Name */}
          <div className="mb-5">
            <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.5)' }}>
              Album Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer 2024 Reunion"
              className={`w-full px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all ${isLight ? 'placeholder:text-[#9e9586]' : 'placeholder:text-white/30'}`}
              style={{ 
                background: isLight ? 'var(--bg-secondary)' : 'rgba(255,255,255,0.05)', 
                border: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.08)'}`,
                color: isLight ? 'var(--text-primary)' : '#fff',
              }}
              autoFocus
              required
            />
          </div>

          {/* Date */}
          <div className="mb-6">
            <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.5)' }}>
              Date (optional)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
              style={{ 
                background: isLight ? 'var(--bg-secondary)' : 'rgba(255,255,255,0.05)', 
                border: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.08)'}`,
                color: isLight ? 'var(--text-primary)' : '#fff',
                colorScheme: isLight ? 'light' : 'dark',
              }}
            />
          </div>

          {/* Album Type */}
          <div className="mb-6">
            <label className="block text-xs font-medium uppercase tracking-wider mb-3" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.5)' }}>
              Album Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ALBUM_TYPES.map((opt) => (
                <label
                  key={opt.value}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all ${
                    albumType === opt.value
                      ? 'ring-2 ring-green-500/70'
                      : ''
                  }`}
                  style={{ 
                    background: albumType === opt.value 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : isLight ? 'var(--bg-secondary)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${albumType === opt.value ? 'rgba(34, 197, 94, 0.3)' : isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.06)'}`
                  }}
                >
                  <input
                    type="radio"
                    name="albumType"
                    value={opt.value}
                    checked={albumType === opt.value}
                    onChange={() => setAlbumType(opt.value)}
                    className="sr-only"
                  />
                  <div style={{ color: albumType === opt.value ? '#4ade80' : isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>
                    {opt.icon}
                  </div>
                  <span className="text-sm font-medium" style={{ color: albumType === opt.value ? (isLight ? 'var(--text-primary)' : '#fff') : (isLight ? 'var(--text-secondary)' : 'rgba(255,255,255,0.7)') }}>
                    {opt.label}
                  </span>
                  <p className="text-[11px] text-center leading-tight" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>
                    {opt.description}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-3.5 px-4 rounded-xl transition-all text-sm font-medium"
              style={{ 
                border: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.1)'}`,
                color: isLight ? 'var(--text-secondary)' : 'rgba(255,255,255,0.6)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex-1 py-3.5 px-4 rounded-xl text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{ 
                background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                boxShadow: name.trim() ? '0 4px 20px rgba(34, 197, 94, 0.3)' : 'none'
              }}
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Album'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
