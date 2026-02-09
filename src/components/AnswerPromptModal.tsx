'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import EVAOrb from '@/components/EVAOrb';
import { AuroraWave } from '@/components/capture/AuroraWave';
import { useTheme } from '@/contexts/ThemeContext';

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type AnswerMode = 'choose' | 'type' | 'eva';

interface AnswerPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: FamilyPrompt | null;
  onAnswerSaved?: (answerText: string) => void;
}

export default function AnswerPromptModal({ 
  isOpen, 
  onClose, 
  prompt,
  onAnswerSaved 
}: AnswerPromptModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Answer mode: choose (initial), type (text input), or eva (voice conversation)
  const [answerMode, setAnswerMode] = useState<AnswerMode>('choose');

  // Typed answer state
  const [typedAnswer, setTypedAnswer] = useState('');

  // EVA Live API state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [evaTurns, setEvaTurns] = useState(0); // counts how many times EVA finished speaking
  const [userHasSpoken, setUserHasSpoken] = useState(false); // tracks if user toggled mic at least once
  
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasGreetedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get the answer text depending on mode
  const getAnswerText = useCallback(() => {
    if (answerMode === 'type') return typedAnswer;
    // EVA mode: prefer user transcripts if available
    const userParts = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
    if (userParts.trim()) return userParts;
    // Fallback: use EVA's later responses (she often summarizes the user's answer)
    const evaParts = messages.filter(m => m.role === 'assistant').map(m => m.content);
    if (evaParts.length > 1) {
      return evaParts.slice(1).join(' ');
    }
    // Last resort: audio-only conversation happened, no text at all
    // Save a note that the answer was given via voice
    if (userHasSpoken && evaTurns >= 2) {
      return 'Answered via voice conversation';
    }
    return '';
  }, [answerMode, typedAnswer, messages, userHasSpoken, evaTurns]);

  // Enable Save: type mode needs text, EVA mode needs user to have spoken + EVA responded
  const hasAnswer = answerMode === 'type'
    ? typedAnswer.trim().length > 0
    : (userHasSpoken && evaTurns >= 2) || messages.length >= 2;

  // Connect to Live API (only when EVA mode selected)
  const connectLiveAPI = useCallback(async () => {
    if (isConnecting || isConnected || !prompt) return;
    
    setIsConnecting(true);
    
    try {
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      if (!apiKey) throw new Error('Failed to get API credentials');
      
      const askerName = prompt.from_member?.name || 'A family member';
      const relationship = prompt.from_member?.relationship ? ` (your ${prompt.from_member.relationship})` : '';
      
      const systemPrompt = `You are EVA, a warm AI companion for Living Memory.
You're helping the user answer a question from their family.

Family member: ${askerName}${relationship}
Question: "${prompt.question}"
${prompt.photo ? 'They asked about a specific photo.' : 'This is a general question.'}

Your role:
1. First, warmly read the question to the user and invite them to share their answer
2. Listen carefully to what they say
3. IMPORTANT: Once the user has given a clear, substantive answer to the question, do NOT keep asking more follow-up questions. Instead, acknowledge their answer warmly and let them know you've captured it well. Say something like "That's a wonderful answer" or "I think that captures it beautifully" and let them know they can save it.
4. Only ask a gentle follow-up if their response was very brief (just a few words) or unclear
5. You should ask at most ONE follow-up question total. After that, wrap up warmly.

Signs the question has been answered (stop asking more):
- They gave a name, story, or explanation that addresses the question
- They shared a memory or detail related to the question
- They said more than a sentence or two in response

Be warm, patient, and encouraging. This is a family moment.
Keep your responses concise — 1-2 sentences max.`;

      const client = new GeminiLiveClient(apiKey, {
        responseModalities: ['AUDIO'],
        systemInstruction: systemPrompt,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      }, {
        onConnect: () => {
          console.log('[Answer Modal] Live API connected');
          setIsConnecting(false);
          setIsConnected(true);
          liveClientRef.current = client;
          
          // Send initial greeting
          if (!hasGreetedRef.current) {
            hasGreetedRef.current = true;
            const greeting = `${askerName} asked: "${prompt.question}" — please read this question warmly and invite the user to share their answer. Remember: once they answer, acknowledge it and stop — do not keep probing.`;
            client.sendText(greeting);
          }
        },
        onAudio: () => {
          setIsSpeaking(true);
        },
        onTurnComplete: () => {
          setIsSpeaking(false);
          setEvaTurns(prev => prev + 1);
        },
        onMessage: (message) => {
          // Filter out our internal trigger messages (the greeting prompt we send to EVA)
          const isInternalTrigger = message.type === 'user' && message.content && 
            message.content.includes('please read this question warmly');
          if (message.type === 'user' && message.content && !isInternalTrigger) {
            setMessages(prev => [...prev, { 
              id: `user-${Date.now()}`, 
              role: 'user', 
              content: message.content 
            }]);
          } else if (message.type === 'model' && message.content) {
            setMessages(prev => [...prev, { 
              id: `eva-${Date.now()}`, 
              role: 'assistant', 
              content: message.content 
            }]);
          }
        },
        onError: (error) => {
          console.error('[Answer Modal] Live API error:', error);
          setIsConnecting(false);
        },
      });
      
      client.connect();
    } catch (error) {
      console.error('Failed to connect Live API:', error);
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected, prompt]);

  // Start/stop microphone
  const startMic = useCallback(async () => {
    if (!liveClientRef.current || !isConnected) return;
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = micStream;
      await liveClientRef.current.startMicrophone();
      setIsMicActive(true);
    } catch (error) {
      console.error('Failed to start microphone:', error);
    }
  }, [isConnected]);

  const stopMic = useCallback(() => {
    if (liveClientRef.current) liveClientRef.current.stopMicrophone();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (isMicActive) {
      setUserHasSpoken(true); // user used the mic at least once
    }
    setIsMicActive(false);
    setUserAudioLevel(0);
  }, [isMicActive]);

  const toggleMic = useCallback(() => {
    if (isMicActive) {
      stopMic();
    } else {
      startMic();
    }
  }, [isMicActive, startMic, stopMic]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When EVA mode is selected, connect
  useEffect(() => {
    if (answerMode === 'eva' && prompt && !isConnected && !isConnecting) {
      hasGreetedRef.current = false;
      setMessages([]);
      connectLiveAPI();
    }
  }, [answerMode, prompt, isConnected, isConnecting, connectLiveAPI]);

  // When type mode is selected, focus textarea
  useEffect(() => {
    if (answerMode === 'type') {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [answerMode]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && prompt) {
      setAnswerMode('choose');
      setTypedAnswer('');
      setMessages([]);
      setSaved(false);
      setEvaTurns(0);
      setUserHasSpoken(false);
    }
  }, [isOpen, prompt]);

  // Disconnect when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopMic();
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [isOpen, stopMic]);

  // Save answer
  const handleSaveAnswer = async () => {
    if (!prompt) return;
    
    const answerText = getAnswerText().trim();
    if (!answerText) return;
    
    const isMock = prompt.id.startsWith('mock-');
    
    setIsSaving(true);
    try {
      if (isMock) {
        setSaved(true);
        onAnswerSaved?.(answerText);
        window.dispatchEvent(new CustomEvent('questions-updated'));
        setTimeout(() => onClose(), 1500);
      } else {
        const res = await fetch(`/api/prompts/${prompt.id}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer_text: answerText }),
        });
        
        if (res.ok) {
          setSaved(true);
          onAnswerSaved?.(answerText);
          window.dispatchEvent(new CustomEvent('questions-updated'));
          setTimeout(() => onClose(), 1500);
        }
      }
    } catch (error) {
      console.error('Failed to save answer:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !prompt) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] backdrop-blur-sm"
      style={{ background: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.8)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="absolute inset-4 md:inset-8 lg:inset-12 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: isLight ? 'var(--bg-elevated)' : '#0a0a0f' }}
      >
        {/* Header */}
        <div 
          className="h-14 flex items-center justify-between px-4 flex-shrink-0"
          style={{ 
            background: isLight ? 'var(--bg-secondary)' : '#0d1117',
            borderBottom: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
              style={{ backgroundColor: prompt.from_member?.avatar_color || '#60a5fa' }}
            >
              {prompt.from_member?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="font-medium text-sm" style={{ color: isLight ? 'var(--text-primary)' : '#fff' }}>
                Answer {prompt.from_member?.name || 'Family'}&apos;s Question
              </h2>
              <p className="text-xs" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.5)' }}>
                in &quot;{prompt.album_title}&quot;
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {answerMode === 'eva' && isConnected && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs">Live</span>
              </div>
            )}
            
            {answerMode !== 'choose' && (
              <button
                onClick={handleSaveAnswer}
                disabled={!hasAnswer || isSaving || saved}
                className="px-4 py-1.5 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
              >
                {saved ? '✓ Saved!' : isSaving ? 'Saving...' : 'Save Answer'}
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ 
                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.7)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT: Photo and Question */}
          <div className="flex-1 flex flex-col" style={{ background: isLight ? 'var(--bg-primary)' : '#000' }}>
            {/* Photo display */}
            <div className="flex-1 relative flex items-center justify-center p-4">
              {prompt.photo ? (
                <img 
                  src={prompt.photo.thumbnail_url} 
                  alt="" 
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-medium mb-6"
                    style={{ backgroundColor: prompt.from_member?.avatar_color || '#60a5fa' }}
                  >
                    {prompt.from_member?.name?.charAt(0) || '?'}
                  </div>
                  <p className="text-sm" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.5)' }}>General Question</p>
                </div>
              )}
            </div>
            
            {/* Question box */}
            <div className="p-4" style={{ 
              background: isLight ? 'var(--bg-secondary)' : 'rgba(255,255,255,0.05)',
              borderTop: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.1)'}`,
            }}>
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: prompt.from_member?.avatar_color || '#60a5fa' }}
                >
                  {prompt.from_member?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.5)' }}>
                    {prompt.from_member?.name}{prompt.from_member?.relationship ? ` (${prompt.from_member.relationship})` : ''} asks:
                  </p>
                  <p className="text-sm" style={{ color: isLight ? 'var(--text-primary)' : '#fff' }}>&quot;{prompt.question}&quot;</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* RIGHT: Answer panel */}
          <div 
            className="w-[380px] flex flex-col"
            style={{ 
              background: isLight ? 'var(--bg-secondary)' : '#0d1117',
              borderLeft: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {/* MODE: Choose how to answer */}
            {answerMode === 'choose' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                <div className="text-center mb-2">
                  <h3 className="text-base font-semibold mb-1" style={{ color: isLight ? 'var(--text-primary)' : '#fff' }}>
                    How would you like to answer?
                  </h3>
                  <p className="text-xs" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>
                    Choose how to share your response
                  </p>
                </div>

                {/* Option 1: Type */}
                <button
                  onClick={() => setAnswerMode('type')}
                  className="w-full p-5 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ 
                    background: isLight ? 'var(--bg-primary)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isLight ? 'rgba(14,116,144,0.1)' : 'rgba(6,182,212,0.15)' }}
                    >
                      <svg className="w-6 h-6" style={{ color: '#06b6d4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: isLight ? 'var(--text-primary)' : '#fff' }}>Type your answer</p>
                      <p className="text-xs mt-0.5" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>
                        Write your response directly
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option 2: EVA voice */}
                <button
                  onClick={() => setAnswerMode('eva')}
                  className="w-full p-5 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ 
                    background: isLight ? 'var(--bg-primary)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isLight ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.15)' }}
                    >
                      <svg className="w-6 h-6" style={{ color: '#a78bfa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: isLight ? 'var(--text-primary)' : '#fff' }}>Share with EVA</p>
                      <p className="text-xs mt-0.5" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>
                        Tell your memory through conversation
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* MODE: Type answer */}
            {answerMode === 'type' && (
              <div className="flex-1 flex flex-col p-4">
                {/* Back button */}
                <button
                  onClick={() => { setAnswerMode('choose'); setTypedAnswer(''); }}
                  className="flex items-center gap-1.5 text-xs mb-4 self-start px-2 py-1 rounded-lg transition-colors"
                  style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Back
                </button>

                <p className="text-xs font-medium mb-2" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.5)' }}>
                  Your answer
                </p>
                <textarea
                  ref={textareaRef}
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="flex-1 w-full rounded-xl p-4 text-sm leading-relaxed resize-none outline-none"
                  style={{
                    background: isLight ? 'var(--bg-primary)' : 'rgba(255,255,255,0.05)',
                    color: isLight ? 'var(--text-primary)' : '#fff',
                    border: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                />
                <p className="text-xs mt-2 text-right" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.3)' }}>
                  {typedAnswer.length > 0 ? `${typedAnswer.length} characters` : 'Start typing...'}
                </p>
              </div>
            )}

            {/* MODE: EVA conversation */}
            {answerMode === 'eva' && (
              <>
                {/* Back button */}
                <div className="px-4 pt-3">
                  <button
                    onClick={() => {
                      setAnswerMode('choose');
                      stopMic();
                      if (liveClientRef.current) {
                        liveClientRef.current.disconnect();
                        liveClientRef.current = null;
                      }
                      setIsConnected(false);
                      setIsConnecting(false);
                      setMessages([]);
                      setEvaTurns(0);
                      setUserHasSpoken(false);
                    }}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors"
                    style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    Back
                  </button>
                </div>

                {/* EVA orb + Aurora wave */}
                <div className="flex-shrink-0 relative">
                  <div className="h-32 relative overflow-hidden">
                    <AuroraWave 
                      isActive={isMicActive} 
                      isAISpeaking={isSpeaking} 
                      userAudioLevel={userAudioLevel} 
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <EVAOrb size={80} isSpeaking={isSpeaking} />
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
                  {messages.length === 0 && isConnected && (
                    <div className="text-center py-4 text-sm" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>
                      EVA is listening...
                    </div>
                  )}
                  
                  {messages.length === 0 && !isConnected && !isConnecting && (
                    <div className="text-center py-4 text-sm" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>
                      Waiting to connect...
                    </div>
                  )}
                  
                  {isConnecting && messages.length === 0 && (
                    <div className="text-center py-4 text-sm" style={{ color: isLight ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>
                      Connecting to EVA...
                    </div>
                  )}
                  
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`px-4 py-3 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'ml-6' 
                          : 'mr-6'
                      }`}
                      style={{
                        background: msg.role === 'user'
                          ? (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)')
                          : (isLight ? 'rgba(14,116,144,0.1)' : 'linear-gradient(to bottom right, rgba(6,182,212,0.2), rgba(168,85,247,0.2))'),
                      }}
                    >
                      <p className="text-sm leading-relaxed" style={{ color: isLight ? 'var(--text-primary)' : 'rgba(255,255,255,0.9)' }}>{msg.content}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Controls - mic button */}
                <div className="p-4 flex items-center justify-center gap-4" style={{ borderTop: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.1)'}` }}>
                  <button
                    onClick={toggleMic}
                    disabled={!isConnected}
                    className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={isMicActive 
                      ? { background: isLight ? 'var(--text-primary)' : '#fff', color: isLight ? '#fff' : '#111' }
                      : { background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)', border: `1px solid ${isLight ? 'var(--border-subtle)' : 'rgba(255,255,255,0.3)'}`, color: isLight ? 'var(--text-primary)' : '#fff' }
                    }
                  >
                    {isMicActive && (
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-white/50"
                        style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                      />
                    )}
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
