'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import EVAOrb from '@/components/EVAOrb';
import { AuroraWave } from '@/components/capture/AuroraWave';

interface EVACompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * EVA Companion Modal - For creating new albums
 * Uses Gemini Live API for EVA's voice greeting (output only, no mic needed)
 */
export default function EVACompanionModal({ isOpen, onClose }: EVACompanionModalProps) {
  const router = useRouter();
  
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  
  // Conversation state
  const [lastMessage, setLastMessage] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  
  // Album creation state
  const [phase, setPhase] = useState<'chat' | 'name' | 'creating'>('chat');
  const [albumName, setAlbumName] = useState('');
  
  // Refs
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const pendingNavigateRef = useRef<{ albumId: string; phase: 'name_response' | 'redirect_message' } | null>(null);
  const routerRef = useRef(router);
  const handleCloseRef = useRef<() => void>(() => {});
  routerRef.current = router;
  
  // System instruction for EVA in companion mode
  const systemInstruction = `You are EVA (pronounced EE-vuh, like Eve), a warm and friendly AI companion for Living Memory, an app that helps people preserve their precious memories.

Greet the user warmly in 1-2 sentences. Welcome them and mention you're here to help them create a new memory collection.

Do NOT mention being an AI. Speak naturally as a caring companion. Keep it brief and warm.`;

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setStatus('Connecting to EVA...');
    
    try {
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      if (!apiKey) throw new Error('Failed to get API credentials');
      
      const client = new GeminiLiveClient(apiKey, {
        responseModalities: ['AUDIO'],
        systemInstruction,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      }, {
        onConnect: () => {
          setIsConnected(true);
          setIsConnecting(false);
          setStatus('');
          
          // Trigger EVA's greeting
          client.sendText("Greet the user warmly. You're helping them create a new memory collection.");
        },
        onDisconnect: () => {
          setIsConnected(false);
          setStatus('');
        },
        onMessage: (message) => {
          // Only show EVA's responses
          if (message.type === 'model' && message.content) {
            setLastMessage(message.content);
          }
        },
        onAudio: () => {
          setIsAISpeaking(true);
        },
        onTurnComplete: () => {
          setIsAISpeaking(false);
          const pending = pendingNavigateRef.current;
          if (!pending) return;
          if (pending.phase === 'name_response') {
            setLastMessage("Give me a moment—I'll take you to the editor now.");
            client.sendText("Say exactly: Give me a moment—I'll take you to the editor now.");
            pending.phase = 'redirect_message';
          } else if (pending.phase === 'redirect_message') {
            handleCloseRef.current();
            routerRef.current.push(`/album/${pending.albumId}`);
            pendingNavigateRef.current = null;
          }
        },
        onError: (error) => {
          console.error('Live API error:', error);
          setIsConnecting(false);
          setStatus('');
          // Fallback message if connection fails
          setLastMessage("Hi! I'm EVA. Ready to help you create a new memory collection?");
        },
      });
      
      liveClientRef.current = client;
      await client.connect();
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
      setStatus('');
      // Fallback message if connection fails
      setLastMessage("Hi! I'm EVA. Ready to help you create a new memory collection?");
    }
  }, [isConnecting, isConnected]);
  
  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsConnected(false);
    setLastMessage('');
  }, []);
  
  // Handle close
  const handleClose = useCallback(() => {
    pendingNavigateRef.current = null;
    disconnect();
    setPhase('chat');
    setAlbumName('');
    onClose();
  }, [disconnect, onClose]);
  handleCloseRef.current = handleClose;
  
  // Handle "Create Memory" click - tell EVA and go to name phase
  const handleStartCreating = useCallback(() => {
    // Tell EVA user wants to create
    if (liveClientRef.current?.connected) {
      liveClientRef.current.sendText("The user wants to create a memory collection. Say something encouraging about naming it, very brief.");
    }
    setPhase('name');
  }, []);
  
  // Create album
  const handleCreateAlbum = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumName.trim()) return;
    
    setPhase('creating');
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: albumName.trim(),
          album_type: 'event',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (liveClientRef.current?.connected) {
          // Use Live API: EVA responds to name, then says "give me a moment", then we navigate on onTurnComplete
          pendingNavigateRef.current = { albumId: data.id, phase: 'name_response' };
          liveClientRef.current.sendText(`The user just created an album called "${albumName.trim()}". Say something brief and excited about the name.`);
        } else {
          // Fallback when Live API not connected: show message and navigate after delay
          setLastMessage("Give me a moment—I'll take you to the editor now.");
          setTimeout(() => {
            handleClose();
            router.push(`/album/${data.id}`);
          }, 2500);
        }
      } else {
        setPhase('name');
      }
    } catch {
      setPhase('name');
    }
  }, [albumName, router, handleClose]);
  
  // Connect when modal opens
  useEffect(() => {
    if (isOpen && !isConnected && !isConnecting) {
      connect();
    }
    
    return () => {
      if (!isOpen) {
        disconnect();
      }
    };
  }, [isOpen, isConnected, isConnecting, connect, disconnect]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100]">
      {/* Background */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Modal container with rounded edges */}
      <div className="absolute inset-4 md:inset-8 lg:inset-16 rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a0a0f] to-[#0f0a15] border border-white/10 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-white/30'}`} />
            <span className="text-white/70 text-sm">
              {isConnecting ? 'Connecting...' : isConnected ? 'EVA' : 'EVA'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
          
          {/* Chat phase - EVA greeting with buttons */}
          {phase === 'chat' && (
            <>
              {/* EVA Orb */}
              <div className="mb-8">
                <EVAOrb size={160} isSpeaking={isAISpeaking} />
              </div>
              
              {/* EVA's message */}
              <div className="text-center max-w-lg mb-10">
                {status ? (
                  <p className="text-white/50 text-sm">{status}</p>
                ) : lastMessage ? (
                  <p 
                    className="text-white text-xl leading-relaxed"
                    style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                  >
                    {lastMessage}
                  </p>
                ) : (
                  <p className="text-white/50 text-sm">
                    {isConnecting ? 'Waking up EVA...' : ''}
                  </p>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleStartCreating}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-full font-medium tracking-wide hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                >
                  Create New Memory
                </button>
                <button
                  onClick={handleClose}
                  className="px-8 py-4 bg-white/10 text-white/70 rounded-full font-medium tracking-wide hover:bg-white/20 hover:text-white transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </>
          )}
          
          {/* Name input phase */}
          {phase === 'name' && (
            <>
              <div className="mb-6">
                <EVAOrb size={120} isSpeaking={isAISpeaking} />
              </div>
              
              {/* Show EVA's response or default text */}
              <p 
                className="text-white text-xl text-center mb-8 max-w-md"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                {lastMessage || "What would you like to call this memory collection?"}
              </p>
              
              <form onSubmit={handleCreateAlbum} className="w-full max-w-md flex flex-col gap-6">
                <input
                  type="text"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="Summer Vacation 2024..."
                  autoFocus
                  className="w-full bg-transparent border-b-2 border-cyan-500/50 focus:border-cyan-400 text-white text-xl text-center py-4 outline-none placeholder-white/30 transition-colors"
                  style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                />
                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => setPhase('chat')}
                    className="px-6 py-3 bg-white/10 text-white/70 rounded-full font-medium hover:bg-white/20 hover:text-white transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!albumName.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-full font-medium hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Create Album
                  </button>
                </div>
              </form>
            </>
          )}
          
          {/* Creating phase */}
          {phase === 'creating' && (
            <>
              <div className="mb-6">
                <EVAOrb size={120} isSpeaking={isAISpeaking} />
              </div>
              
              <p 
                className="text-white text-xl text-center mb-8"
                style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
              >
                {lastMessage || "Creating your album..."}
              </p>
              
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 loading-bar" />
              </div>
            </>
          )}
        </div>
        
        {/* Aurora Wave at bottom */}
        <div className="h-20 relative">
          <AuroraWave 
            isActive={false} 
            isAISpeaking={isAISpeaking} 
            userAudioLevel={0} 
          />
        </div>
      </div>
      
      {/* Styles */}
      <style jsx>{`
        .loading-bar {
          animation: loading 1.5s ease-in-out infinite;
        }
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
