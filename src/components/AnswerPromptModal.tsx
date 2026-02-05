'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import EVAOrb from '@/components/EVAOrb';
import { AuroraWave } from '@/components/capture/AuroraWave';

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

interface AnswerPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: FamilyPrompt | null;
  onAnswerSaved?: () => void;
}

export default function AnswerPromptModal({ 
  isOpen, 
  onClose, 
  prompt,
  onAnswerSaved 
}: AnswerPromptModalProps) {
  // EVA Live API state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasGreetedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get full user response from messages
  const userResponse = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');

  // Connect to Live API
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
1. First, warmly read the question to the user
2. Help them recall and share the story
3. Ask gentle follow-up questions if needed
4. When they seem done, summarize their answer briefly

Be warm, patient, and encouraging. This is a family moment.
Keep your responses concise.`;

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
            const greeting = `${askerName} asked: "${prompt.question}" Would you like to share your answer?`;
            client.sendText(greeting);
          }
        },
        onAudio: () => {
          setIsSpeaking(true);
        },
        onTurnComplete: () => {
          setIsSpeaking(false);
        },
        onTranscript: (text) => {
          // User's speech transcript - add as message
          setMessages(prev => [...prev, { 
            id: `user-${Date.now()}`, 
            role: 'user', 
            content: text 
          }]);
        },
        onModelTurn: (text) => {
          // EVA's response text
          if (text) {
            setMessages(prev => [...prev, { 
              id: `eva-${Date.now()}`, 
              role: 'assistant', 
              content: text 
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
    setIsMicActive(false);
    setUserAudioLevel(0);
  }, []);

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

  // Connect when modal opens
  useEffect(() => {
    if (isOpen && prompt && !isConnected && !isConnecting) {
      hasGreetedRef.current = false;
      setMessages([]);
      setSaved(false);
      connectLiveAPI();
    }
  }, [isOpen, prompt, isConnected, isConnecting, connectLiveAPI]);

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

  // Save answer (skip API for mock prompts)
  const handleSaveAnswer = async () => {
    if (!prompt || !userResponse.trim()) return;
    
    const isMock = prompt.id.startsWith('mock-');
    
    setIsSaving(true);
    try {
      if (isMock) {
        // Mock prompt - simulate success
        setSaved(true);
        onAnswerSaved?.();
        setTimeout(() => onClose(), 1500);
      } else {
        const res = await fetch(`/api/prompts/${prompt.id}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer_text: userResponse.trim() }),
        });
        
        if (res.ok) {
          setSaved(true);
          onAnswerSaved?.();
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
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal container - matching CaptureModal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 rounded-2xl overflow-hidden shadow-2xl bg-[#0a0a0f] flex flex-col">
        {/* Header - matching CaptureSession modal header */}
        <div className="h-14 bg-[#0d1117] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
              style={{ backgroundColor: prompt.from_member?.avatar_color || '#60a5fa' }}
            >
              {prompt.from_member?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-white font-medium text-sm">
                Answer {prompt.from_member?.name || 'Family'}&apos;s Question
              </h2>
              <p className="text-white/50 text-xs">
                in &quot;{prompt.album_title}&quot;
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isConnected && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs">Live</span>
              </div>
            )}
            
            <button
              onClick={handleSaveAnswer}
              disabled={!userResponse.trim() || isSaving || saved}
              className="px-4 py-1.5 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              {saved ? '✓ Saved!' : isSaving ? 'Saving...' : 'Save Answer'}
            </button>
            
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content - split view */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT: Photo and Question */}
          <div className="flex-1 bg-black flex flex-col">
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
                  <p className="text-white/50 text-sm">General Question</p>
                </div>
              )}
            </div>
            
            {/* Question box */}
            <div className="p-4 bg-white/5 border-t border-white/10">
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: prompt.from_member?.avatar_color || '#60a5fa' }}
                >
                  {prompt.from_member?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-white/50 text-xs mb-1">
                    {prompt.from_member?.name}{prompt.from_member?.relationship ? ` (${prompt.from_member.relationship})` : ''} asks:
                  </p>
                  <p className="text-white text-sm">&quot;{prompt.question}&quot;</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* RIGHT: EVA Conversation - matches CaptureSession */}
          <div className="w-[380px] flex flex-col border-l border-white/10 bg-[#0d1117]">
            {/* EVA orb + Aurora wave */}
            <div className="flex-shrink-0 relative">
              {/* Aurora wave behind */}
              <div className="h-32 relative overflow-hidden">
                <AuroraWave 
                  isActive={isMicActive} 
                  isAISpeaking={isSpeaking} 
                  userAudioLevel={userAudioLevel} 
                />
              </div>
              {/* EVA orb centered */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <EVAOrb size={80} isSpeaking={isSpeaking} />
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
              {messages.length === 0 && isConnected && (
                <div className="text-center py-4 text-white/40 text-sm">
                  EVA is listening...
                </div>
              )}
              
              {messages.length === 0 && !isConnected && !isConnecting && (
                <div className="text-center py-4 text-white/40 text-sm">
                  Waiting to connect...
                </div>
              )}
              
              {isConnecting && messages.length === 0 && (
                <div className="text-center py-4 text-white/40 text-sm">
                  Connecting to EVA...
                </div>
              )}
              
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`px-4 py-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-white/10 ml-6' 
                      : 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 mr-6'
                  }`}
                >
                  <p className="text-white/90 text-sm leading-relaxed">{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Controls - mic button */}
            <div className="p-4 border-t border-white/10 flex items-center justify-center gap-4">
              <button
                onClick={toggleMic}
                disabled={!isConnected}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isMicActive 
                    ? 'bg-white text-gray-900' 
                    : 'bg-white/10 border border-white/30 text-white hover:border-white/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
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
          </div>
        </div>
      </div>
    </div>
  );
}
