/**
 * Live Mode Component
 * Handles Gemini Live API integration, camera, and real-time conversation
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import { useCamera } from '@/hooks/use-camera';
import { usePhotoScanner } from '@/hooks/use-photo-scanner';
import { saveSession, updateSession, saveMessage, getAssociatedPhotoIds, getSession, savePhoto } from '@/lib/storage/conversation-storage';
import type { ConversationSession, LiveConversationMessage } from '@/lib/types';

interface LiveMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hasImage?: boolean;
}

interface ScannedPhoto {
  id: string;
  imageData: string;
  timestamp: number;
  description?: string;
}

interface LiveModeProps {
  onToast?: (message: string) => void;
  currentSession?: ConversationSession | null;
  onSessionCreated?: (session: ConversationSession) => void;
  onMessageSaved?: (message: LiveConversationMessage) => void;
  onPhotoCaptured?: (photoId: string) => void;
}

export default function LiveMode({ 
  onToast, 
  currentSession, 
  onSessionCreated,
  onMessageSaved,
  onPhotoCaptured,
}: LiveModeProps) {
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [liveInput, setLiveInput] = useState('');
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const liveMessagesEndRef = useRef<HTMLDivElement>(null);
  const lastPhotoCaptureTimeRef = useRef<number>(0);
  const currentSessionRef = useRef<ConversationSession | null>(null);
  const scannedPhotosRef = useRef<ScannedPhoto[]>([]);

  const showToast = useCallback((message: string) => {
    onToast?.(message);
  }, [onToast]);

  const {
    cameraActive,
    videoReady,
    currentFrame,
    currentFrameRef,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
  } = useCamera({
    onFrameCapture: (frame) => {
      if (liveClientRef.current?.connected) {
        liveClientRef.current.sendVideoFrame(frame);
      }
    },
  });

  const {
    scannedPhotos,
    isScanning,
    photoDetected,
    scanStatus,
    capturePhoto,
    startScanning,
    stopScanning,
  } = usePhotoScanner({
    videoRef,
    currentFrameRef,
    onToast: showToast,
  });
  
  // Keep refs in sync with state/props
  useEffect(() => {
    currentSessionRef.current = currentSession || null;
  }, [currentSession]);
  
  useEffect(() => {
    scannedPhotosRef.current = scannedPhotos;
  }, [scannedPhotos]);
  
  // Track photo captures and notify parent
  useEffect(() => {
    if (scannedPhotos.length > 0 && currentSession) {
      const latestPhoto = scannedPhotos[scannedPhotos.length - 1];
      lastPhotoCaptureTimeRef.current = latestPhoto.timestamp;
      
      // Save photos to storage and notify parent about new photos
      scannedPhotos.forEach(photo => {
        // Save photo to storage
        savePhoto({
          id: photo.id,
          imageData: photo.imageData,
          timestamp: photo.timestamp,
          description: photo.description,
          sessionId: currentSession.id,
        });
        
        // Notify parent about new photos
        if (!currentSession.photoIds.includes(photo.id)) {
          onPhotoCaptured?.(photo.id);
        }
      });
    }
  }, [scannedPhotos, currentSession, onPhotoCaptured]);

  // Auto-scroll messages
  useEffect(() => {
    liveMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages]);

  const connectToLiveAPI = async () => {
    if (isConnecting || isLiveConnected) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      
      if (!apiKey) {
        throw new Error('Failed to get API credentials');
      }
      
      const client = new GeminiLiveClient(apiKey, {
        responseModalities: ['AUDIO'],
        systemInstruction: `You are Gemini, a helpful and friendly AI assistant helping preserve family memories. You can see through the user's camera and hear them speak.

When you see a physical photograph being shown, include [PHOTO] in your response to save it.

Your personality:
- Warm, curious, and genuinely interested in what the user shows you
- Respond naturally like a friend would, with appropriate emotion and enthusiasm
- Be observant - notice and comment on details you see
- Ask follow-up questions to learn more about the memories and people in photos

Keep responses natural, conversational, and BRIEF - like talking to a friend. Don't give long speeches.`,
      }, {
        onConnect: () => {
          console.log('Connected to Gemini Live!');
          setIsLiveConnected(true);
          setIsConnecting(false);
          showToast('✅ Connected to Gemini Live!');
          
          // Create new conversation session
          const session: ConversationSession = {
            id: `session-${Date.now()}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            photoIds: [],
            messageIds: [],
          };
          saveSession(session);
          
          // Update both ref and parent state immediately
          currentSessionRef.current = session;
          onSessionCreated?.(session);
          
          // Save welcome message
          const welcomeMsg: LiveConversationMessage = {
            id: `msg-${Date.now()}`,
            sessionId: session.id,
            role: 'assistant',
            content: "🎙️ Connected! I can now see and hear you. Show me a photo and tell me about it - I'm listening!",
            timestamp: Date.now(),
            associatedPhotoIds: [],
          };
          saveMessage(welcomeMsg);
          updateSession(session.id, { messageIds: [welcomeMsg.id] });
        },
        onDisconnect: () => {
          setIsLiveConnected(false);
          showToast('❌ Disconnected from Gemini Live');
        },
        onMessage: (message) => {
          const role = message.type === 'model' ? 'assistant' : 'user';
          
          // Update UI messages
          if (message.type === 'user') {
            setLiveMessages(prev => [...prev, {
              role: 'user',
              content: message.content,
              timestamp: message.timestamp,
            }]);
          } else if (message.type === 'model') {
            setLiveMessages(prev => [...prev, {
              role: 'assistant',
              content: message.content,
              timestamp: message.timestamp,
            }]);
          }
          
          // Save message to session with photo associations
          // Use refs to get latest values (avoid stale closure)
          const session = currentSessionRef.current;
          const photos = scannedPhotosRef.current;
          
          if (session && message.content) {
            console.log('Saving message to session:', session.id, message.content.substring(0, 50));
            
            const recentPhotoIds = photos
              .filter(p => message.timestamp - p.timestamp <= 5000)
              .map(p => p.id);
            
            const associatedPhotoIds = getAssociatedPhotoIds(
              message,
              lastPhotoCaptureTimeRef.current,
              recentPhotoIds
            );
            
            const liveMsg: LiveConversationMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sessionId: session.id,
              role,
              content: message.content,
              timestamp: message.timestamp,
              associatedPhotoIds,
              context: {
                cameraActive,
                photosVisible: photos.map(p => p.id),
              },
            };
            
            saveMessage(liveMsg);
            onMessageSaved?.(liveMsg);
            const updatedSession = getSession(session.id);
            if (updatedSession && !updatedSession.messageIds.includes(liveMsg.id)) {
              updateSession(session.id, {
                messageIds: [...updatedSession.messageIds, liveMsg.id],
              });
              // Update ref as well
              currentSessionRef.current = {
                ...updatedSession,
                messageIds: [...updatedSession.messageIds, liveMsg.id],
              };
              onSessionCreated?.({
                ...updatedSession,
                messageIds: [...updatedSession.messageIds, liveMsg.id],
              });
            }
          } else {
            console.log('No session available for saving message:', !!session, message.content?.substring(0, 30));
          }
        },
        onAudio: () => {
          setIsAISpeaking(true);
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
          }
          speakingTimeoutRef.current = setTimeout(() => {
            setIsAISpeaking(false);
          }, 1000);
        },
        onError: (error) => {
          console.error('Live API error:', error);
          setConnectionError(error.message);
          setIsConnecting(false);
        },
        onInterrupted: () => {
          setIsAISpeaking(false);
        },
      });
      
      liveClientRef.current = client;
      await client.connect();
    } catch (error) {
      console.error('Failed to connect to Live API:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      setIsConnecting(false);
    }
  };

  const disconnectFromLiveAPI = () => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsLiveConnected(false);
    setIsMicActive(false);
    stopCamera();
  };

  const startMicrophone = async () => {
    if (!liveClientRef.current || !isLiveConnected) {
      showToast('⚠️ Connect to Gemini Live first');
      return;
    }
    
    try {
      await liveClientRef.current.startMicrophone();
      setIsMicActive(true);
      showToast('🎤 Microphone started');
    } catch (error) {
      console.error('Failed to start microphone:', error);
      showToast('❌ Failed to start microphone');
    }
  };

  const stopMicrophone = () => {
    if (liveClientRef.current) {
      liveClientRef.current.stopMicrophone();
      setIsMicActive(false);
    }
  };

  const sendLiveMessage = async (userMessage?: string) => {
    const message = userMessage || liveInput.trim();
    if (!message) return;
    if (!liveClientRef.current || !isLiveConnected) {
      showToast('⚠️ Not connected to Live API');
      return;
    }

    setIsLiveLoading(true);
    setLiveInput('');
    
    liveClientRef.current.sendText(message);
    setIsLiveLoading(false);
  };

  const handleLiveSubmit = () => {
    sendLiveMessage();
  };

  const handleLiveKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleLiveSubmit();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Camera & Controls */}
      <div className="space-y-4">
        {/* Camera View */}
        <div className="bg-black rounded-xl overflow-hidden relative aspect-video">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="absolute -left-[9999px] opacity-0" />
              
              {/* Photo Alignment Frame - only shows when scanning */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={`relative w-[70%] aspect-[4/3] border-2 rounded-lg transition-all duration-300 ${
                    photoDetected 
                      ? 'border-green-400 border-solid animate-pulse shadow-2xl shadow-green-400/70' 
                      : 'border-blue-400 border-dashed'
                  }`}>
                    {/* Corner brackets */}
                    <div className={`absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 rounded-tl-lg transition-colors ${
                      photoDetected ? 'border-green-400' : 'border-blue-400'
                    }`} />
                    <div className={`absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 rounded-tr-lg transition-colors ${
                      photoDetected ? 'border-green-400' : 'border-blue-400'
                    }`} />
                    <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 rounded-bl-lg transition-colors ${
                      photoDetected ? 'border-green-400' : 'border-blue-400'
                    }`} />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 rounded-br-lg transition-colors ${
                      photoDetected ? 'border-green-400' : 'border-blue-400'
                    }`} />
                    
                    {/* Scanning line */}
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
                      <div 
                        className="absolute inset-x-0 top-0 h-1 animate-pulse"
                        style={{ 
                          background: `linear-gradient(to right, transparent, ${photoDetected ? '#4ade80' : '#60a5fa'}, transparent)`,
                          animation: 'scanLine 2s linear infinite'
                        }} 
                      />
                    </div>
                    
                    {/* Status text */}
                    <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                      photoDetected 
                        ? 'text-green-100 bg-green-600/90 font-bold shadow-lg' 
                        : scanStatus.includes('⚠️')
                          ? 'text-yellow-100 bg-yellow-600/90 font-semibold'
                          : 'text-blue-100 bg-blue-900/80 font-semibold'
                    }`}>
                      <span className={`inline-block w-2 h-2 rounded-full animate-pulse mr-2 ${
                        photoDetected ? 'bg-green-300' : scanStatus.includes('⚠️') ? 'bg-yellow-300' : 'bg-blue-400'
                      }`} />
                      {scanStatus || (photoDetected ? '✅ Photo detected! Capturing...' : '🔍 Scanning for photo...')}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status indicators */}
              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                {isLiveConnected && (
                  <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    CONNECTED
                  </div>
                )}
                {cameraActive && (
                  <div className={`flex items-center gap-2 ${videoReady ? 'bg-blue-500' : 'bg-yellow-500'} text-white px-3 py-1 rounded-full text-sm`}>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    📹 {videoReady ? 'CAMERA READY' : 'LOADING...'}
                  </div>
                )}
              </div>
              
              {/* AI Speaking indicator */}
              {isAISpeaking && (
                <div className="absolute bottom-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  AI Speaking...
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50">
              <div className="text-center">
                <div className="text-4xl mb-2">🎙️</div>
                <p>Camera off</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {!isLiveConnected ? (
            <button
              onClick={connectToLiveAPI}
              disabled={isConnecting}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : '🔌 Connect to Gemini Live'}
            </button>
          ) : (
            <>
              <button
                onClick={disconnectFromLiveAPI}
                className="w-full py-2 px-4 bg-red-500 text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                Disconnect
              </button>
              <div className="flex gap-2">
                <button
                  onClick={cameraActive ? stopCamera : startCamera}
                  className={`flex-1 py-2 px-4 rounded-xl transition-opacity ${
                    cameraActive ? 'bg-gray-600' : 'bg-blue-500'
                  } text-white hover:opacity-90`}
                >
                  {cameraActive ? '📹 Stop Camera' : '📹 Start Camera'}
                </button>
                <button
                  onClick={isMicActive ? stopMicrophone : startMicrophone}
                  className={`flex-1 py-2 px-4 rounded-xl transition-opacity ${
                    isMicActive ? 'bg-gray-600' : 'bg-red-500'
                  } text-white hover:opacity-90`}
                >
                  {isMicActive ? '🎤 Stop Mic' : '🎤 Start Mic'}
                </button>
              </div>
              {videoReady && (
                <button
                  onClick={() => {
                    if (isScanning) {
                      stopScanning();
                      showToast('⏹️ Scan cancelled');
                    } else {
                      startScanning();
                    }
                  }}
                  className={`w-full py-3 px-6 ${
                    isScanning 
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' 
                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  } text-white rounded-xl hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2`}
                >
                  {isScanning ? (
                    <>
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      🔍 Scanning... (Click to cancel)
                    </>
                  ) : (
                    '📸 Capture Photo'
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Scanned Photos Gallery */}
        {scannedPhotos.length > 0 && (
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">Scanned Photos ({scannedPhotos.length})</h4>
              <button
                onClick={() => {
                  // Clear photos - would need to pass setScannedPhotos or handle in hook
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {scannedPhotos.map((photo) => (
                <div key={photo.id} className="relative group cursor-pointer">
                  <img
                    src={photo.imageData}
                    alt={`Scanned at ${new Date(photo.timestamp).toLocaleTimeString()}`}
                    className="w-full h-auto rounded-lg border border-gray-200"
                    style={{ minHeight: '80px', backgroundColor: '#f0f0f0' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
          <h4 className="font-medium text-purple-800 mb-2">📸 Photo Capture</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>1. Click <strong>📸 Capture Photo</strong> to start scanning</li>
            <li>2. <strong>Position photo</strong> - all 4 corners must be visible</li>
            <li>3. <strong>Hold steady</strong> - auto-captures when ready!</li>
            <li>• Works like a passport/ID scanner</li>
            <li>• AI will <strong>auto-crop</strong> just the photo</li>
            <li>• <strong>Duplicates auto-detected</strong> - no double saves!</li>
          </ul>
        </div>
      </div>

      {/* Right: Live Chat */}
      <div className="paper-texture rounded-xl shadow-lg overflow-hidden flex flex-col" style={{ height: '600px' }}>
        <div className={`px-4 py-3 ${isLiveConnected ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gray-400'}`}>
          <h2 className="font-medium text-white flex items-center gap-2">
            Live Conversation
            {isLiveConnected && <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />}
          </h2>
          <p className="text-xs text-white text-opacity-80">
            {isLiveConnected 
              ? `Connected${cameraActive ? ' • Camera on' : ''}${isMicActive ? ' • Mic on' : ''}`
              : 'Not connected - click Connect to start'}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {liveMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <div className="text-4xl mb-4 opacity-30">🎙️</div>
                <p className="text-[var(--foreground)] opacity-50">
                  {isLiveConnected 
                    ? 'Connected! Start talking or show photos...'
                    : 'Connect to Gemini Live to start a conversation'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {liveMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`bubble-${msg.role === 'user' ? 'user' : 'ai'} p-4 rounded-lg ${
                    msg.role === 'user' ? 'ml-8' : 'mr-8'
                  }`}
                >
                  <p className="text-sm opacity-50 mb-1">
                    {msg.role === 'user' ? '👤 You' : '🤖 Gemini'}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              {isAISpeaking && (
                <div className="bubble-ai p-4 rounded-lg mr-8">
                  <p className="text-sm opacity-50 mb-1">🤖 Gemini</p>
                  <span className="flex gap-1 items-center">
                    <span className="text-purple-500">🔊 Speaking...</span>
                  </span>
                </div>
              )}
            </>
          )}
          <div ref={liveMessagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Type a message or enable mic for voice</p>
          <div className="flex gap-2">
            <textarea
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              onKeyDown={handleLiveKeyDown}
              placeholder={isLiveConnected ? 'Type a message...' : 'Connect first...'}
              disabled={!isLiveConnected}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={2}
            />
            <button
              onClick={handleLiveSubmit}
              disabled={!isLiveConnected || !liveInput.trim() || isLiveLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
