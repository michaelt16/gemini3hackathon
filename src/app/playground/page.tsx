'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoAnalysis, ConversationMessage, ChatResponse, SynthesisResponse } from '@/lib/types';
import { 
  loadFaceModels, 
  detectFaces, 
  matchFace, 
  descriptorToArray,
  type DetectedFace,
  type FaceMatch 
} from '@/lib/face-service';
import {
  loadMemoryBank,
  saveMemoryBank,
  upsertCharacter,
  getAllKnownFaces,
  getMemoryBankSummary,
  type MemoryBank,
} from '@/lib/memory-bank';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';

// Hardcoded test photo - the family photo provided by user
const TEST_PHOTO_PATH = '/testphoto.jpg';

type AppMode = 'photo' | 'live';
type AppPhase = 'initial' | 'conversation' | 'synthesis' | 'preview' | 'generating';

interface DetectedFaceWithMatch extends DetectedFace {
  match: FaceMatch | null;
  tempName?: string;
  isNaming?: boolean;
  isEditing?: boolean;
}

interface LiveMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hasImage?: boolean;
}

export default function PlaygroundPage() {
  // Mode toggle
  const [mode, setMode] = useState<AppMode>('photo');
  
  // Photo mode state
  const [phase, setPhase] = useState<AppPhase>('initial');
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dossier, setDossier] = useState<{ names: string[]; places: string[]; dates: string[] }>({
    names: [],
    places: [],
    dates: [],
  });
  const [storyComplete, setStoryComplete] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  
  // Synthesis state
  const [narrative, setNarrative] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  
  // Face recognition state
  const [memoryBank, setMemoryBank] = useState<MemoryBank>({ characters: [], stories: [], version: 1 });
  const [detectedFaces, setDetectedFaces] = useState<DetectedFaceWithMatch[]>([]);
  const [isLoadingFaces, setIsLoadingFaces] = useState(false);
  const [facesProcessed, setFacesProcessed] = useState(false);
  const [showFacePanel, setShowFacePanel] = useState(false);
  
  // Live mode state
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [liveInput, setLiveInput] = useState('');
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  
  // Gemini Live API state
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const videoFrameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveMessagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load memory bank on mount
  useEffect(() => {
    const bank = loadMemoryBank();
    setMemoryBank(bank);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    liveMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages]);

  // Load the test photo as base64 on mount
  useEffect(() => {
    const loadPhoto = async () => {
      try {
        const response = await fetch(TEST_PHOTO_PATH);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Failed to load test photo:', error);
      }
    };
    loadPhoto();
  }, []);

  // ============ GEMINI LIVE API FUNCTIONS ============
  
  // Connect to Gemini Live API
  const connectToLiveAPI = async () => {
    if (isConnecting || isLiveConnected) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Get auth token from server
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      
      if (!apiKey) {
        throw new Error('Failed to get API credentials');
      }
      
      // Create Live client with callbacks
      const client = new GeminiLiveClient(
        apiKey,
        {
          // Using gemini-2.5-flash-native-audio-preview-12-2025 which requires AUDIO modality
          responseModalities: ['AUDIO'],  // AI will respond with voice!
          systemInstruction: `You are Gemini, a helpful and friendly AI assistant. You can see through the user's camera and hear them speak.

Your personality:
- Warm, curious, and genuinely interested in what the user shows you
- Respond naturally like a friend would, with appropriate emotion and enthusiasm
- Be observant - notice and comment on details you see
- Ask follow-up questions to learn more

When you see photos or images:
- Describe what you see with interest and curiosity
- Ask about the people, places, and moments captured
- Help the user recall and share the stories behind the photos
- Notice details like clothing, expressions, settings, and era

Keep responses natural and conversational - like talking to a friend, not reading from a script.`,
        },
        {
          onConnect: () => {
            console.log('Connected to Gemini Live!');
            setIsLiveConnected(true);
            setIsConnecting(false);
            setLiveMessages([{
              role: 'assistant',
              content: "🎙️ Connected! I can now see and hear you. Show me a photo and tell me about it - I'm listening!",
              timestamp: Date.now(),
            }]);
          },
          onDisconnect: () => {
            console.log('Disconnected from Gemini Live');
            setIsLiveConnected(false);
            setIsMicActive(false);
            stopVideoFrameCapture();
          },
          onMessage: (message) => {
            if (message.type === 'model') {
              setLiveMessages(prev => [...prev, {
                role: 'assistant',
                content: message.content,
                timestamp: message.timestamp,
              }]);
            } else if (message.type === 'user') {
              setLiveMessages(prev => [...prev, {
                role: 'user',
                content: message.content,
                timestamp: message.timestamp,
              }]);
            }
          },
          onAudio: () => {
            setIsAISpeaking(true);
            setTimeout(() => setIsAISpeaking(false), 500);
          },
          onError: (error) => {
            console.error('Live API error:', error);
            setConnectionError(error.message);
            setIsConnecting(false);
          },
          onInterrupted: () => {
            console.log('AI was interrupted');
            setIsAISpeaking(false);
          },
        }
      );
      
      liveClientRef.current = client;
      await client.connect();
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);
    }
  };
  
  // Disconnect from Live API
  const disconnectFromLiveAPI = () => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsLiveConnected(false);
    setIsMicActive(false);
    stopVideoFrameCapture();
    stopCamera();
  };
  
  // Start microphone for voice input
  const startMicrophone = async () => {
    if (!liveClientRef.current || !isLiveConnected) return;
    
    try {
      await liveClientRef.current.startMicrophone();
      setIsMicActive(true);
    } catch (error) {
      console.error('Failed to start microphone:', error);
      alert('Could not access microphone. Please ensure you have granted permissions.');
    }
  };
  
  // Stop microphone
  const stopMicrophone = () => {
    if (liveClientRef.current) {
      liveClientRef.current.stopMicrophone();
    }
    setIsMicActive(false);
  };
  
  // Camera functions for Live mode
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      
      streamRef.current = stream;
      setCameraActive(true);
      
      // Start sending video frames to Gemini
      startVideoFrameCapture();
    } catch (error) {
      console.error('Failed to access camera:', error);
      alert('Could not access camera. Please ensure you have granted camera permissions.');
    }
  };

  // Connect video element to stream when it becomes available
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  const stopCamera = () => {
    stopVideoFrameCapture();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCurrentFrame(null);
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    // Resize to smaller dimensions for faster transmission
    const maxWidth = 640;
    const scale = maxWidth / video.videoWidth;
    canvas.width = maxWidth;
    canvas.height = video.videoHeight * scale;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const frameData = canvas.toDataURL('image/jpeg', 0.6);
    setCurrentFrame(frameData);
    return frameData;
  }, []);
  
  // Send video frames periodically to Gemini
  const startVideoFrameCapture = () => {
    if (videoFrameIntervalRef.current) return;
    
    // Send frame immediately when starting
    if (liveClientRef.current?.connected) {
      const frame = captureFrame();
      if (frame) {
        console.log('Sending initial video frame');
        liveClientRef.current.sendVideoFrame(frame);
      }
    }
    
    videoFrameIntervalRef.current = setInterval(() => {
      if (liveClientRef.current?.connected && cameraActive) {
        const frame = captureFrame();
        if (frame) {
          liveClientRef.current.sendVideoFrame(frame);
        }
      }
    }, 500); // Send frame every 0.5 seconds for better responsiveness
  };
  
  const stopVideoFrameCapture = () => {
    if (videoFrameIntervalRef.current) {
      clearInterval(videoFrameIntervalRef.current);
      videoFrameIntervalRef.current = null;
    }
  };

  // Send text message to Live API
  const sendLiveMessage = async (userMessage?: string) => {
    if (!userMessage?.trim()) return;
    if (!liveClientRef.current || !isLiveConnected) {
      alert('Not connected to Live API. Please connect first.');
      return;
    }
    
    // Send the text message
    liveClientRef.current.sendText(userMessage.trim());
    setLiveInput('');
    
    // Also capture and send current frame with the message
    if (cameraActive) {
      const frame = captureFrame();
      if (frame) {
        liveClientRef.current.sendVideoFrame(frame);
      }
    }
  };

  // Handle live input submit
  const handleLiveSubmit = () => {
    if (!liveInput.trim()) return;
    sendLiveMessage(liveInput.trim());
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromLiveAPI();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect faces when photo is loaded (only in photo mode)
  const detectFacesInPhoto = useCallback(async () => {
    // Only run face detection in photo mode
    if (mode !== 'photo') return;
    if (!photoRef.current || facesProcessed) return;
    
    // Verify the image is actually loaded and has dimensions
    const img = photoRef.current;
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.log('Image not ready for face detection');
      return;
    }
    
    setIsLoadingFaces(true);
    try {
      await loadFaceModels();
      const faces = await detectFaces(photoRef.current);
      
      const knownFaces = getAllKnownFaces(memoryBank);
      
      const facesWithMatches: DetectedFaceWithMatch[] = faces.map(face => ({
        ...face,
        match: matchFace(face.descriptor, knownFaces),
      }));
      
      setDetectedFaces(facesWithMatches);
      setFacesProcessed(true);
      
      if (facesWithMatches.length > 0) {
        setShowFacePanel(true);
      }
    } catch (error) {
      console.error('Face detection failed:', error);
    } finally {
      setIsLoadingFaces(false);
    }
  }, [memoryBank, facesProcessed, mode]);

  const handlePhotoLoad = () => {
    // Only run face detection in photo mode
    if (mode !== 'photo') return;
    
    setTimeout(() => {
      detectFacesInPhoto();
    }, 500);
  };

  const cropFaceThumbnail = (face: DetectedFaceWithMatch): string | undefined => {
    if (!photoRef.current) return undefined;
    
    const img = photoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    
    const padding = 20;
    const x = Math.max(0, face.box.x - padding);
    const y = Math.max(0, face.box.y - padding);
    const width = Math.min(face.box.width + padding * 2, img.naturalWidth - x);
    const height = Math.min(face.box.height + padding * 2, img.naturalHeight - y);
    
    const thumbSize = 80;
    canvas.width = thumbSize;
    canvas.height = thumbSize;
    
    ctx.drawImage(img, x, y, width, height, 0, 0, thumbSize, thumbSize);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const nameFace = (faceIndex: number, name: string, relationship?: string) => {
    if (!name.trim()) return;
    
    const face = detectedFaces[faceIndex];
    if (!face) return;
    
    const thumbnail = cropFaceThumbnail(face);
    
    const result = upsertCharacter(memoryBank, {
      name: name.trim(),
      relationship,
      faceDescriptor: descriptorToArray(face.descriptor),
      faceBox: face.box,
      photoId: 'current-photo',
      thumbnail,
    });
    
    setMemoryBank(result.bank);
    
    setDetectedFaces(prev => prev.map((f, i) => {
      if (i === faceIndex) {
        return {
          ...f,
          match: {
            characterId: result.character.id,
            characterName: result.character.name,
            distance: 0,
            confidence: 100,
          },
          isNaming: false,
        };
      }
      return f;
    }));
    
    setDossier(prev => ({
      ...prev,
      names: [...new Set([...prev.names, name.trim()])],
    }));
  };

  const confirmFaceMatch = (faceIndex: number) => {
    const face = detectedFaces[faceIndex];
    if (!face?.match) return;
    
    const result = upsertCharacter(memoryBank, {
      id: face.match.characterId,
      name: face.match.characterName,
      faceDescriptor: descriptorToArray(face.descriptor),
      faceBox: face.box,
      photoId: 'current-photo',
    });
    
    setMemoryBank(result.bank);
    
    setDossier(prev => ({
      ...prev,
      names: [...new Set([...prev.names, face.match!.characterName])],
    }));
  };

  const startConversation = async () => {
    if (!photoBase64) return;
    
    setIsAnalyzing(true);
    
    try {
      const knownCharactersSummary = getMemoryBankSummary(memoryBank);
      
      const analyzeResponse = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: photoBase64,
          knownCharacters: knownCharactersSummary,
        }),
      });
      
      const { analysis } = await analyzeResponse.json();
      setPhotoAnalysis(analysis);
      
      const sortedFaces = [...detectedFaces]
        .filter(f => f.match)
        .sort((a, b) => a.box.x - b.box.x);
      
      const faceMatchInfo = sortedFaces
        .map((f, idx) => {
          let position = '';
          if (sortedFaces.length === 1) {
            position = 'in the photo';
          } else if (sortedFaces.length === 2) {
            position = idx === 0 ? 'on the LEFT side' : 'on the RIGHT side';
          } else if (sortedFaces.length === 3) {
            if (idx === 0) position = 'on the LEFT';
            else if (idx === 1) position = 'in the MIDDLE';
            else position = 'on the RIGHT';
          } else {
            position = `face #${idx + 1} from left`;
          }
          
          const avgY = sortedFaces.reduce((sum, face) => sum + face.box.y, 0) / sortedFaces.length;
          if (f.box.y < avgY - 50) position += ' (higher up)';
          if (f.box.y > avgY + 50) position += ' (lower down)';
          
          return `${f.match!.characterName} is ${position}`;
        })
        .join('; ');
      
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoAnalysis: {
            ...analysis,
            recognizedPeople: faceMatchInfo || 'No recognized faces',
            knownFamilyMembers: knownCharactersSummary,
          },
          messages: [],
          userMessage: '',
          dossier,
        }),
      });
      
      const chatData: ChatResponse = await chatResponse.json();
      
      setMessages([{
        role: 'assistant',
        content: chatData.message,
        timestamp: Date.now(),
      }]);
      
      updateDossier(chatData.extractedInfo);
      setPhase('conversation');
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !photoAnalysis || isLoading) return;
    
    const userMessage: ConversationMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoAnalysis,
          messages: updatedMessages,
          userMessage: userMessage.content,
          dossier,
        }),
      });
      
      const data: ChatResponse = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
      }]);
      
      updateDossier(data.extractedInfo);
      
      if (data.suggestComplete) {
        setStoryComplete(true);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDossier = (info: { names: string[]; places: string[]; dates: string[] }) => {
    setDossier(prev => ({
      names: [...new Set([...prev.names, ...info.names])],
      places: [...new Set([...prev.places, ...info.places])],
      dates: [...new Set([...prev.dates, ...info.dates])],
    }));
  };

  const synthesizeStory = async () => {
    if (!photoAnalysis || messages.length < 2) return;
    
    setIsSynthesizing(true);
    setPhase('synthesis');
    
    try {
      const response = await fetch('/api/synthesize-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoAnalysis,
          messages,
          dossier,
        }),
      });
      
      const data: SynthesisResponse = await response.json();
      setNarrative(data.narrative);
      setEstimatedDuration(data.estimatedDuration);
      setPhase('preview');
      
    } catch (error) {
      console.error('Failed to synthesize story:', error);
      setPhase('conversation');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const generateVideo = async () => {
    setPhase('generating');
    
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: photoBase64,
          audioTranscript: narrative,
          keywords: [...dossier.names, ...dossier.places],
          duration: estimatedDuration,
        }),
      });
      
      const data = await response.json();
      
      if (data.status === 'mocked') {
        alert(`Video generation is currently mocked.\n\nIn the full version, VEO 3 would create a ${estimatedDuration}-second animated video with your narration:\n\n"${narrative.substring(0, 200)}..."`);
      }
      
      setPhase('preview');
    } catch (error) {
      console.error('Failed to generate video:', error);
      setPhase('preview');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLiveKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleLiveSubmit();
    }
  };

  const userMessageCount = messages.filter(m => m.role === 'user').length;

  const faceColors = [
    '#e11d48', '#2563eb', '#16a34a', '#d97706',
    '#7c3aed', '#0891b2', '#c026d3', '#ea580c',
  ];

  const getFaceColor = (index: number) => faceColors[index % faceColors.length];

  const getFaceBoxStyle = (face: DetectedFaceWithMatch, index: number) => {
    if (!photoRef.current) return {};
    const img = photoRef.current;
    const scaleX = img.clientWidth / img.naturalWidth;
    const scaleY = img.clientHeight / img.naturalHeight;
    
    return {
      left: `${face.box.x * scaleX}px`,
      top: `${face.box.y * scaleY}px`,
      width: `${face.box.width * scaleX}px`,
      height: `${face.box.height * scaleY}px`,
      borderColor: getFaceColor(index),
    };
  };

  const getPositionLabel = (index: number, total: number) => {
    if (total === 1) return '';
    if (total === 2) return index === 0 ? '(LEFT)' : '(RIGHT)';
    if (total === 3) {
      if (index === 0) return '(LEFT)';
      if (index === 1) return '(MIDDLE)';
      return '(RIGHT)';
    }
    return `(#${index + 1})`;
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-block bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full mb-4">
            🧪 Playground / API Testing
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--accent)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
            Memory Keeper
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Preserving family stories, one photo at a time
          </p>
          
          {/* Mode Toggle */}
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => { setMode('photo'); stopCamera(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'photo' 
                  ? 'bg-[var(--accent)] text-white' 
                  : 'bg-[var(--accent)] bg-opacity-10 text-[var(--accent)] hover:bg-opacity-20'
              }`}
            >
              📷 Photo Mode
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'live' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                  : 'bg-green-500 bg-opacity-10 text-green-600 hover:bg-opacity-20'
              }`}
            >
              🎥 Live Mode
            </button>
          </div>
        </header>

        {/* LIVE MODE - Real Gemini Live API */}
        {mode === 'live' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Camera & Controls Section */}
            <div className="space-y-4">
              {/* Connection Status Banner */}
              {connectionError && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
                  <strong>Connection Error:</strong> {connectionError}
                </div>
              )}
              
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
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Status indicators */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      {isLiveConnected && (
                        <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          CONNECTED
                        </div>
                      )}
                      {isMicActive && (
                        <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          🎤 MIC ON
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
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white bg-opacity-10 flex items-center justify-center">
                        <span className="text-4xl">🎙️</span>
                      </div>
                      <h3 className="text-white text-lg mb-2">Gemini Live</h3>
                      <p className="text-white text-opacity-60 text-sm mb-4">
                        Real-time voice & video conversation with AI
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Connection Controls */}
              <div className="flex gap-3">
                {!isLiveConnected ? (
                  <button
                    onClick={connectToLiveAPI}
                    disabled={isConnecting}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </span>
                    ) : (
                      '🔌 Connect to Gemini Live'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={disconnectFromLiveAPI}
                    className="flex-1 py-3 px-6 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                  >
                    Disconnect
                  </button>
                )}
              </div>
              
              {/* Camera & Mic Controls */}
              {isLiveConnected && (
                <div className="flex gap-3">
                  {!cameraActive ? (
                    <button
                      onClick={startCamera}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                    >
                      📹 Start Camera
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="flex-1 py-3 px-6 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                    >
                      📹 Stop Camera
                    </button>
                  )}
                  
                  {!isMicActive ? (
                    <button
                      onClick={startMicrophone}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                    >
                      🎤 Start Mic
                    </button>
                  ) : (
                    <button
                      onClick={stopMicrophone}
                      className="flex-1 py-3 px-6 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                    >
                      🎤 Stop Mic
                    </button>
                  )}
                </div>
              )}
              
              {/* Tips */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <h4 className="font-medium text-purple-800 mb-2">🎙️ Gemini Live API</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• <strong>Connect</strong> to start a real-time session</li>
                  <li>• <strong>Start Camera</strong> to show photos (sent every 1s)</li>
                  <li>• <strong>Start Mic</strong> to talk - AI will respond with voice!</li>
                  <li>• Point your camera at old photos and describe them</li>
                  <li>• AI can see what you show and hear what you say</li>
                </ul>
              </div>
            </div>

            {/* Live Chat Section */}
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

              {/* Live Messages */}
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
                        className={`p-4 rounded-lg ${
                          msg.role === 'assistant' ? 'bubble-ai mr-8' : 'bubble-user ml-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm opacity-50">
                            {msg.role === 'assistant' ? '🤖 Gemini' : '👤 You'}
                          </p>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content || '...'}</p>
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
                    <div ref={liveMessagesEndRef} />
                  </>
                )}
              </div>

              {/* Live Input Area - Text fallback */}
              <div className="p-4 border-t border-[var(--accent-light)] border-opacity-20 bg-white bg-opacity-50">
                <p className="text-xs text-gray-500 mb-2">
                  {isMicActive ? '🎤 Listening... speak naturally!' : 'Type a message or enable mic for voice'}
                </p>
                <div className="flex gap-2">
                  <textarea
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
                    onKeyDown={handleLiveKeyDown}
                    placeholder={isLiveConnected ? "Type a message..." : "Connect first..."}
                    disabled={!isLiveConnected}
                    rows={2}
                    className="flex-1 p-3 rounded-lg border border-[var(--accent-light)] border-opacity-30 bg-white focus:outline-none focus:border-purple-500 resize-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleLiveSubmit}
                    disabled={!isLiveConnected || !liveInput.trim()}
                    className="px-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PHOTO MODE (Original UI) */}
        {mode === 'photo' && (
          <>
            {/* Narrative Preview Modal */}
            {(phase === 'preview' || phase === 'generating') && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="paper-texture rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <h2 className="text-2xl font-semibold text-[var(--accent)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                      Your Story
                    </h2>
                    <p className="text-sm text-[var(--foreground)] opacity-60 mb-4">
                      This is how your memory will be narrated (~{estimatedDuration} seconds)
                    </p>
                    
                    <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4 border border-[var(--accent-light)] border-opacity-30">
                      <textarea
                        value={narrative}
                        onChange={(e) => setNarrative(e.target.value)}
                        className="w-full min-h-[200px] bg-transparent focus:outline-none resize-none text-lg leading-relaxed"
                        style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setPhase('conversation')}
                        className="flex-1 py-3 px-4 border border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:bg-opacity-10 transition-colors"
                      >
                        ← Continue Conversation
                      </button>
                      <button
                        onClick={generateVideo}
                        disabled={phase === 'generating'}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
                      >
                        {phase === 'generating' ? 'Creating Video...' : '✨ Create Living Memory Video'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Synthesis Loading */}
            {phase === 'synthesis' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="paper-texture rounded-xl p-8 text-center">
                  <div className="flex justify-center gap-2 mb-4">
                    <span className="loading-dot w-3 h-3 bg-[var(--accent)] rounded-full inline-block"></span>
                    <span className="loading-dot w-3 h-3 bg-[var(--accent)] rounded-full inline-block"></span>
                    <span className="loading-dot w-3 h-3 bg-[var(--accent)] rounded-full inline-block"></span>
                  </div>
                  <p className="text-[var(--accent)] font-medium">Weaving your memories into a story...</p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Photo Section */}
              <div className="space-y-4">
                <div className="photo-frame rounded-lg relative">
                  {photoBase64 ? (
                    <>
                      <img
                        ref={photoRef}
                        src={photoBase64}
                        alt="Family photo"
                        className="w-full rounded shadow-inner"
                        onLoad={handlePhotoLoad}
                        crossOrigin="anonymous"
                      />
                      
                      {showFacePanel && detectedFaces.map((face, index) => (
                        <div
                          key={index}
                          className="absolute border-3 rounded transition-all cursor-pointer"
                          style={{
                            ...getFaceBoxStyle(face, index),
                            borderWidth: '3px',
                          }}
                          onClick={() => {
                            if (!face.match) {
                              setDetectedFaces(prev => prev.map((f, i) => ({
                                ...f,
                                isNaming: i === index ? !f.isNaming : false,
                              })));
                            }
                          }}
                        >
                          <div 
                            className="absolute -top-6 left-0 text-xs px-2 py-0.5 rounded whitespace-nowrap font-medium"
                            style={{
                              backgroundColor: getFaceColor(index),
                              color: 'white',
                            }}
                          >
                            {face.match ? face.match.characterName : 'Unknown'}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="aspect-[4/3] bg-[var(--background)] rounded flex items-center justify-center">
                      <p className="text-[var(--accent)] opacity-50">Loading photo...</p>
                    </div>
                  )}
                  
                  {isLoadingFaces && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded">
                      <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2">
                        <span className="loading-dot w-2 h-2 bg-[var(--accent)] rounded-full inline-block"></span>
                        <span className="loading-dot w-2 h-2 bg-[var(--accent)] rounded-full inline-block"></span>
                        <span className="loading-dot w-2 h-2 bg-[var(--accent)] rounded-full inline-block"></span>
                        <span className="text-sm text-[var(--accent)]">Detecting faces...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Face Recognition Panel */}
                {showFacePanel && detectedFaces.length > 0 && (
                  <div className="paper-texture p-4 rounded-lg border border-[var(--accent-light)] border-opacity-30">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide">
                        👤 Faces Detected ({detectedFaces.length})
                      </h3>
                      <button 
                        onClick={() => setShowFacePanel(false)}
                        className="text-xs text-[var(--foreground)] opacity-50 hover:opacity-100"
                      >
                        Hide
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {detectedFaces.map((face, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span 
                            className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: getFaceColor(index) }}
                          >
                            {index + 1}
                          </span>
                          
                          {face.isNaming || face.isEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Name..."
                                className="flex-1 px-2 py-1 text-xs border border-[var(--accent-light)] rounded"
                                value={face.tempName || ''}
                                onChange={(e) => {
                                  setDetectedFaces(prev => prev.map((f, i) => 
                                    i === index ? { ...f, tempName: e.target.value } : f
                                  ));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && face.tempName) {
                                    nameFace(index, face.tempName);
                                  }
                                  if (e.key === 'Escape') {
                                    setDetectedFaces(prev => prev.map((f, i) => 
                                      i === index ? { ...f, isNaming: false, isEditing: false, tempName: '' } : f
                                    ));
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => face.tempName && nameFace(index, face.tempName)}
                                className="text-xs bg-[var(--accent)] text-white px-2 py-1 rounded"
                              >
                                Save
                              </button>
                            </div>
                          ) : face.match ? (
                            <div className="flex-1 flex items-center justify-between">
                              <span>
                                <strong>{face.match.characterName}</strong>
                                <span className="text-xs opacity-60 ml-1">{getPositionLabel(index, detectedFaces.length)}</span>
                              </span>
                              <button
                                onClick={() => confirmFaceMatch(index)}
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                Confirm
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-between">
                              <span className="opacity-60">Unknown {getPositionLabel(index, detectedFaces.length)}</span>
                              <button
                                onClick={() => {
                                  setDetectedFaces(prev => prev.map((f, i) => ({
                                    ...f,
                                    isNaming: i === index,
                                  })));
                                }}
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                Name this person
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {phase === 'initial' && (
                  <button
                    onClick={startConversation}
                    disabled={!photoBase64 || isAnalyzing}
                    className="w-full py-3 px-6 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isAnalyzing ? 'Looking at your photo...' : 'Begin Sharing Memories'}
                  </button>
                )}

                {(dossier.names.length > 0 || dossier.places.length > 0) && (
                  <div className="paper-texture p-4 rounded-lg border border-[var(--accent-light)] border-opacity-30">
                    <h3 className="text-sm font-semibold text-[var(--accent)] mb-2 uppercase tracking-wide">
                      Memory Notes
                    </h3>
                    {dossier.names.length > 0 && (
                      <p className="text-sm mb-1">
                        <span className="opacity-60">People:</span> {dossier.names.join(', ')}
                      </p>
                    )}
                    {dossier.places.length > 0 && (
                      <p className="text-sm mb-1">
                        <span className="opacity-60">Places:</span> {dossier.places.join(', ')}
                      </p>
                    )}
                    {dossier.dates.length > 0 && (
                      <p className="text-sm">
                        <span className="opacity-60">Times:</span> {dossier.dates.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {phase === 'conversation' && userMessageCount >= 2 && (
                  <button
                    onClick={synthesizeStory}
                    disabled={isSynthesizing}
                    className="w-full py-3 px-6 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    {storyComplete ? "✨ I'm Ready to Preserve This Memory" : "📖 Preview My Story So Far"}
                  </button>
                )}
              </div>

              {/* Conversation Section */}
              <div className="paper-texture rounded-xl shadow-lg overflow-hidden flex flex-col" style={{ height: '600px' }}>
                <div className="bg-[var(--accent)] bg-opacity-10 px-4 py-3 border-b border-[var(--accent-light)] border-opacity-20">
                  <h2 className="font-medium text-[var(--accent)]">
                    {phase !== 'initial' ? 'Tell Me About This Photo' : 'Your Story Awaits'}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-8">
                      <div>
                        <div className="text-4xl mb-4 opacity-30">📖</div>
                        <p className="text-[var(--foreground)] opacity-50">
                          {photoBase64 
                            ? facesProcessed 
                              ? `${detectedFaces.length} face${detectedFaces.length !== 1 ? 's' : ''} detected. Click "Begin Sharing Memories" to start.`
                              : 'Analyzing photo...'
                            : 'Please save your photo to public/testphoto.jpg'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg ${
                            message.role === 'assistant' ? 'bubble-ai mr-8' : 'bubble-user ml-8'
                          }`}
                        >
                          <p className="text-sm opacity-50 mb-1">
                            {message.role === 'assistant' ? 'Memory Keeper' : 'You'}
                          </p>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="bubble-ai p-4 rounded-lg mr-8">
                          <p className="text-sm opacity-50 mb-1">Memory Keeper</p>
                          <span className="flex gap-1">
                            <span className="loading-dot w-2 h-2 bg-[var(--accent)] rounded-full inline-block"></span>
                            <span className="loading-dot w-2 h-2 bg-[var(--accent)] rounded-full inline-block"></span>
                            <span className="loading-dot w-2 h-2 bg-[var(--accent)] rounded-full inline-block"></span>
                          </span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {phase === 'conversation' && (
                  <div className="p-4 border-t border-[var(--accent-light)] border-opacity-20 bg-white bg-opacity-50">
                    <div className="flex gap-2">
                      <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Share your memory..."
                        rows={2}
                        className="flex-1 p-3 rounded-lg border border-[var(--accent-light)] border-opacity-30 bg-white focus:outline-none focus:border-[var(--accent)] resize-none"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!inputText.trim() || isLoading}
                        className="px-4 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Family Album Panel */}
            {memoryBank.characters.length > 0 && (
              <div className="mt-6 paper-texture p-4 rounded-lg border border-[var(--accent-light)] border-opacity-30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide">
                    👨‍👩‍👧‍👦 Family Album ({memoryBank.characters.length} people)
                  </h3>
                  <button
                    onClick={() => {
                      if (confirm('Clear all saved face profiles? This cannot be undone.')) {
                        localStorage.removeItem('memory-keeper-bank');
                        setMemoryBank({ characters: [], stories: [], version: 1 });
                        setDetectedFaces(prev => prev.map(f => ({ ...f, match: null })));
                      }
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {memoryBank.characters.map((char) => {
                    const thumbnail = char.faces.find(f => f.thumbnail)?.thumbnail;
                    return (
                      <div key={char.id} className="bg-white bg-opacity-50 rounded p-2 text-center">
                        {thumbnail ? (
                          <img 
                            src={thumbnail} 
                            alt={char.name}
                            className="w-12 h-12 mx-auto mb-1 rounded-full object-cover border-2 border-[var(--accent-light)]"
                          />
                        ) : (
                          <div className="w-12 h-12 mx-auto mb-1 bg-[var(--accent)] bg-opacity-20 rounded-full flex items-center justify-center text-lg">
                            👤
                          </div>
                        )}
                        <p className="text-sm font-medium truncate">{char.name}</p>
                        <p className="text-xs opacity-50">{char.faces.length} face{char.faces.length !== 1 ? 's' : ''}</p>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${char.name} from Family Album?`)) {
                              const newBank = {
                                ...memoryBank,
                                characters: memoryBank.characters.filter(c => c.id !== char.id)
                              };
                              setMemoryBank(newBank);
                              saveMemoryBank(newBank);
                              setFacesProcessed(false);
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-600 mt-1"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[var(--foreground)] opacity-50">
          <p>Face recognition + AI conversation + Story synthesis • Video generation coming soon</p>
          <a href="/" className="text-[var(--accent)] hover:underline mt-2 inline-block">← Back to Home</a>
        </div>
      </div>
    </main>
  );
}
