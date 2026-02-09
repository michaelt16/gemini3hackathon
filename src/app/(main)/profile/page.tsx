'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useUserName } from '@/hooks/use-user-name';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentUser } from '@/hooks/use-current-user';

const EVAOrb = dynamic(() => import('@/components/EVAOrb'), { ssr: false });

export default function ProfilePage() {
  const { userName, avatarLetter } = useUserName();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user: currentUser, switchUser } = useCurrentUser();

  // Family Network state
  const [familyCode, setFamilyCode] = useState<string | null>(currentUser.familyCode || null);
  const [joinCode, setJoinCode] = useState('');
  const [familyJoining, setFamilyJoining] = useState(false);
  const [familyMessage, setFamilyMessage] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [voiceStyle, setVoiceStyle] = useState('kore');
  const [autoPlay, setAutoPlay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [familyCanView, setFamilyCanView] = useState(true);

  // Sync family code from current user
  useEffect(() => {
    if (currentUser.familyCode) {
      setFamilyCode(currentUser.familyCode);
    } else if (currentUser.id) {
      // Fetch from API if not in localStorage
      fetch(`/api/auth/family-code?user_id=${currentUser.id}`)
        .then(r => r.json())
        .then(d => { if (d.family_code) setFamilyCode(d.family_code); })
        .catch(() => {});
    }
  }, [currentUser.id, currentUser.familyCode]);

  const handleJoinFamily = useCallback(async () => {
    if (!joinCode.trim()) return;
    setFamilyJoining(true);
    setFamilyMessage(null);
    try {
      const res = await fetch('/api/auth/family-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, action: 'join', code: joinCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.family_code) {
        setFamilyCode(data.family_code);
        setJoinCode('');
        setFamilyMessage(data.message || 'Joined family!');
        switchUser({ ...currentUser, familyCode: data.family_code });
      } else {
        setFamilyMessage(data.error || 'Failed to join family');
      }
    } catch {
      setFamilyMessage('Network error');
    }
    setFamilyJoining(false);
  }, [currentUser, joinCode, switchUser]);

  const handleCopyCode = useCallback(() => {
    if (familyCode) {
      navigator.clipboard.writeText(familyCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [familyCode]);

  // Voice cloning state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlobs, setAudioBlobs] = useState<{ blob: Blob; name: string; duration: number }[]>([]);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneStatus, setCloneStatus] = useState<'idle' | 'recording' | 'ready' | 'cloning' | 'success' | 'error'>('idle');
  const [clonedVoices, setClonedVoices] = useState<{ id: string; name: string }[]>([]);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing cloned voices from ElevenLabs + saved voice from Supabase
  useEffect(() => {
    fetch('/api/voice/clone?userId=default')
      .then(res => res.json())
      .then(data => {
        if (data.voices) setClonedVoices(data.voices);
        // If there's a saved voice in Supabase, auto-set it in localStorage
        if (data.savedVoice?.id) {
          localStorage.setItem('clonedVoiceId', data.savedVoice.id);
          localStorage.setItem('clonedVoiceName', data.savedVoice.name || 'My Voice');
          // Ensure it shows up in the list
          setClonedVoices(prev => {
            const exists = prev.some(v => v.id === data.savedVoice.id);
            if (!exists) return [...prev, { id: data.savedVoice.id, name: data.savedVoice.name }];
            return prev;
          });
        }
      })
      .catch(() => {}); // Fail silently if no API key
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = recordingTime;
        setAudioBlobs(prev => [...prev, { 
          blob, 
          name: `Recording ${prev.length + 1}`, 
          duration 
        }]);
        setCloneStatus('ready');
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(250);
      setIsRecording(true);
      setCloneStatus('recording');
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setCloneError('Microphone access denied. Please allow microphone access.');
      setCloneStatus('error');
    }
  }, [recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      setAudioBlobs(prev => [...prev, { 
        blob: file, 
        name: file.name, 
        duration: 0 // Unknown for uploaded files
      }]);
    });
    setCloneStatus('ready');
    e.target.value = ''; // Reset input
  }, []);

  const removeAudioSample = useCallback((index: number) => {
    setAudioBlobs(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setCloneStatus('idle');
      return next;
    });
  }, []);

  const cloneMyVoice = useCallback(async () => {
    if (audioBlobs.length === 0) return;
    
    setIsCloning(true);
    setCloneStatus('cloning');
    setCloneError(null);
    
    try {
      const formData = new FormData();
      formData.append('voiceName', voiceName || `${userName}'s Voice`);
      formData.append('description', 'Voice clone for Living Memory narration');
      formData.append('userId', 'default');
      
      audioBlobs.forEach(({ blob }) => {
        formData.append('files', blob);
      });
      
      const response = await fetch('/api/voice/clone', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success && data.voiceProfile) {
        setClonedVoices(prev => [...prev, { id: data.voiceProfile.id, name: data.voiceProfile.name }]);
        setCloneStatus('success');
        setAudioBlobs([]);
        
        // Store voice ID in localStorage for narration pipeline
        localStorage.setItem('clonedVoiceId', data.voiceProfile.id);
        localStorage.setItem('clonedVoiceName', data.voiceProfile.name);
      } else {
        throw new Error(data.details || data.error || 'Clone failed');
      }
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : 'Failed to clone voice');
      setCloneStatus('error');
    } finally {
      setIsCloning(false);
    }
  }, [audioBlobs, voiceName, userName]);

  const deleteClonedVoice = useCallback(async (voiceId: string) => {
    try {
      await fetch('/api/voice/clone', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, userId: 'default' }),
      });
      setClonedVoices(prev => prev.filter(v => v.id !== voiceId));
      
      // Clear from localStorage if it's the active voice
      if (localStorage.getItem('clonedVoiceId') === voiceId) {
        localStorage.removeItem('clonedVoiceId');
        localStorage.removeItem('clonedVoiceName');
      }
    } catch (err) {
      console.error('Failed to delete voice:', err);
    }
  }, []);

  const selectVoiceForNarration = useCallback((voiceId: string, name: string) => {
    localStorage.setItem('clonedVoiceId', voiceId);
    localStorage.setItem('clonedVoiceName', name);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10">
        
        {/* Profile Header */}
        <div className="flex items-center gap-5 mb-10">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-light shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))',
              fontFamily: 'var(--font-crimson), Georgia, serif'
            }}
          >
            {avatarLetter}
          </div>
          <div className="flex-1">
            <h1 
              className="text-2xl md:text-3xl font-light mb-1" 
              style={{ 
                fontFamily: 'var(--font-crimson), Georgia, serif',
                color: 'var(--text-primary)'
              }}
            >
              {userName}
            </h1>
            <p style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(45,42,38,0.5)' }} className="text-sm">
              Member since January 2024
            </p>
          </div>
          <button 
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ 
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(45,42,38,0.06)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border-subtle)' 
            }}
          >
            Edit Profile
          </button>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          
          {/* EVA Voice Settings */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <EVAOrb size={32} isSpeaking={false} />
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>EVA Voice Settings</h2>
            </div>
            
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Voice Style</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.45)' }}>How EVA speaks to you</p>
                </div>
                <select 
                  value={voiceStyle}
                  onChange={(e) => setVoiceStyle(e.target.value)}
                  className="rounded-xl px-4 py-2 text-sm focus:outline-none transition-colors min-w-[140px]"
                  style={{ 
                    background: isDark ? 'var(--bg-primary)' : 'var(--bg-elevated)', 
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="kore">Kore (Warm)</option>
                  <option value="charon">Charon (Deep)</option>
                  <option value="puck">Puck (Light)</option>
                  <option value="aoede">Aoede (Soft)</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto-play narration</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.45)' }}>Play stories automatically when viewing</p>
                </div>
                <button 
                  onClick={() => setAutoPlay(!autoPlay)}
                  className="w-12 h-7 rounded-full relative transition-colors"
                  style={{ background: autoPlay ? 'var(--eva-cyan)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(45,42,38,0.15)') }}
                >
                  <span 
                    className="absolute top-1 w-5 h-5 rounded-full transition-all shadow"
                    style={{ 
                      left: autoPlay ? 'calc(100% - 24px)' : '4px',
                      background: isDark ? 'white' : (autoPlay ? 'white' : '#f5f0e6')
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Voice Preservation - ElevenLabs Voice Cloning */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{ 
              background: isDark 
                ? 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, var(--bg-secondary) 60%)' 
                : 'linear-gradient(135deg, rgba(14,116,144,0.08) 0%, var(--bg-secondary) 60%)', 
              border: isDark ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(14,116,144,0.2)'
            }}
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(6,182,212,0.2)' : 'rgba(14,116,144,0.1)' }}
                >
                  <svg className="w-7 h-7" style={{ color: 'var(--eva-cyan)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-lg" style={{ color: 'var(--text-primary)' }}>Voice Preservation</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--eva-cyan)', color: 'white' }}>
                      NEW
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(45,42,38,0.6)' }}>
                    Record or upload voice samples and EVA will clone your voice to narrate your memory films. 
                    Powered by ElevenLabs.
                  </p>
                </div>
              </div>
            </div>

            {/* Existing Cloned Voices */}
            {clonedVoices.length > 0 && (
              <div className="px-6 pb-4">
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.4)' }}>
                  Your Cloned Voices
                </p>
                <div className="space-y-2">
                  {clonedVoices.map((voice) => {
                    const isActive = typeof window !== 'undefined' && localStorage.getItem('clonedVoiceId') === voice.id;
                    return (
                      <div 
                        key={voice.id}
                        className="flex items-center justify-between rounded-xl px-4 py-3 transition-all"
                        style={{ 
                          background: isActive 
                            ? (isDark ? 'rgba(6,182,212,0.15)' : 'rgba(14,116,144,0.1)') 
                            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                          border: isActive 
                            ? (isDark ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(14,116,144,0.3)') 
                            : '1px solid transparent'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(6,182,212,0.2)' : 'rgba(14,116,144,0.1)' }}>
                            <svg className="w-4 h-4" style={{ color: 'var(--eva-cyan)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{voice.name}</p>
                            {isActive && (
                              <p className="text-[10px] font-medium" style={{ color: 'var(--eva-cyan)' }}>Active for narration</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isActive && (
                            <button 
                              onClick={() => selectVoiceForNarration(voice.id, voice.name)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              style={{ background: isDark ? 'rgba(6,182,212,0.2)' : 'rgba(14,116,144,0.1)', color: 'var(--eva-cyan)' }}
                            >
                              Use
                            </button>
                          )}
                          <button 
                            onClick={() => deleteClonedVoice(voice.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(45,42,38,0.3)' }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recording / Upload Area */}
            <div className="px-6 pb-6">
              {/* Audio Samples List */}
              {audioBlobs.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.4)' }}>
                    Voice Samples ({audioBlobs.length})
                  </p>
                  <div className="space-y-2">
                    {audioBlobs.map((sample, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{sample.name}</span>
                          {sample.duration > 0 && (
                            <span className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(45,42,38,0.3)' }}>
                              {formatTime(sample.duration)}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => removeAudioSample(i)}
                          className="text-xs px-2 py-1 rounded transition-colors"
                          style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.4)' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className="flex items-center gap-4 mb-4 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Recording...</p>
                    <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(45,42,38,0.5)' }}>
                      {formatTime(recordingTime)} — Speak naturally for 30+ seconds for best results
                    </p>
                  </div>
                  <button 
                    onClick={stopRecording}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ background: 'rgba(239,68,68,0.8)' }}
                  >
                    Stop
                  </button>
                </div>
              )}

              {/* Success Message */}
              {cloneStatus === 'success' && (
                <div className="flex items-center gap-3 mb-4 p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Voice cloned successfully! It will be used for narrating your memory films.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {cloneError && (
                <div className="flex items-center gap-3 mb-4 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(45,42,38,0.7)' }}>
                    {cloneError}
                  </p>
                </div>
              )}

              {/* Voice Name Input (when samples exist) */}
              {audioBlobs.length > 0 && !isRecording && cloneStatus !== 'success' && (
                <div className="mb-4">
                  <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.4)' }}>
                    Voice Name
                  </label>
                  <input
                    type="text"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder={`${userName}'s Voice`}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                    style={{ 
                      background: isDark ? 'var(--bg-primary)' : 'var(--bg-elevated)', 
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {!isRecording && cloneStatus !== 'cloning' && (
                  <>
                    <button 
                      onClick={startRecording}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg, var(--eva-cyan), var(--eva-teal))', color: 'white' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      </svg>
                      {audioBlobs.length > 0 ? 'Record Another' : 'Record Voice'}
                    </button>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{ 
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', 
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)' 
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Upload Audio
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="audio/*" 
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </>
                )}
                
                {audioBlobs.length > 0 && !isRecording && cloneStatus !== 'success' && (
                  <button 
                    onClick={cloneMyVoice}
                    disabled={isCloning}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ml-auto"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white' }}
                  >
                    {isCloning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Cloning Voice...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                        </svg>
                        Clone My Voice
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Tips */}
              {cloneStatus === 'idle' && audioBlobs.length === 0 && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                  <p className="text-xs font-medium mb-1.5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(45,42,38,0.5)' }}>Tips for best results:</p>
                  <ul className="text-xs space-y-1" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(45,42,38,0.35)' }}>
                    <li>• Record 30 seconds to 2 minutes of natural speech</li>
                    <li>• Speak in a quiet environment</li>
                    <li>• You can upload multiple samples for better quality</li>
                    <li>• Read a passage aloud for consistent tone</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Privacy & Sharing */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>Privacy & Sharing</h2>
            </div>
            
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Family can view my albums</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.45)' }}>Allow connected family members to see your memories</p>
                </div>
                <button 
                  onClick={() => setFamilyCanView(!familyCanView)}
                  className="w-12 h-7 rounded-full relative transition-colors"
                  style={{ background: familyCanView ? 'var(--eva-cyan)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(45,42,38,0.15)') }}
                >
                  <span 
                    className="absolute top-1 w-5 h-5 rounded-full transition-all shadow"
                    style={{ 
                      left: familyCanView ? 'calc(100% - 24px)' : '4px',
                      background: isDark ? 'white' : (familyCanView ? 'white' : '#f5f0e6')
                    }}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Email notifications</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.45)' }}>Get notified when family asks questions</p>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className="w-12 h-7 rounded-full relative transition-colors"
                  style={{ background: notifications ? 'var(--eva-cyan)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(45,42,38,0.15)') }}
                >
                  <span 
                    className="absolute top-1 w-5 h-5 rounded-full transition-all shadow"
                    style={{ 
                      left: notifications ? 'calc(100% - 24px)' : '4px',
                      background: isDark ? 'white' : (notifications ? 'white' : '#f5f0e6')
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Family Network */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>Family Network</h2>
            </div>
            
            <div className="px-5 py-4 space-y-4">
              {familyCode ? (
                <>
                  {/* Show current family code */}
                  <div>
                    <p className="text-xs mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.45)' }}>
                      Your family code
                    </p>
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex-1 px-4 py-3 rounded-xl text-center font-mono text-lg font-bold tracking-[0.3em]"
                        style={{ 
                          background: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.06)',
                          color: isDark ? '#06b6d4' : '#0891b2',
                          border: `1px solid ${isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.15)'}`,
                        }}
                      >
                        {familyCode}
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="px-4 py-3 rounded-xl text-sm font-medium transition-all"
                        style={{ 
                          background: codeCopied 
                            ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)')
                            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(45,42,38,0.05)'), 
                          color: codeCopied ? '#10b981' : 'var(--text-primary)',
                          border: isDark ? 'none' : '1px solid var(--border-subtle)',
                        }}
                      >
                        {codeCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs mt-2" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(45,42,38,0.35)' }}>
                      Share this code with family members so they can join your network
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* No family code — just show Join option */}
                  <div>
                    <p className="text-sm mb-3" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(45,42,38,0.55)' }}>
                      You&apos;re not part of a family network yet. Enter a family code to join.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="Enter family code"
                        className="flex-1 px-4 py-3 rounded-xl text-sm font-mono tracking-wider outline-none"
                        style={{ 
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(45,42,38,0.04)',
                          color: 'var(--text-primary)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'var(--border-subtle)'}`,
                        }}
                      />
                      <button
                        onClick={handleJoinFamily}
                        disabled={!joinCode.trim() || familyJoining}
                        className="px-5 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                        style={{ 
                          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(45,42,38,0.06)', 
                          color: 'var(--text-primary)',
                          border: isDark ? 'none' : '1px solid var(--border-subtle)',
                        }}
                      >
                        {familyJoining ? 'Joining...' : 'Join'}
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              {/* Status message */}
              {familyMessage && (
                <p className="text-xs text-center py-1" style={{ 
                  color: familyMessage.includes('error') || familyMessage.includes('Invalid') || familyMessage.includes('Failed')
                    ? '#f87171' 
                    : '#10b981' 
                }}>
                  {familyMessage}
                </p>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>Account</h2>
            </div>
            
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Export all data</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.45)' }}>Download your photos, stories, and films</p>
                </div>
                <button 
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ 
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(45,42,38,0.05)', 
                    color: 'var(--text-primary)',
                    border: isDark ? 'none' : '1px solid var(--border-subtle)'
                  }}
                >
                  Export
                </button>
              </div>
              
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Help & Support</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.45)' }}>Get help or send feedback</p>
                </div>
                <button 
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ 
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(45,42,38,0.05)', 
                    color: 'var(--text-primary)',
                    border: isDark ? 'none' : '1px solid var(--border-subtle)'
                  }}
                >
                  Contact
                </button>
              </div>
              
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sign out</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(45,42,38,0.45)' }}>Sign out of your account</p>
                </div>
                <button 
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ 
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(220,60,60,0.06)', 
                    color: '#f87171',
                    border: isDark ? 'none' : '1px solid rgba(220,60,60,0.15)'
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="text-center pt-4">
            <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(45,42,38,0.35)' }}>Living Memory v1.0.0</p>
            <p className="text-xs mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(45,42,38,0.25)' }}>Made with love for families everywhere</p>
          </div>
        </div>
      </div>
    </div>
  );
}
