'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type CaptureMode = 'idle' | 'camera' | 'conversation';

export default function CaptureSessionPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [mode, setMode] = useState<CaptureMode>('idle');
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mock event data - will be fetched from API
  const event = {
    id: eventId,
    title: eventId === '1' ? 'Summer 2024 Reunion' : 'Grandma\'s 80th Birthday',
    photoCount: eventId === '1' ? 12 : 8,
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Back camera on mobile
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      
      setMode('camera');
    } catch (error) {
      console.error('Failed to access camera:', error);
      alert('Could not access camera. Please ensure you have granted camera permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMode('idle');
  };

  // Start Gemini Live conversation
  const startConversation = async () => {
    setIsConnecting(true);
    
    // TODO: Implement Gemini Live API connection
    // For now, simulate connection
    setTimeout(() => {
      setIsConnecting(false);
      setMode('conversation');
      setTranscript(['AI: Hello! I can see you\'re ready to share some memories. Tell me about the photos you\'re looking at.']);
    }, 1500);
  };

  // Capture a photo frame
  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const photoUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhotos(prev => [...prev, photoUrl]);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col">
      {/* Session Header */}
      <div className="p-4 border-b border-[var(--accent)] border-opacity-10">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/capture" 
              className="text-sm text-[var(--accent)] hover:underline mb-1 inline-block"
            >
              ← Back to Events
            </Link>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              {event.title}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--foreground)] opacity-50">
              {capturedPhotos.length} photos captured
            </div>
            {mode === 'conversation' && (
              <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Camera/Photo Section */}
        <div className="flex-1 bg-black relative">
          {mode === 'idle' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white bg-opacity-10 flex items-center justify-center">
                  <span className="text-5xl">📸</span>
                </div>
                <h2 className="text-white text-xl mb-2">Ready to Capture</h2>
                <p className="text-white text-opacity-60 mb-6 max-w-sm">
                  Start the camera and begin a conversation to capture memories from your photos
                </p>
                <button
                  onClick={startCamera}
                  className="py-3 px-8 bg-white text-black rounded-full font-medium hover:bg-opacity-90 transition-colors"
                >
                  Start Camera
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Camera Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
                <div className="flex items-center justify-center gap-4">
                  {mode === 'camera' && (
                    <>
                      <button
                        onClick={stopCamera}
                        className="w-12 h-12 rounded-full bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-colors flex items-center justify-center"
                      >
                        ✕
                      </button>
                      <button
                        onClick={startConversation}
                        disabled={isConnecting}
                        className="py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isConnecting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            Connecting...
                          </span>
                        ) : (
                          '🎙️ Start Conversation'
                        )}
                      </button>
                    </>
                  )}
                  
                  {mode === 'conversation' && (
                    <>
                      <button
                        onClick={capturePhoto}
                        className="w-16 h-16 rounded-full bg-white text-black hover:bg-opacity-90 transition-colors flex items-center justify-center text-2xl shadow-lg"
                      >
                        📷
                      </button>
                      <button
                        onClick={stopCamera}
                        className="py-3 px-6 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors"
                      >
                        End Session
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Captured photos strip */}
              {capturedPhotos.length > 0 && (
                <div className="absolute top-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2">
                  {capturedPhotos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`Captured ${i + 1}`}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-lg flex-shrink-0"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Transcript Section */}
        {mode === 'conversation' && (
          <div className="w-full md:w-96 bg-[var(--paper)] border-t md:border-t-0 md:border-l border-[var(--accent)] border-opacity-10 flex flex-col max-h-[40vh] md:max-h-none">
            <div className="p-4 border-b border-[var(--accent)] border-opacity-10">
              <h3 className="font-medium text-[var(--accent)]">Conversation</h3>
              <p className="text-xs text-[var(--foreground)] opacity-50">
                Speak naturally about your memories
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcript.map((line, i) => {
                const isAI = line.startsWith('AI:');
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm ${
                      isAI 
                        ? 'bg-[var(--accent)] bg-opacity-5 border-l-2 border-[var(--accent)]' 
                        : 'bg-white border-r-2 border-[var(--accent-light)]'
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
              
              {/* Listening indicator */}
              <div className="flex items-center gap-2 text-[var(--accent)] opacity-60">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">Listening...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
