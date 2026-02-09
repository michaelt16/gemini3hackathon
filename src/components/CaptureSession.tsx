'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';
import { useCamera } from '@/hooks/use-camera';
import { usePhotoScanner } from '@/hooks/use-photo-scanner';
import { ScanOverlay, PhotoGallery, ControlsBar, AuroraWave } from '@/components/capture';
import { getExtractionLabel, uploadPhotoToEvent, saveConversation, enhanceWithNanoBanana } from '@/lib/capture-utils';
import EVAOrb from '@/components/EVAOrb';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentUser } from '@/hooks/use-current-user';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  photoId?: string;
  isPhotoDivider?: boolean;
  isStorySaved?: boolean;
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
  serverId?: string;
  originalUrl?: string;
  hasConversation?: boolean;
}

export interface CaptureSessionProps {
  eventId: string;
  /** If true, renders in modal mode with split layout */
  isModal?: boolean;
  /** Called when session is finished (modal mode) */
  onClose?: () => void;
  /** Called after photos are added (modal mode) */
  onPhotosAdded?: () => void;
  /** Story mode: show static image instead of camera */
  mode?: 'capture' | 'story';
  /** Story mode: photo ID to tell story about */
  storyPhotoId?: string;
  /** Story mode: photo URL to display */
  storyPhotoUrl?: string;
  /** Story mode: existing summary to show */
  existingSummary?: string | null;
  /** Story mode: callback when story is generated */
  onStoryGenerated?: (story: string) => void;
  /** Called when EVA finishes her initial greeting */
  onGreetingComplete?: () => void;
}

// Sample photos for judge/demo mode
const SAMPLE_PHOTOS = [
  '/pic1.PNG', '/pic2.PNG', '/pic3.PNG', '/pic4.PNG',
  '/pic5.jpg', '/pic6.jpg', '/pic7.jpg', '/pic8.jpg', '/pic9.jpg',
];

/** Resize an image data URL to fit within maxDim, returns JPEG data URL */
function resizeImage(dataUrl: string, maxDim = 1600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        // Already small enough — just re-encode as JPEG for consistency
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.85));
        return;
      }
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl); // fallback
    img.src = dataUrl;
  });
}

/**
 * CaptureSession - Core capture experience
 * Can be used as a full page, inside a modal, or for telling stories about existing photos
 */
export default function CaptureSession({ 
  eventId, 
  isModal = false, 
  onClose,
  onPhotosAdded,
  mode = 'capture',
  storyPhotoId,
  storyPhotoUrl,
  existingSummary,
  onStoryGenerated,
  onGreetingComplete,
}: CaptureSessionProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user: currentUser } = useCurrentUser();
  
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  
  // Extraction UI state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  
  const showToast = useCallback((message: string) => {
    setExtractionStatus(message);
    setTimeout(() => setExtractionStatus(''), 3000);
  }, []);
  
  // Photos and messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showSamplePicker, setShowSamplePicker] = useState(false);

  // Event data
  const [eventData, setEventData] = useState<{
    id: string;
    title: string;
    date_start: string | null;
    date_end: string | null;
    location: string | null;
    summary: string | null;
    photo_count: number;
  } | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);
  
  // Refs
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const capturedPhotosRef = useRef<CapturedPhoto[]>([]);
  const conversationSavedRef = useRef(false);
  const currentPhotoIdRef = useRef<string | null>(null);
  const storyPhotoFrameRef = useRef<string | null>(null);
  const storyPhotoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const greetingCompleteRef = useRef(false); // Track if EVA has finished her greeting
  const onGreetingCompleteRef = useRef(onGreetingComplete);
  onGreetingCompleteRef.current = onGreetingComplete;
  
  messagesRef.current = messages;
  capturedPhotosRef.current = capturedPhotos;
  currentPhotoIdRef.current = currentPhotoId;

  // Camera hook
  const {
    cameraActive,
    videoReady,
    videoRef,
    canvasRef,
    currentFrameRef,
    startCamera,
    stopCamera,
  } = useCamera({
    onFrameCapture: (frame) => {
      if (liveClientRef.current?.connected) {
        liveClientRef.current.sendVideoFrame(frame);
      }
    },
  });

  // Photo scanner hook
  const {
    scannedPhotos,
    isScanning,
    photoDetected,
    scanStatus,
    capturePhoto,
    startScanning,
    stopScanning,
    removePhoto: removeScannedPhoto,
    clearHashes,
  } = usePhotoScanner({
    videoRef,
    currentFrameRef,
    onToast: showToast,
  });

  // Generate story recap from messages for a specific photo
  const generateRecapForPhoto = useCallback(async (photoId: string): Promise<string | null> => {
    const photoMessages = messagesRef.current.filter(
      m => m.photoId === photoId && !m.isPhotoDivider && !m.isStorySaved && m.role !== 'system'
    );
    
    if (photoMessages.length < 2) return null; // Need at least some conversation
    
    // Mark photo as generating story
    setCapturedPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, isGeneratingStory: true } : p
    ));
    
    try {
      const conversationText = photoMessages
        .map(m => `${m.role === 'user' ? (currentUser.name || 'You') : 'EVA'}: ${m.content}`)
        .join('\n');
      
      const response = await fetch('/api/generate-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: conversationText }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const recap = data.recap || null;
        setCapturedPhotos(prev => prev.map(p => 
          p.id === photoId ? { ...p, story: recap, isGeneratingStory: false, hasConversation: true } : p
        ));
        return recap;
      } else {
        setCapturedPhotos(prev => prev.map(p => 
          p.id === photoId ? { ...p, isGeneratingStory: false } : p
        ));
        return null;
      }
    } catch (error) {
      console.error('Failed to generate recap:', error);
      setCapturedPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, isGeneratingStory: false } : p
      ));
      return null;
    }
  }, []);

  // Sync scanned photos
  const lastSyncedPhotoIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (scannedPhotos.length === 0) return;
    
    const latestPhoto = scannedPhotos[0];
    if (latestPhoto.id === lastSyncedPhotoIdRef.current) return;
    lastSyncedPhotoIdRef.current = latestPhoto.id;
    
    // Generate recap for the previous photo before moving to new one
    if (currentPhotoId && messages.length > 0) {
      generateRecapForPhoto(currentPhotoId);
    }
    
    // Add a photo divider message in chat (only if there was previous conversation)
    if (messages.length > 0 && currentPhotoId) {
      setMessages(prev => [...prev, {
        id: `divider-${latestPhoto.id}`,
        role: 'system',
        content: `New photo captured`,
        timestamp: Date.now(),
        isPhotoDivider: true,
        photoId: latestPhoto.id,
      }]);
    }
    
    setCapturedPhotos(prev => {
      const alreadyExists = prev.some(p => p.id === latestPhoto.id);
      if (alreadyExists) return prev;
      
      const updated = prev.map(p => 
        p.id === currentPhotoId && messages.length > 0 
          ? { ...p, hasConversation: true } 
          : p
      );
      
      const newPhoto: CapturedPhoto = {
        id: latestPhoto.id,
        imageData: latestPhoto.imageData,
        timestamp: latestPhoto.timestamp,
        extractionMethod: 'bbox-crop',
        extractionQuality: 'good',
      };
      
      return [...updated, newPhoto];
    });
    
    setCurrentPhotoId(latestPhoto.id);
    setShowGallery(true);
    
    // No automatic AI trigger - let user talk naturally while scanning in background
    // The AI sees the live video stream, not the captured/cropped photo
  }, [scannedPhotos, currentPhotoId, messages.length, generateRecapForPhoto]);

  // Fetch event data
  useEffect(() => {
    let cancelled = false;
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          if (res.status === 404) setEventData(null);
          else throw new Error(await res.text());
          return;
        }
        const data = await res.json();
        if (!cancelled) setEventData(data);
      } catch (e) {
        if (!cancelled) setEventError(e instanceof Error ? e.message : 'Failed to load event');
      } finally {
        if (!cancelled) setEventLoading(false);
      }
    }
    fetchEvent();
    return () => { cancelled = true; };
  }, [eventId]);

  const event = eventData ?? { id: eventId, title: `Event ${eventId}`, date_start: null, location: null };

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio level monitoring
  useEffect(() => {
    if (!isMicActive || !streamRef.current) {
      setUserAudioLevel(0);
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      return;
    }

    const setupAudioAnalysis = async () => {
      try {
        const stream = streamRef.current;
        if (!stream) return;

        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalized = Math.min(1, Math.max(0, (average - 30) / 100));
          setUserAudioLevel(normalized);
        };
        
        audioLevelIntervalRef.current = setInterval(updateAudioLevel, 50);
      } catch (e) {
        console.error('Audio analysis setup failed:', e);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
    };
  }, [isMicActive]);

  // Manual capture
  const handleCapturePhoto = useCallback(async () => {
    await capturePhoto('Manual capture');
  }, [capturePhoto]);

  // Upload photos from device (file picker)
  const handleUploadPhotos = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawData = reader.result as string;
        if (!rawData) return;
        // Resize to avoid API body-size limits
        const imageData = await resizeImage(rawData);
        const photoId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        
        // Generate recap for previous photo before adding new one
        if (currentPhotoIdRef.current && messagesRef.current.length > 0) {
          generateRecapForPhoto(currentPhotoIdRef.current);
        }

        const newPhoto: CapturedPhoto = {
          id: photoId,
          imageData,
          timestamp: Date.now(),
          extractionMethod: 'upload',
          extractionQuality: 'original',
        };
        setCapturedPhotos(prev => [...prev, newPhoto]);
        setCurrentPhotoId(photoId);
        setShowGallery(true);

        // Send to Live API so EVA can see and talk about it
        if (liveClientRef.current?.connected) {
          liveClientRef.current.sendTextWithImage(
            'The user just uploaded this photo. Look at it and comment on what you see — ask them about the memory.',
            imageData
          );
        }
      };
      reader.readAsDataURL(file);
    });
  }, [generateRecapForPhoto]);

  // Toggle sample photo picker
  const handleUseSamples = useCallback(() => {
    setShowSamplePicker(prev => !prev);
  }, []);

  // Select a single sample photo
  const handleSelectSample = useCallback(async (src: string) => {
    setShowSamplePicker(false);
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawData = reader.result as string;
        if (!rawData) return;
        // Resize to avoid API body-size limits
        const imageData = await resizeImage(rawData);
        const photoId = `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Generate recap for previous photo before adding new one
        if (currentPhotoIdRef.current && messagesRef.current.length > 0) {
          generateRecapForPhoto(currentPhotoIdRef.current);
        }

        const newPhoto: CapturedPhoto = {
          id: photoId,
          imageData,
          timestamp: Date.now(),
          extractionMethod: 'sample',
          extractionQuality: 'original',
        };
        setCapturedPhotos(prev => [...prev, newPhoto]);
        setCurrentPhotoId(photoId);
        setShowGallery(true);

        // Send to Live API so EVA can see the photo
        if (liveClientRef.current?.connected) {
          liveClientRef.current.sendTextWithImage(
            'The user loaded a sample family photo. Look at it and comment on what you see — ask them about the memory.',
            imageData
          );
        }
        showToast('Photo added!');
      };
      reader.readAsDataURL(blob);
    } catch {
      showToast('Failed to load sample photo');
    }
  }, [generateRecapForPhoto, showToast]);

  // Remove photo
  const removePhoto = useCallback(async (photoId: string, reason: 'delete' | 'retake') => {
    const photo = capturedPhotos.find(p => p.id === photoId);
    if (!photo) return;

    if (photo.serverId) {
      try {
        await fetch(`/api/photos/${photo.serverId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete photo from server:', err);
      }
    }

    setCapturedPhotos(prev => prev.filter(p => p.id !== photoId));
    removeScannedPhoto(photoId);
    clearHashes();

    if (selectedPhotoId === photoId) setSelectedPhotoId(null);
    if (currentPhotoId === photoId) {
      const remaining = capturedPhotos.filter(p => p.id !== photoId);
      setCurrentPhotoId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }

    if (reason === 'retake') {
      setTimeout(() => startScanning(), 150);
    }
  }, [capturedPhotos, selectedPhotoId, currentPhotoId, removeScannedPhoto, clearHashes, startScanning]);

  // Enhance photo
  const enhancePhoto = useCallback(async (photoId: string) => {
    const photo = capturedPhotos.find(p => p.id === photoId);
    if (!photo) return;
    
    setCapturedPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, isExtracting: true } : p
    ));
    
    try {
      const result = await enhanceWithNanoBanana(photo.imageData);
      if (result) {
        setCapturedPhotos(prev => prev.map(p => 
          p.id === photoId 
            ? { ...p, imageData: result.imageDataUrl, extractionMethod: 'nano-banana', isExtracting: false } 
            : p
        ));
        showToast(`🍌 Photo enhanced! (${result.model})`);
      } else {
        setCapturedPhotos(prev => prev.map(p => 
          p.id === photoId ? { ...p, isExtracting: false } : p
        ));
        showToast('Enhancement failed - try again');
      }
    } catch (error) {
      console.error('Enhance error:', error);
      setCapturedPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, isExtracting: false } : p
      ));
      showToast('Enhancement failed');
    }
  }, [capturedPhotos, showToast]);

  // Build system instruction
  const buildSystemInstruction = useCallback((albumContext?: {
    title?: string;
    date?: string;
    location?: string;
  }) => {
    let instruction = `You are EVA, a warm and caring AI companion helping preserve precious family memories. Your name means "life" — you help bring memories to life.

PRONUNCIATION: When you say your name out loud, pronounce it "Eva" (EE-vuh), like the name Eve. Never spell it out letter by letter.

Your personality:
- Warm, friendly, and genuinely curious — like talking to a thoughtful friend
- Supportive and encouraging — you celebrate every memory shared
- Observant about details in photos
- Ask thoughtful follow-up questions without being intrusive

CRITICAL BEHAVIORS:
1. Always ask follow-up questions — don't just acknowledge, dig deeper
2. Ask about emotions and significance — "What made that moment special?"
3. Ask about context — Who else was there? What happened before/after?
4. Keep responses BRIEF (2-3 sentences max) but always end with a question
5. If user doesn't remember, ask "Who might remember this moment?"

When you see a photo, acknowledge it and ask about specific details you observe.

CRITICAL - HONESTY ABOUT VISION:
- You only see what the user sends: images or video frames from their camera.
- If you have NOT received any image or video, you CANNOT see anything. Never pretend or make up what you see.
- If asked "can you see" or "what do you see" and you have no visual input, say honestly: "I can't see anything right now — please turn on your camera and show me your photos so I can help you capture those memories!"
- Never describe, invent, or hallucinate people, objects, or scenes you have not actually received as image/video input.

BLURRY OR UNCLEAR IMAGES:
- If an image is blurry, dark, out of focus, or you genuinely cannot make out details, say so honestly: "This image is a bit unclear - I can see [what you CAN see] but I'm having trouble making out the details. Could you try capturing it again, or describe what's in the photo?"
- NEVER make up or guess details you cannot actually see. If you're uncertain, ask the user to clarify.
- It's okay to say "I think I see..." or "It looks like it might be..." when genuinely uncertain, but don't state things as fact if you're not sure.`;

    if (albumContext) {
      instruction += `\n\nCONTEXT:\n`;
      if (albumContext.title) instruction += `- Album: ${albumContext.title}\n`;
      if (albumContext.date) instruction += `- Date: ${albumContext.date}\n`;
      if (albumContext.location) instruction += `- Location: ${albumContext.location}\n`;
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
      
      if (!apiKey) throw new Error('Failed to get API credentials');
      
      const albumContext = {
        title: event.title,
        date: event.date_start ?? undefined,
        location: event.location ?? undefined,
      };
      
      const client = new GeminiLiveClient(apiKey, {
        responseModalities: ['AUDIO'],
        systemInstruction: buildSystemInstruction(albumContext),
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore', // Female voice (EVA / Eve)
            },
          },
        },
      }, {
        onConnect: () => {
          setIsConnected(true);
          setIsConnecting(false);
          
          // Handle story mode vs capture mode
          if (mode === 'story' && storyPhotoUrl) {
            // Story mode: send the photo to EVA and ask about it
            // Also set up interval to keep sending the photo so EVA maintains context
            fetch(storyPhotoUrl)
              .then(res => res.blob())
              .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64Data = reader.result as string;
                  if (base64Data && client.connected) {
                    // Store the frame for periodic sending
                    storyPhotoFrameRef.current = base64Data;
                    
                    // Send initial frame
                    client.sendVideoFrame(base64Data);
                    client.sendText("The user wants to tell the story of this photo. Greet them warmly as Eva (pronounced EE-vuh, like Eve). Say you can see their photo and ask what makes this moment special to them.");
                    
                    // Set up interval to keep sending the photo (every 1 second, like camera does)
                    if (storyPhotoIntervalRef.current) {
                      clearInterval(storyPhotoIntervalRef.current);
                    }
                    storyPhotoIntervalRef.current = setInterval(() => {
                      if (storyPhotoFrameRef.current && liveClientRef.current?.connected) {
                        liveClientRef.current.sendVideoFrame(storyPhotoFrameRef.current);
                      }
                    }, 1000);
                  }
                };
                reader.readAsDataURL(blob);
              })
              .catch(err => console.error('Failed to send photo:', err));
          } else {
            // Capture mode: generic greeting
            client.sendText("The user has just connected. Greet them warmly. Say your name as Eva (pronounced EE-vuh, like Eve). Say you're ready to help capture their memories and tell them to turn on the camera and show you their photos.");
          }
        },
        onDisconnect: () => {
          setIsConnected(false);
          setIsMicActive(false);
        },
        onMessage: (message) => {
          // Hide the internal triggers we use to get EVA to speak first
          const evaGreetingTrigger = "The user has just connected. Greet them warmly";
          const storyTrigger = "The user wants to tell the story";
          if (message.type === 'user' && message.content && 
              !message.content.includes(evaGreetingTrigger) && 
              !message.content.includes(storyTrigger)) {
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}-user`,
              role: 'user',
              content: message.content,
              timestamp: message.timestamp,
              photoId: currentPhotoIdRef.current || undefined,
            }]);
          } else if (message.type === 'model' && message.content) {
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}-ai`,
              role: 'assistant',
              content: message.content,
              timestamp: message.timestamp,
              photoId: currentPhotoIdRef.current || undefined,
            }]);
          }
        },
        onAudio: () => {
          // Start speaking state when audio begins
          setIsAISpeaking(true);
        },
        onTurnComplete: () => {
          // Stop speaking state when EVA's turn is complete
          setIsAISpeaking(false);
          // Call greeting complete callback on first turn complete
          if (!greetingCompleteRef.current) {
            greetingCompleteRef.current = true;
            onGreetingCompleteRef.current?.();
          }
        },
        onError: (error) => {
          console.error('Live API error:', error);
          setIsConnecting(false);
        },
        onInterrupted: () => setIsAISpeaking(false),
      });
      
      liveClientRef.current = client;
      await client.connect();
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected, event, buildSystemInstruction]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (!conversationSavedRef.current && messages.length > 0 && capturedPhotos.length > 0) {
      conversationSavedRef.current = true;
      saveConversation(messages, capturedPhotos).catch(err => {
        console.error('Background save failed:', err);
      });
    }

    // Clear story photo interval if active
    if (storyPhotoIntervalRef.current) {
      clearInterval(storyPhotoIntervalRef.current);
      storyPhotoIntervalRef.current = null;
    }
    storyPhotoFrameRef.current = null;

    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsConnected(false);
    setIsMicActive(false);
    stopCamera();
  }, [stopCamera, messages, capturedPhotos]);

  // Finish session
  const finishSession = useCallback(async () => {
    setIsFinishing(true);
    
    try {
      // Story mode: extract facts and save to existing photo
      if (mode === 'story' && storyPhotoId && messages.length >= 2) {
        // Extract facts/story from conversation
        const response = await fetch(`/api/photos/${storyPhotoId}/extract-facts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            userName: currentUser.name || undefined,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.summary) {
            onStoryGenerated?.(data.summary);
          }
        }
        
        // Disconnect and close
        if (liveClientRef.current) {
          liveClientRef.current.disconnect();
          liveClientRef.current = null;
        }
        setIsConnected(false);
        setIsMicActive(false);
        onClose?.();
        return;
      }
      
      // Capture mode: upload photos and save stories
      // Generate recap for the current photo before finishing
      const recaps: Map<string, string> = new Map();
      if (currentPhotoId && messages.length > 0) {
        const recap = await generateRecapForPhoto(currentPhotoId);
        if (recap) recaps.set(currentPhotoId, recap);
        setCapturedPhotos(prev => prev.map(p => 
          p.id === currentPhotoId ? { ...p, hasConversation: true } : p
        ));
      }
      
      // Get latest photos with stories from state
      const latestPhotos = capturedPhotosRef.current;
      const photosToUpload = latestPhotos.filter(p => !p.serverId);
      const uploadedPhotos: Array<{ localId: string; serverId: string; story?: string }> = [];

      // Upload photos
      for (const photo of photosToUpload) {
        const serverPhoto = await uploadPhotoToEvent(eventId, photo.imageData);
        if (serverPhoto) {
          uploadedPhotos.push({ 
            localId: photo.id, 
            serverId: serverPhoto.id, 
            story: photo.story || recaps.get(photo.id) 
          });
          setCapturedPhotos(prev => prev.map(p =>
            p.id === photo.id ? { ...p, serverId: serverPhoto.id, originalUrl: serverPhoto.original_url } : p
          ));
        }
      }
      
      // Save recaps/stories to database for each uploaded photo
      for (const uploaded of uploadedPhotos) {
        if (uploaded.story) {
          try {
            await fetch(`/api/photos/${uploaded.serverId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ summary: uploaded.story }),
            });
          } catch (err) {
            console.error('Failed to save story for photo:', uploaded.serverId, err);
          }
        }
      }
      
      // Save conversation transcript
      if (!conversationSavedRef.current && messages.length > 0 && uploadedPhotos.length > 0) {
        conversationSavedRef.current = true;
        const saved = await saveConversation(messages, uploadedPhotos.map(p => ({ serverId: p.serverId })));
        if (saved) {
          // Add "Story Saved" indicator in chat
          setMessages(prev => [...prev, {
            id: `story-saved-${Date.now()}`,
            role: 'system',
            content: 'Story saved',
            timestamp: Date.now(),
            isStorySaved: true,
          }]);
        }
      }
      
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      setIsConnected(false);
      setIsMicActive(false);
      stopCamera();
      
      // Modal mode: call onClose, Page mode: navigate
      if (isModal) {
        onPhotosAdded?.();
        onClose?.();
      } else {
        router.push(`/album/${eventId}`);
      }
    } catch (error) {
      console.error('Error finishing session:', error);
      setIsFinishing(false);
    }
  }, [currentPhotoId, messages, capturedPhotos, stopCamera, eventId, router, isModal, onClose, onPhotosAdded, generateRecapForPhoto, mode, storyPhotoId, onStoryGenerated]);

  // Start/stop mic
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

  // Auto-start session when modal opens
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (isModal && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      connect();
    }
  }, [isModal, connect]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (!conversationSavedRef.current && messagesRef.current.length > 0 && capturedPhotosRef.current.length > 0) {
        conversationSavedRef.current = true;
        saveConversation(messagesRef.current, capturedPhotosRef.current).catch(console.error);
      }
      // Clear story photo interval
      if (storyPhotoIntervalRef.current) {
        clearInterval(storyPhotoIntervalRef.current);
      }
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

  // Handle close for modal
  const handleClose = useCallback(() => {
    disconnect();
    onClose?.();
  }, [disconnect, onClose]);

  // ========== RENDER ==========
  
  // Modal layout: split view with left (camera) and right (conversation)
  if (isModal) {
    return (
      <div className={`h-full flex flex-col ${isDark ? 'bg-[#0a0a0f]' : 'bg-[var(--bg-primary)]'}`}>
        {/* Header */}
        <div className={`h-14 ${isDark ? 'bg-[#0d1117]' : 'bg-[var(--bg-elevated)]'} border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 animate-pulse flex-shrink-0" />
            <div>
              <h2 className="text-white font-medium text-sm">
                {mode === 'story' ? 'Tell Story with EVA' : 'Add Memory with EVA'}
              </h2>
              <p className="text-white/50 text-xs">
                {mode === 'story' ? 'Share the memories behind this photo' : event.title}
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
              onClick={finishSession}
              disabled={isFinishing}
              className="px-4 py-1.5 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm font-medium transition-colors"
            >
              {isFinishing ? 'Saving...' : 'Finish'}
            </button>
            
            <button
              onClick={handleClose}
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
          {/* LEFT: Camera/Scanner (capture mode) or Static Image (story mode) */}
          <div className="flex-1 relative bg-black">
            {mode === 'story' ? (
              /* Story mode: Static image display */
              <>
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <img 
                    src={storyPhotoUrl} 
                    alt="Photo" 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                </div>
                
                {/* Existing story badge */}
                {existingSummary && (
                  <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Current Story</p>
                    <p className="text-white/80 text-sm line-clamp-2">{existingSummary}</p>
                  </div>
                )}
              </>
            ) : (
              /* Capture mode: Camera and scanner */
              <>
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
                
                {/* Gradient overlay */}
                {cameraActive && !isScanning && (
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(to bottom, rgba(10,10,15,0.3) 0%, transparent 30%, transparent 70%, rgba(10,10,15,0.8) 100%)'
                  }} />
                )}
                
                <ScanOverlay isScanning={isScanning} photoDetected={photoDetected} scanStatus={scanStatus} />
                
                {/* Extracting overlay */}
                {isExtracting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
                    <div className="bg-black/70 rounded-2xl px-8 py-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin" />
                      <p className="text-white text-lg">{extractionStatus || 'Processing...'}</p>
                    </div>
                  </div>
                )}
                
                {/* Status notification */}
                {extractionStatus && !isExtracting && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                    <div className={`backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium ${
                      extractionStatus.includes('✅') ? 'bg-green-500/90 text-white' : 'bg-white/20 text-white'
                    }`}>
                      {extractionStatus}
                    </div>
                  </div>
                )}
                
                {/* Sample photo picker overlay */}
                {showSamplePicker && (
                  <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-lg">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-white text-lg font-medium">Select a sample photo</h3>
                        <button
                          onClick={() => setShowSamplePicker(false)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {SAMPLE_PHOTOS.map((src) => (
                          <button
                            key={src}
                            onClick={() => handleSelectSample(src)}
                            className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-cyan-400 transition-all group"
                          >
                            <img src={src} alt="Sample" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 rounded-full px-3 py-1">
                                Select
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-white/40 text-xs text-center mt-4">
                        Click a photo to add it to your capture session
                      </p>
                    </div>
                  </div>
                )}

                {/* Pre-connection state */}
                {!isConnected && !isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center max-w-sm px-8">
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full" style={{
                          background: 'conic-gradient(from 0deg, rgba(6,182,212,0.5), rgba(59,130,246,0.5), rgba(139,92,246,0.5), rgba(6,182,212,0.5))',
                          filter: 'blur(15px)',
                          animation: 'spin 4s linear infinite'
                        }} />
                        <div className="absolute inset-2 rounded-full bg-[#0d1117] flex items-center justify-center">
                          <svg className="w-8 h-8 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                      </div>
                      
                      <h2 className="text-white text-xl font-light mb-2">
                        {eventLoading ? 'Loading…' : "Hi, I'm EVA"}
                      </h2>
                      <p className="text-white/50 text-sm mb-6">
                        I&apos;ll help you capture and preserve your memories
                      </p>
                      
                      <button
                        onClick={connect}
                        className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
                      >
                        Start Session
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Connecting state */}
                {isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full" style={{
                          background: 'conic-gradient(from 0deg, rgba(6,182,212,0.8), rgba(59,130,246,0.8), rgba(139,92,246,0.8), rgba(6,182,212,0.8))',
                          animation: 'spin 1s linear infinite'
                        }} />
                        <div className="absolute inset-1 rounded-full bg-[#0d1117]" />
                      </div>
                      <p className="text-white/70 text-sm">EVA is connecting...</p>
                    </div>
                  </div>
                )}
                
                {/* Photo gallery at bottom */}
                {showGallery && capturedPhotos.length > 0 && (
                  <PhotoGallery 
                    photos={capturedPhotos}
                    currentPhotoId={currentPhotoId}
                    selectedPhotoId={selectedPhotoId}
                    onSelectPhoto={setSelectedPhotoId}
                    onRemovePhoto={removePhoto}
                    onEnhancePhoto={enhancePhoto}
                    getExtractionLabel={getExtractionLabel}
                  />
                )}
                
                {/* Controls at bottom */}
                {isConnected && (
                  <div className="absolute bottom-0 left-0 right-0 z-20">
                    <ControlsBar
                      cameraActive={cameraActive}
                      videoReady={videoReady}
                      onCameraToggle={cameraActive ? stopCamera : startCamera}
                      isScanning={isScanning}
                      isExtracting={isExtracting}
                      onScanToggle={isScanning ? stopScanning : startScanning}
                      isConnected={isConnected}
                      isMicActive={isMicActive}
                      onMicToggle={isMicActive ? stopMic : startMic}
                      isFinishing={isFinishing}
                      photoCount={capturedPhotos.length}
                      onFinishSession={finishSession}
                      hideFinishButton={true}
                      onUploadPhotos={mode === 'capture' ? handleUploadPhotos : undefined}
                      onUseSamples={mode === 'capture' ? handleUseSamples : undefined}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* RIGHT: Conversation */}
          <div className={`w-[380px] flex flex-col border-l border-white/10 ${isDark ? 'bg-[#0d1117]' : 'bg-[var(--bg-secondary)]'}`}>
            {/* EVA orb + Aurora wave */}
            <div className="flex-shrink-0 relative">
              {/* Aurora wave behind */}
              <div className="h-32 relative overflow-hidden">
                <AuroraWave 
                  isActive={isMicActive} 
                  isAISpeaking={isAISpeaking} 
                  userAudioLevel={userAudioLevel} 
                />
              </div>
              {/* EVA orb centered */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <EVAOrb size={80} isSpeaking={isAISpeaking} />
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
              {messages.length === 0 && isConnected && (
                <div className="text-center py-4 text-white/40 text-sm">
                  EVA is listening...
                </div>
              )}
              
              {messages.map((msg) => {
                // Photo divider
                if (msg.isPhotoDivider) {
                  return (
                    <div key={msg.id} className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                        <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <span className="text-xs text-cyan-300 font-medium">New Photo</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                    </div>
                  );
                }
                
                // Story saved indicator
                if (msg.isStorySaved) {
                  return (
                    <div key={msg.id} className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span className="text-xs text-green-300 font-medium">Story Saved</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
                    </div>
                  );
                }
                
                // Regular message
                return (
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
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Controls - only show mic in story mode */}
            {mode === 'story' && isConnected && (
              <div className="p-4 border-t border-white/10 flex items-center justify-center gap-4">
                {/* Mic button */}
                <button
                  onClick={isMicActive ? stopMic : startMic}
                  className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isMicActive 
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
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
                
                <span className="text-white/50 text-sm">
                  {isMicActive ? 'Listening...' : 'Click to speak'}
                </span>
              </div>
            )}
          </div>
        </div>

        <style jsx global>{`
          @keyframes ping {
            75%, 100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Page layout: full screen (original capture page design)
  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: 'linear-gradient(to bottom, #0a0a0f, #0d1117)' }}>
      {/* Camera feed */}
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
        
        {cameraActive && !isScanning && (
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(10,10,15,0.3) 0%, transparent 30%, transparent 70%, rgba(10,10,15,0.8) 100%)'
          }} />
        )}
        
        <ScanOverlay isScanning={isScanning} photoDetected={photoDetected} scanStatus={scanStatus} />
        
        {isExtracting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <div className="bg-black/70 backdrop-blur-md rounded-2xl px-8 py-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin" />
              <p className="text-white text-lg font-medium">{extractionStatus || 'Processing...'}</p>
            </div>
          </div>
        )}
        
        {extractionStatus && !isExtracting && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
            <div className={`backdrop-blur-sm rounded-full px-6 py-2 font-medium shadow-lg ${
              extractionStatus.includes('✅') || extractionStatus.includes('captured')
                ? 'bg-green-500/90 text-white'
                : extractionStatus.includes('⚠️')
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
            onClick={() => { disconnect(); router.back(); }}
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
          
          <button
            onClick={() => setShowGallery(!showGallery)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              showGallery ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {capturedPhotos.length > 0 && <span className="text-sm">{capturedPhotos.length}</span>}
          </button>
        </div>
      </div>

      {/* Photo gallery sidebar */}
      {showGallery && (
        <PhotoGallery 
          photos={capturedPhotos}
          currentPhotoId={currentPhotoId}
          selectedPhotoId={selectedPhotoId}
          onSelectPhoto={setSelectedPhotoId}
          onRemovePhoto={removePhoto}
          onEnhancePhoto={enhancePhoto}
          getExtractionLabel={getExtractionLabel}
        />
      )}

      {/* Transcript overlay */}
      {isConnected && messages.length > 0 && !isScanning && (
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

      {/* Sample photo picker overlay (full-page mode) */}
      {showSamplePicker && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-lg font-medium">Select a sample photo</h3>
              <button
                onClick={() => setShowSamplePicker(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SAMPLE_PHOTOS.map((src) => (
                <button
                  key={src}
                  onClick={() => handleSelectSample(src)}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-cyan-400 transition-all group"
                >
                  <img src={src} alt="Sample" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 rounded-full px-3 py-1">
                      Select
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-white/40 text-xs text-center mt-4">
              Click a photo to add it to your capture session
            </p>
          </div>
        </div>
      )}

      {/* Pre-connection state */}
      {!isConnected && !isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center max-w-md px-8">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full" style={{
                background: 'conic-gradient(from 0deg, rgba(6,182,212,0.5), rgba(59,130,246,0.5), rgba(139,92,246,0.5), rgba(6,182,212,0.5))',
                filter: 'blur(20px)',
                animation: 'spin 4s linear infinite'
              }} />
              <div className="absolute inset-2 rounded-full bg-[#0d1117] flex items-center justify-center">
                <svg className="w-10 h-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-white text-2xl font-light mb-3">
              {eventLoading ? 'Loading…' : event.title}
            </h2>
            {eventError && (
              <p className="text-amber-400/90 text-sm mb-3">Could not load event details.</p>
            )}
            <p className="text-white/50 text-sm mb-8">
              Start a conversation to capture memories
            </p>
            
            <button
              onClick={connect}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
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
              <div className="absolute inset-0 rounded-full" style={{
                background: 'conic-gradient(from 0deg, rgba(6,182,212,0.8), rgba(59,130,246,0.8), rgba(139,92,246,0.8), rgba(6,182,212,0.8))',
                animation: 'spin 1s linear infinite'
              }} />
              <div className="absolute inset-2 rounded-full bg-[#0d1117]" />
            </div>
            <p className="text-white/70 text-sm">Connecting...</p>
          </div>
        </div>
      )}

      {/* Aurora wave */}
      <div className="absolute bottom-0 left-0 right-0 h-48 z-10 pointer-events-none">
        <AuroraWave isActive={isConnected && (isMicActive || isAISpeaking)} isAISpeaking={isAISpeaking} userAudioLevel={userAudioLevel} />
      </div>

      {/* Bottom controls */}
      <ControlsBar
        cameraActive={cameraActive}
        videoReady={videoReady}
        onCameraToggle={cameraActive ? stopCamera : startCamera}
        isScanning={isScanning}
        isExtracting={isExtracting}
        onScanToggle={isScanning ? stopScanning : startScanning}
        isConnected={isConnected}
        isMicActive={isMicActive}
        onMicToggle={isMicActive ? stopMic : startMic}
        isFinishing={isFinishing}
        photoCount={capturedPhotos.length}
        onFinishSession={finishSession}
        onUploadPhotos={mode === 'capture' ? handleUploadPhotos : undefined}
        onUseSamples={mode === 'capture' ? handleUseSamples : undefined}
      />

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
