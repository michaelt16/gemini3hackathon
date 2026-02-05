'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useUserName } from '@/hooks/use-user-name';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

// Mock stats for demo
const MOCK_STATS = {
  totalAlbums: 4,
  totalPhotos: 47,
  storiesRecorded: 23,
  questionsAnswered: 8,
  familyMembers: 6,
  animatedPhotos: 12,
  totalMinutesNarrated: 18,
  memberSince: 'January 2024',
};

// Journey milestones
const JOURNEY_MILESTONES = [
  { id: 1, title: 'First Album Created', date: 'Jan 15, 2024', icon: '📁', completed: true },
  { id: 2, title: 'First Story Recorded', date: 'Jan 15, 2024', icon: '🎙️', completed: true },
  { id: 3, title: '10 Photos Added', date: 'Jan 22, 2024', icon: '📷', completed: true },
  { id: 4, title: 'First Film Exported', date: 'Feb 3, 2024', icon: '🎬', completed: true },
  { id: 5, title: 'Family Member Joined', date: 'Feb 10, 2024', icon: '👨‍👩‍👧', completed: true },
  { id: 6, title: 'First Question Answered', date: 'Feb 14, 2024', icon: '💬', completed: true },
  { id: 7, title: '25 Stories Recorded', date: '', icon: '🏆', completed: false },
  { id: 8, title: 'Voice Cloned', date: '', icon: '🗣️', completed: false },
];

export default function ProfilePage() {
  const { userName, avatarLetter } = useUserName();
  const [voiceStyle, setVoiceStyle] = useState('kore');
  const [autoPlay, setAutoPlay] = useState(true);
  const [familyCanSee, setFamilyCanSee] = useState(true);

  return (
    <div className="min-h-screen pt-[88px] md:pt-[96px] bg-gradient-to-b from-[#0d0b09] to-[#141210]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Profile Header */}
        <div className="flex items-center gap-5 mb-8">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-medium shadow-lg"
            style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' }}
          >
            {avatarLetter}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-white">{userName}</h1>
            <p className="text-white/50 text-sm">Preserving memories since {MOCK_STATS.memberSince}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">Memory Keeper</span>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">{MOCK_STATS.familyMembers} Family Connected</span>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">{MOCK_STATS.totalAlbums}</p>
            <p className="text-white/50 text-xs">Albums</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">{MOCK_STATS.totalPhotos}</p>
            <p className="text-white/50 text-xs">Photos</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-cyan-400 mb-1">{MOCK_STATS.storiesRecorded}</p>
            <p className="text-white/50 text-xs">Stories Told</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-pink-400 mb-1">{MOCK_STATS.questionsAnswered}</p>
            <p className="text-white/50 text-xs">Questions Answered</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div>
                <p className="text-white font-semibold">{MOCK_STATS.animatedPhotos}</p>
                <p className="text-white/40 text-xs">Photos Animated</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="text-white font-semibold">{MOCK_STATS.totalMinutesNarrated} min</p>
                <p className="text-white/40 text-xs">Narration Recorded</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👨‍👩‍👧‍👦</span>
              <div>
                <p className="text-white font-semibold">{MOCK_STATS.familyMembers}</p>
                <p className="text-white/40 text-xs">Family Members</p>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Preservation Journey */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <span>🌟</span>
            Your Memory Journey
          </h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
            
            <div className="space-y-4">
              {JOURNEY_MILESTONES.map((milestone, index) => (
                <div key={milestone.id} className="flex items-center gap-4 relative">
                  {/* Dot */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                    milestone.completed 
                      ? 'bg-gradient-to-br from-purple-500 to-cyan-500' 
                      : 'bg-white/10 border border-white/20'
                  }`}>
                    <span className="text-sm">{milestone.icon}</span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${milestone.completed ? 'text-white' : 'text-white/40'}`}>
                      {milestone.title}
                    </p>
                    {milestone.date ? (
                      <p className="text-white/40 text-xs">{milestone.date}</p>
                    ) : (
                      <p className="text-white/20 text-xs italic">Not yet achieved</p>
                    )}
                  </div>
                  
                  {/* Checkmark for completed */}
                  {milestone.completed && (
                    <span className="text-green-400 text-sm">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* EVA Preferences */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <EVAOrb size={28} isSpeaking={false} />
              <h3 className="text-white font-medium text-sm">EVA Preferences</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Voice Style</p>
                  <p className="text-white/40 text-xs">Choose EVA&apos;s speaking voice</p>
                </div>
                <select 
                  value={voiceStyle}
                  onChange={(e) => setVoiceStyle(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                  <option value="kore">Kore (Default)</option>
                  <option value="charon">Charon</option>
                  <option value="puck">Puck</option>
                  <option value="aoede">Aoede</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Auto-play Narration</p>
                  <p className="text-white/40 text-xs">Automatically play EVA&apos;s narrations</p>
                </div>
                <button 
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${autoPlay ? 'bg-cyan-500' : 'bg-white/20'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoPlay ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Voice Cloning (Beta) */}
          <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗣️</span>
                <div>
                  <h3 className="text-white font-medium text-sm">Voice Cloning</h3>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-semibold uppercase tracking-wider rounded">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Preserve your voice forever. Upload a voice sample and EVA will narrate your stories in your own voice.
            </p>
            <button className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/50 text-sm transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              Upload Voice Sample
            </button>
          </div>

          {/* Privacy */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="text-white font-medium text-sm mb-4">Privacy & Sharing</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Family can see my albums</p>
                  <p className="text-white/40 text-xs">Allow connected family to view your memories</p>
                </div>
                <button 
                  onClick={() => setFamilyCanSee(!familyCanSee)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${familyCanSee ? 'bg-cyan-500' : 'bg-white/20'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${familyCanSee ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Export My Data</p>
                  <p className="text-white/40 text-xs">Download all your memories and stories</p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors">
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* EVA Orb - Fixed corner */}
        <div className="fixed bottom-6 right-6 z-50">
          <EVAOrb size={120} />
        </div>
      </div>
    </div>
  );
}
