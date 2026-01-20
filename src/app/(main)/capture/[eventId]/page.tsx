'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import { useCamera } from '@/hooks/use-camera';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  photoId?: string;
}

interface CapturedPhoto {
  id: string;
  imageData: string;
  timestamp: number;
  story?: string;
  isGeneratingStory?: boolean;
  isExtracting?: boolean;
  extractionMethod?: string;
  extractionQuality?: string;
}

// Aurora Wave Visualizer - reacts to actual speech
function AuroraWave({ 
  isActive, 
  isAISpeaking, 
  userAudioLevel 
}: { 
  isActive: boolean; 
  isAISpeaking: boolean;
  userAudioLevel: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const animate = () => {
      if (!ctx || !canvas) return;
      
      timeRef.current += 0.02;
      const t = timeRef.current;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerY = canvas.height * 0.5;
      
      // Base amplitude when idle
      let baseAmplitude = 15;
      
      // React to AI speaking
      if (isAISpeaking) {
        baseAmplitude = 80 + Math.sin(t * 5) * 20; // Pulsing when AI speaks
      }
      // React to user speaking (audio level)
      else if (userAudioLevel > 0.1) {
        baseAmplitude = 60 + (userAudioLevel * 40); // Scale with audio level
      }
      // Subtle movement when mic is active but quiet
      else if (isActive) {
        baseAmplitude = 25 + Math.sin(t * 2) * 10;
      }
      
      const amplitude = baseAmplitude;
      
      // Draw multiple layered waves for aurora effect
      const layers = [
        { color: 'rgba(59, 130, 246, 0.3)', offset: 0, speed: 1 },      // Blue
        { color: 'rgba(16, 185, 129, 0.4)', offset: 0.5, speed: 1.2 },  // Green
        { color: 'rgba(139, 92, 246, 0.3)', offset: 1, speed: 0.8 },    // Purple
        { color: 'rgba(6, 182, 212, 0.5)', offset: 1.5, speed: 1.5 },   // Cyan
      ];
      
      layers.forEach(layer => {
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        for (let x = 0; x <= canvas.width; x += 2) {
          const normalizedX = x / canvas.width;
          
          // Multiple sine waves combined for organic feel
          const wave1 = Math.sin((normalizedX * 4 + t * layer.speed + layer.offset) * Math.PI) * amplitude;
          const wave2 = Math.sin((normalizedX * 6 + t * layer.speed * 0.7 + layer.offset) * Math.PI) * amplitude * 0.5;
          const wave3 = Math.sin((normalizedX * 2 + t * layer.speed * 1.3 + layer.offset) * Math.PI) * amplitude * 0.3;
          
          // Add dynamic noise based on speech
          let noise = 0;
          if (isAISpeaking) {
            noise = (Math.random() - 0.5) * 30; // More noise when AI speaks
          } else if (userAudioLevel > 0.1) {
            noise = (Math.random() - 0.5) * (userAudioLevel * 25); // Noise scales with user volume
          }
          
          const y = centerY + wave1 + wave2 + wave3 + noise;
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        
        // Gradient fill - more intense when speaking
        const gradientIntensity = isAISpeaking || userAudioLevel > 0.1 ? 1 : 0.5;
        const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, canvas.height);
        gradient.addColorStop(0, layer.color.replace('0.3', String(0.3 * gradientIntensity)).replace('0.4', String(0.4 * gradientIntensity)).replace('0.5', String(0.5 * gradientIntensity)));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, isAISpeaking, userAudioLevel]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ opacity: isActive ? 1 : 0.5 }}
    />
  );
}

export default function CaptureSessionPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;
  
  // Handle missing eventId
  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b09] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-light mb-4">Event not found</h1>
          <button
            onClick={() => router.push('/capture')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Capture
          </button>
        </div>
      </div>
    );
  }
  
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [userAudioLevel, setUserAudioLevel] = useState(0); // 0-1 audio level
  
  // Scan mode state
  const [isScanning, setIsScanning] = useState(false);
  const [photoDetected, setPhotoDetected] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const scanningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanningAttemptsRef = useRef<number>(0);
  const capturedHashesRef = useRef<Set<string>>(new Set());
  
  // Photos and messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  
  // Refs
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Use the camera hook
  const {
    cameraActive,
    videoReady,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    captureFrame,
  } = useCamera({
    onFrameCapture: (frame) => {
      if (liveClientRef.current?.connected) {
        liveClientRef.current.sendVideoFrame(frame);
      }
    },
  });

  // Mock event data
  const event = {
    id: eventId,
    title: eventId === '1' ? 'Summer 2024 Reunion' : eventId === '2' ? 'Grandma\'s 80th Birthday' : `Event ${eventId}`,
  };

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Monitor audio levels for user speech detection
  useEffect(() => {
    if (!isMicActive || !streamRef.current) {
      setUserAudioLevel(0);
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      return;
    }

    // Set up audio analysis
    const setupAudioAnalysis = async () => {
      try {
        const stream = streamRef.current;
        if (!stream) return;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateAudioLevel = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          
          // Normalize to 0-1 range (threshold at ~30 to filter background noise)
          const normalized = Math.min(1, Math.max(0, (average - 30) / 100));
          setUserAudioLevel(normalized);
        };
        
        audioLevelIntervalRef.current = setInterval(updateAudioLevel, 50);
      } catch (error) {
        console.error('Failed to setup audio analysis:', error);
      }
    };
    
    setupAudioAnalysis();
    
    return () => {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isMicActive]);

  // Compute simple hash for duplicate detection
  const computeSimpleHash = useCallback((dataUrl: string): string => {
    // Take a sample of the data for quick comparison
    const sample = dataUrl.slice(100, 200) + dataUrl.slice(-100);
    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
      hash = ((hash << 5) - hash) + sample.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }, []);

  // Extract clean photo using Nano Banana API
  const extractCleanPhoto = useCallback(async (frame: string): Promise<{ imageData: string; method: string; quality: string } | null> => {
    try {
      setIsExtracting(true);
      setExtractionStatus('Extracting photo...');
      
      const response = await fetch('/api/extract-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: frame }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setExtractionStatus('✅ Photo captured!');
        return {
          imageData: result.imageBase64,
          method: result.method,
          quality: result.quality,
        };
      } else {
        setExtractionStatus('No photo detected');
        return null;
      }
    } catch (error) {
      console.error('Photo extraction error:', error);
      setExtractionStatus('Extraction failed');
      return null;
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
        setExtractionStatus('');
      }, 2000);
    }
  }, []);

  // Compress image for API calls
  const compressImage = useCallback((dataUrl: string, maxWidth: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl); // Fallback to original
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl); // Fallback to original
      img.src = dataUrl;
    });
  }, []);

  // Start scanning mode - shows corner guides
  const startScanning = useCallback(() => {
    if (!cameraActive || !videoReady || isScanning) return;
    
    setIsScanning(true);
    setPhotoDetected(false);
    setScanStatus('Position photo in frame');
    scanningAttemptsRef.current = 0;
    
    // Start checking for photo alignment
    scanningIntervalRef.current = setInterval(async () => {
      const frame = captureFrame();
      if (!frame) return;
      
      scanningAttemptsRef.current++;
      
      // Timeout after 60 seconds
      if (scanningAttemptsRef.current > 75) {
        stopScanning();
        setExtractionStatus('⏱️ Scan timeout');
        setTimeout(() => setExtractionStatus(''), 2000);
        return;
      }
      
      // Compress image before sending to reduce payload size
      const compressedFrame = await compressImage(frame, 800);
      
      // Check if photo is in frame via API
      try {
        const response = await fetch('/api/check-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: compressedFrame }),
        });
        
        if (!response.ok) {
          console.error('Photo check API error:', response.status, response.statusText);
          // Continue scanning even if API fails
          return;
        }
        
        const result = await response.json();
        
        // Handle API errors gracefully
        if (result.error) {
          console.error('Photo check error:', result.error);
          return;
        }
        
        if (result.detected && result.confidence > 0.7) {
          if (result.quality === 'good' && result.allCornersVisible) {
            setPhotoDetected(true);
            setScanStatus('✅ Photo detected! Hold still...');
            
            // Wait a moment to ensure stability, then capture
            setTimeout(async () => {
              if (!isScanning) return;
              
              // Check for duplicates
              const hash = computeSimpleHash(frame);
              if (capturedHashesRef.current.has(hash)) {
                setScanStatus('📷 Already captured this photo');
                setTimeout(() => {
                  setPhotoDetected(false);
                  setScanStatus('Position another photo');
                }, 1500);
                return;
              }
              
              // Extract and save
              const extracted = await extractCleanPhoto(frame);
              
              if (extracted) {
                capturedHashesRef.current.add(hash);
                
                const photo: CapturedPhoto = {
                  id: `photo-${Date.now()}`,
                  imageData: extracted.imageData,
                  timestamp: Date.now(),
                  extractionMethod: extracted.method,
                  extractionQuality: extracted.quality,
                };
                
                setCapturedPhotos(prev => [...prev, photo]);
                
                // Notify Gemini
                if (liveClientRef.current?.connected) {
                  liveClientRef.current.sendText("I just captured this photo. What do you see? Help me remember the story behind it.");
                }
                
                // Reset for next photo
                setPhotoDetected(false);
                setScanStatus('Position another photo');
              }
            }, 500);
          } else if (result.quality === 'partial') {
            setPhotoDetected(false);
            setScanStatus('⚠️ Show all 4 corners');
          } else {
            setPhotoDetected(false);
            setScanStatus('📷 Hold steady...');
          }
        } else {
          setPhotoDetected(false);
          setScanStatus('🔍 Looking for photo...');
        }
      } catch (error) {
        console.error('Photo check error:', error);
        // Continue scanning even if check fails
        // Don't update status to avoid flickering
      }
    }, 1000); // Increased interval to reduce API load
  }, [cameraActive, videoReady, isScanning, captureFrame, extractCleanPhoto, computeSimpleHash, compressImage]);

  // Stop scanning mode
  const stopScanning = useCallback(() => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
      scanningIntervalRef.current = null;
    }
    setIsScanning(false);
    setPhotoDetected(false);
    setScanStatus('');
    scanningAttemptsRef.current = 0;
  }, []);

  // Manual capture (bypass scanning, direct extract)
  const handleCapturePhoto = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    
    // Check for duplicates
    const hash = computeSimpleHash(frame);
    if (capturedHashesRef.current.has(hash)) {
      setExtractionStatus('📷 Already captured!');
      setTimeout(() => setExtractionStatus(''), 2000);
      return;
    }
    
    const extracted = await extractCleanPhoto(frame);
    
    if (extracted) {
      capturedHashesRef.current.add(hash);
      
      const photo: CapturedPhoto = {
        id: `photo-${Date.now()}`,
        imageData: extracted.imageData,
        timestamp: Date.now(),
        extractionMethod: extracted.method,
        extractionQuality: extracted.quality,
      };
      
      setCapturedPhotos(prev => [...prev, photo]);
      
      if (liveClientRef.current?.connected) {
        liveClientRef.current.sendText("I just captured this photo. Please look at it and help me remember the story behind it.");
      }
    }
  }, [captureFrame, extractCleanPhoto, computeSimpleHash]);

  // Cleanup scanning on unmount
  useEffect(() => {
    return () => {
      if (scanningIntervalRef.current) {
        clearInterval(scanningIntervalRef.current);
      }
    };
  }, []);

  // Generate story for a photo
  const generateStoryForPhoto = useCallback(async (photoId: string) => {
    const photo = capturedPhotos.find(p => p.id === photoId);
    if (!photo) return;
    
    setCapturedPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, isGeneratingStory: true } : p
    ));
    
    const relatedMessages = messages.filter(m => 
      m.timestamp >= photo.timestamp && m.timestamp <= photo.timestamp + 300000
    );
    
    const conversationContext = relatedMessages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n');
    
    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64: photo.imageData,
          conversationContext,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCapturedPhotos(prev => prev.map(p => 
          p.id === photoId ? { ...p, story: data.story, isGeneratingStory: false } : p
        ));
      }
    } catch (error) {
      console.error('Failed to generate story:', error);
      setCapturedPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, isGeneratingStory: false } : p
      ));
    }
  }, [capturedPhotos, messages]);

  // Build system instruction with album context
  const buildSystemInstruction = useCallback((albumContext?: {
    title?: string;
    date?: string;
    location?: string;
    existingPhotos?: Array<{ id: string; description?: string }>;
    existingStories?: Array<{ content: string; photoId?: string }>;
    people?: string[];
  }) => {
    let instruction = `You are a warm, empathetic AI helping preserve precious family memories. You're like a trusted friend who genuinely cares about the stories behind old photographs.

Your personality:
- Warm, curious, and genuinely interested
- Speak naturally and conversationally
- Be observant about details in photos
- Ask thoughtful follow-up questions to build the story

CRITICAL BEHAVIORS:
1. Always ask follow-up questions - don't just acknowledge, dig deeper
2. Ask about emotions and significance - "What made that moment special?"
3. Ask about context - Who else was there? What happened before/after?
4. Keep responses BRIEF (2-3 sentences max) but always end with a question

When the user captures a photo, acknowledge it and ask about the specific details you can see. Help them tell the complete story.`;

    // Add album/event context if provided
    if (albumContext) {
      instruction += `\n\nIMPORTANT CONTEXT ABOUT THIS MEMORY/EVENT:\n`;
      
      if (albumContext.title) {
        instruction += `- Event/Album: ${albumContext.title}\n`;
      }
      if (albumContext.date) {
        instruction += `- Date: ${albumContext.date}\n`;
      }
      if (albumContext.location) {
        instruction += `- Location: ${albumContext.location}\n`;
      }
      if (albumContext.people && albumContext.people.length > 0) {
        instruction += `- People involved: ${albumContext.people.join(', ')}\n`;
      }
      
      if (albumContext.existingPhotos && albumContext.existingPhotos.length > 0) {
        instruction += `\n- You already know about ${albumContext.existingPhotos.length} photo(s) from this event. Use this context to ask about relationships between photos, continuity of the story, or how this new photo relates to what you already know.\n`;
      }
      
      if (albumContext.existingStories && albumContext.existingStories.length > 0) {
        instruction += `\n- Previous stories captured:\n`;
        albumContext.existingStories.slice(0, 3).forEach((story, i) => {
          instruction += `  ${i + 1}. ${story.content.substring(0, 100)}${story.content.length > 100 ? '...' : ''}\n`;
        });
        instruction += `\nReference these stories when relevant, and help build connections between different moments.\n`;
      }
      
      instruction += `\nUse this context to ask more informed questions and help create a richer, more connected narrative about this event.`;
    }
    
    return instruction;
  }, []);

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    
    try {
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      
      if (!apiKey) {
        throw new Error('Failed to get API credentials');
      }
      
      // TODO: Fetch actual album context from API
      // For now, using mock data - replace with actual API call
      const albumContext = {
        title: event.title,
        date: '2024-07-15', // Would come from API
        location: 'Lake Tahoe, CA', // Would come from API
        people: ['Mom', 'Dad', 'Sarah'], // Would come from API
        existingPhotos: [], // Would fetch from API
        existingStories: [], // Would fetch from API
      };
      
      const client = new GeminiLiveClient(apiKey, {
        responseModalities: ['AUDIO'],
        systemInstruction: buildSystemInstruction(albumContext),
      }, {
        onConnect: () => {
          setIsConnected(true);
          setIsConnecting(false);
          
          // Send additional context about the album if available
          // This gives the AI background about the event even before seeing photos
          if (albumContext.existingPhotos && albumContext.existingPhotos.length > 0) {
            const contextMessage = `I'm working on the "${albumContext.title}" event. I've already captured ${albumContext.existingPhotos.length} photos from this event. As we look at new photos, help me see how they connect to the overall story of this event.`;
            client.sendContext(contextMessage);
          }
          
          setMessages([{
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: "I'm ready to help preserve your memories. Turn on the camera and show me your photos — I'll help you capture the stories behind them.",
            timestamp: Date.now(),
          }]);
        },
        onDisconnect: () => {
          setIsConnected(false);
          setIsMicActive(false);
        },
        onMessage: (message) => {
          if (message.type === 'user' && message.content) {
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}-user`,
              role: 'user',
              content: message.content,
              timestamp: message.timestamp,
            }]);
          } else if (message.type === 'model' && message.content) {
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}-ai`,
              role: 'assistant',
              content: message.content,
              timestamp: message.timestamp,
            }]);
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
          setIsConnecting(false);
        },
        onInterrupted: () => {
          setIsAISpeaking(false);
        },
      });
      
      liveClientRef.current = client;
      await client.connect();
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsConnected(false);
    setIsMicActive(false);
    stopCamera();
  }, [stopCamera]);

  // Start microphone
  const startMic = useCallback(async () => {
    if (!liveClientRef.current || !isConnected) return;
    
    try {
      // Get microphone stream for audio analysis
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = micStream;
      
      await liveClientRef.current.startMicrophone();
      setIsMicActive(true);
    } catch (error) {
      console.error('Failed to start microphone:', error);
    }
  }, [isConnected]);

  // Stop microphone
  const stopMic = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.stopMicrophone();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsMicActive(false);
    setUserAudioLevel(0);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const selectedPhoto = capturedPhotos.find(p => p.id === selectedPhotoId);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #0a0a0f, #0d1117)' }}
    >
      {/* Camera feed - full screen when active */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            cameraActive && videoReady ? 'opacity-80' : 'opacity-0'
          }`}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Gradient overlay for camera */}
        {cameraActive && !isScanning && (
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(10,10,15,0.3) 0%, transparent 30%, transparent 70%, rgba(10,10,15,0.8) 100%)'
            }}
          />
        )}
        
        {/* Scanning mode - corner guides overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            {/* Darkened edges outside the frame */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 100%)'
              }}
            />
            
            {/* Photo alignment frame */}
            <div className={`relative w-[95%] h-[85%] max-w-none border-2 rounded-lg transition-all duration-300 ${
              photoDetected 
                ? 'border-green-400 border-solid shadow-2xl shadow-green-400/50' 
                : 'border-white/60 border-dashed'
            }`}>
              {/* Corner brackets */}
              <div className={`absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 rounded-tl-lg transition-colors ${
                photoDetected ? 'border-green-400' : 'border-white'
              }`} />
              <div className={`absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 rounded-tr-lg transition-colors ${
                photoDetected ? 'border-green-400' : 'border-white'
              }`} />
              <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 rounded-bl-lg transition-colors ${
                photoDetected ? 'border-green-400' : 'border-white'
              }`} />
              <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 rounded-br-lg transition-colors ${
                photoDetected ? 'border-green-400' : 'border-white'
              }`} />
              
              {/* Scanning animation line */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div 
                  className="absolute inset-x-0 h-0.5"
                  style={{ 
                    background: `linear-gradient(to right, transparent, ${photoDetected ? '#4ade80' : '#60a5fa'}, transparent)`,
                    animation: 'scanLine 2s linear infinite',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }} 
                />
              </div>
              
              {/* Pulsing effect when detected */}
              {photoDetected && (
                <div className="absolute inset-0 rounded-lg border-2 border-green-400 animate-ping opacity-30" />
              )}
              
              {/* Status text */}
              <div className={`absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                photoDetected 
                  ? 'text-white bg-green-600/90 font-bold shadow-lg' 
                  : scanStatus.includes('⚠️')
                    ? 'text-white bg-yellow-600/90'
                    : 'text-white bg-white/20 backdrop-blur-sm'
              }`}>
                <span className={`inline-block w-2 h-2 rounded-full animate-pulse mr-2 ${
                  photoDetected ? 'bg-green-300' : scanStatus.includes('⚠️') ? 'bg-yellow-300' : 'bg-blue-400'
                }`} />
                {scanStatus || 'Align photo with corners'}
              </div>
            </div>
          </div>
        )}
        
        {/* Extracting overlay */}
        {isExtracting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <div className="bg-black/70 backdrop-blur-md rounded-2xl px-8 py-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin" />
              <p className="text-white text-lg font-medium">{extractionStatus || 'Processing...'}</p>
              <p className="text-white/50 text-sm mt-1">Cleaning up photo</p>
            </div>
          </div>
        )}
        
        {/* Status notification */}
        {extractionStatus && !isExtracting && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
            <div className={`backdrop-blur-sm rounded-full px-6 py-2 font-medium shadow-lg ${
              extractionStatus.includes('✅') || extractionStatus.includes('captured')
                ? 'bg-green-500/90 text-white'
                : extractionStatus.includes('⚠️') || extractionStatus.includes('timeout')
                  ? 'bg-yellow-500/90 text-white'
                  : 'bg-white/20 text-white'
            }`}>
              {extractionStatus}
            </div>
          </div>
        )}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              disconnect();
              router.push('/capture');
            }}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-2">
            {isConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white/80 text-sm">Live</span>
              </div>
            )}
          </div>
          
          {/* Gallery toggle */}
          <button
            onClick={() => setShowGallery(!showGallery)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              showGallery ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {capturedPhotos.length > 0 && (
              <span className="text-sm">{capturedPhotos.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Photo gallery sidebar */}
      {showGallery && (
        <div 
          className="absolute top-16 right-4 bottom-48 w-80 z-30 rounded-2xl overflow-hidden backdrop-blur-xl"
          style={{ background: 'rgba(15,15,20,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-medium">Captured Photos</h3>
            <p className="text-white/50 text-xs mt-1">{capturedPhotos.length} photos in this session</p>
          </div>
          
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-80px)] scrollbar-hide">
            {capturedPhotos.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm">No photos captured yet</p>
                <p className="text-white/30 text-xs mt-1">Use the capture button while showing a photo</p>
              </div>
            ) : (
              capturedPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  className={`rounded-xl overflow-hidden cursor-pointer transition-all ${
                    selectedPhotoId === photo.id ? 'ring-2 ring-green-400' : 'hover:ring-2 hover:ring-white/30'
                  }`}
                  onClick={() => setSelectedPhotoId(selectedPhotoId === photo.id ? null : photo.id)}
                >
                  <div className="relative aspect-[4/3]">
                    <img 
                      src={photo.imageData} 
                      alt="Captured"
                      className={`w-full h-full object-cover transition-all ${photo.isExtracting ? 'opacity-50 blur-sm' : ''}`}
                    />
                    {/* Extracting overlay */}
                    {photo.isExtracting && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    {/* Story badge */}
                    {photo.story && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-green-500/80 text-white text-xs">
                        Story saved
                      </div>
                    )}
                    {/* Quality badge */}
                    {photo.extractionQuality && !photo.story && (
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-white text-xs ${
                        photo.extractionQuality === 'excellent' ? 'bg-blue-500/80' :
                        photo.extractionQuality === 'good' ? 'bg-green-500/80' :
                        'bg-yellow-500/80'
                      }`}>
                        {photo.extractionQuality === 'excellent' ? '✨ Clean' :
                         photo.extractionQuality === 'good' ? '📸 Good' :
                         '⚠️ Basic'}
                      </div>
                    )}
                  </div>
                  
                  {/* Expanded view with story */}
                  {selectedPhotoId === photo.id && (
                    <div className="p-3 bg-white/5">
                      {photo.story ? (
                        <p className="text-white/80 text-sm leading-relaxed">{photo.story}</p>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateStoryForPhoto(photo.id);
                          }}
                          disabled={photo.isGeneratingStory}
                          className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {photo.isGeneratingStory ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Generating story...
                            </span>
                          ) : (
                            'Generate Story'
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Transcript overlay - floating messages */}
      {isConnected && messages.length > 0 && (
        <div className="absolute top-20 left-4 right-4 md:left-8 md:right-auto md:max-w-md z-10 max-h-[40vh] overflow-y-auto scrollbar-hide">
          <div className="space-y-3">
            {messages.slice(-3).map((msg) => (
              <div
                key={msg.id}
                className={`px-4 py-3 rounded-2xl backdrop-blur-md animate-fade-in ${
                  msg.role === 'user' 
                    ? 'bg-white/10 border border-white/20 ml-8' 
                    : 'bg-green-500/10 border border-green-500/20 mr-8'
                }`}
              >
                <p className="text-white/90 text-sm leading-relaxed">{msg.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Pre-connection state */}
      {!isConnected && !isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center max-w-md px-8">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(59,130,246,0.5), rgba(16,185,129,0.5), rgba(139,92,246,0.5), rgba(59,130,246,0.5))',
                  filter: 'blur(20px)',
                  animation: 'spin 4s linear infinite'
                }}
              />
              <div className="absolute inset-2 rounded-full bg-[#0d1117] flex items-center justify-center">
                <svg className="w-10 h-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-white text-2xl font-light mb-3">
              {event.title}
            </h2>
            <p className="text-white/50 text-sm mb-8">
              Start a conversation to capture memories
            </p>
            
            <button
              onClick={connect}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Start Session
            </button>
          </div>
        </div>
      )}

      {/* Connecting state */}
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(59,130,246,0.8), rgba(16,185,129,0.8), rgba(139,92,246,0.8), rgba(59,130,246,0.8))',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <div className="absolute inset-2 rounded-full bg-[#0d1117]" />
            </div>
            <p className="text-white/70 text-sm">Connecting...</p>
          </div>
        </div>
      )}

      {/* Aurora wave at bottom - now reacts to speech */}
      <div className="absolute bottom-0 left-0 right-0 h-48 z-10 pointer-events-none">
        <AuroraWave 
          isActive={isConnected && (isMicActive || isAISpeaking)} 
          isAISpeaking={isAISpeaking}
          userAudioLevel={userAudioLevel}
        />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
        <div className="flex items-center justify-center gap-4">
          
          {/* Camera toggle */}
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            disabled={!isConnected}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              !isConnected 
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : cameraActive 
                  ? 'bg-blue-500/30 border border-blue-400/50 text-blue-400' 
                  : 'bg-white/10 border border-white/20 text-white/60 hover:text-white hover:border-white/40'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
          
          {/* Scan mode toggle - shows corner guides */}
          <button
            onClick={isScanning ? stopScanning : startScanning}
            disabled={!cameraActive || !videoReady || isExtracting}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all relative ${
              !cameraActive || !videoReady || isExtracting
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : isScanning
                  ? 'bg-green-500/30 border-2 border-green-400 text-green-400 shadow-lg shadow-green-400/30'
                  : 'bg-white/10 border border-white/20 text-white/60 hover:text-white hover:border-white/40'
            }`}
            title={isScanning ? 'Stop scanning' : 'Scan photo'}
          >
            {isScanning && (
              <span className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-30" />
            )}
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {/* QR/scan icon with corner brackets */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h3.75v3.75H3.75V4.5zM3.75 15.75h3.75v3.75H3.75v-3.75zM15.75 4.5h4.5v3.75h-4.5V4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25v2.25h2.25M5.25 18.75v-2.25h2.25M18.75 5.25v2.25h-2.25" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75h4.5v4.5h-4.5v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 18.75v-2.25h-2.25" />
              {/* Center scanning lines */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v7.5M8.25 12h7.5" />
            </svg>
          </button>
          
          {/* Manual capture photo button */}
          <button
            onClick={handleCapturePhoto}
            disabled={!cameraActive || !videoReady || isExtracting || isScanning}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              !cameraActive || !videoReady || isExtracting || isScanning
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-white/10 border border-white/20 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/20'
            }`}
            title="Manual capture"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </button>
          
          {/* Main mic button */}
          <button
            onClick={isMicActive ? stopMic : startMic}
            disabled={!isConnected}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              !isConnected
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : isMicActive 
                  ? 'bg-white text-gray-900' 
                  : 'bg-white/10 border border-white/30 text-white hover:border-white/50'
            }`}
          >
            {isMicActive && (
              <div 
                className="absolute inset-0 rounded-full border-2 border-white/50"
                style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}
              />
            )}
            
            <svg 
              className="w-7 h-7" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          {/* End session */}
          <button
            onClick={() => {
              disconnect();
              router.push('/capture');
            }}
            className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
