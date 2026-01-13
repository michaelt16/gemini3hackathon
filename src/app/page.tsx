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

// Hardcoded test photo - the family photo provided by user
const TEST_PHOTO_PATH = '/testphoto.jpg';

type AppPhase = 'initial' | 'conversation' | 'synthesis' | 'preview' | 'generating';

interface DetectedFaceWithMatch extends DetectedFace {
  match: FaceMatch | null;
  tempName?: string; // For naming unknown faces
  isNaming?: boolean;
  isEditing?: boolean; // For editing existing names
}

export default function Home() {
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);

  // Load memory bank on mount
  useEffect(() => {
    const bank = loadMemoryBank();
    setMemoryBank(bank);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Detect faces when photo is loaded
  const detectFacesInPhoto = useCallback(async () => {
    if (!photoRef.current || facesProcessed) return;
    
    setIsLoadingFaces(true);
    try {
      await loadFaceModels();
      const faces = await detectFaces(photoRef.current);
      
      // Get known faces for matching
      const knownFaces = getAllKnownFaces(memoryBank);
      
      // Match each detected face
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
  }, [memoryBank, facesProcessed]);

  // Handle photo load
  const handlePhotoLoad = () => {
    // Small delay to ensure image is fully rendered
    setTimeout(() => {
      detectFacesInPhoto();
    }, 500);
  };

  // Crop face from image as base64 thumbnail
  const cropFaceThumbnail = (face: DetectedFaceWithMatch): string | undefined => {
    if (!photoRef.current) return undefined;
    
    const img = photoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    
    // Add some padding around the face
    const padding = 20;
    const x = Math.max(0, face.box.x - padding);
    const y = Math.max(0, face.box.y - padding);
    const width = Math.min(face.box.width + padding * 2, img.naturalWidth - x);
    const height = Math.min(face.box.height + padding * 2, img.naturalHeight - y);
    
    // Set canvas size (thumbnail size)
    const thumbSize = 80;
    canvas.width = thumbSize;
    canvas.height = thumbSize;
    
    // Draw cropped face
    ctx.drawImage(
      img,
      x, y, width, height, // Source rectangle
      0, 0, thumbSize, thumbSize // Destination rectangle
    );
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Name an unknown face
  const nameFace = (faceIndex: number, name: string, relationship?: string) => {
    if (!name.trim()) return;
    
    const face = detectedFaces[faceIndex];
    if (!face) return;
    
    // Crop face thumbnail
    const thumbnail = cropFaceThumbnail(face);
    
    // Add to memory bank
    const result = upsertCharacter(memoryBank, {
      name: name.trim(),
      relationship,
      faceDescriptor: descriptorToArray(face.descriptor),
      faceBox: face.box,
      photoId: 'current-photo', // In a full app, this would be a unique photo ID
      thumbnail,
    });
    
    setMemoryBank(result.bank);
    
    // Update detected faces with the new match
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
    
    // Add to dossier
    setDossier(prev => ({
      ...prev,
      names: [...new Set([...prev.names, name.trim()])],
    }));
  };

  // Confirm a face match
  const confirmFaceMatch = (faceIndex: number) => {
    const face = detectedFaces[faceIndex];
    if (!face?.match) return;
    
    // Add this face to the character's known faces
    const result = upsertCharacter(memoryBank, {
      id: face.match.characterId,
      name: face.match.characterName,
      faceDescriptor: descriptorToArray(face.descriptor),
      faceBox: face.box,
      photoId: 'current-photo',
    });
    
    setMemoryBank(result.bank);
    
    // Add to dossier
    setDossier(prev => ({
      ...prev,
      names: [...new Set([...prev.names, face.match!.characterName])],
    }));
  };

  // Analyze the photo and start conversation
  const startConversation = async () => {
    if (!photoBase64) return;
    
    setIsAnalyzing(true);
    
    try {
      // Get known characters summary for Gemini context
      const knownCharactersSummary = getMemoryBankSummary(memoryBank);
      
      // First, analyze the photo
      const analyzeResponse = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: photoBase64,
          knownCharacters: knownCharactersSummary, // Pass context about known people
        }),
      });
      
      const { analysis } = await analyzeResponse.json();
      setPhotoAnalysis(analysis);
      
      // Include face match info WITH POSITION in the conversation start
      // Sort faces by x position (left to right) and describe their location
      const sortedFaces = [...detectedFaces]
        .filter(f => f.match)
        .sort((a, b) => a.box.x - b.box.x);
      
      const faceMatchInfo = sortedFaces
        .map((f, idx) => {
          // Describe position based on index and relative position
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
          
          // Add vertical position hint if face is notably higher/lower
          const avgY = sortedFaces.reduce((sum, face) => sum + face.box.y, 0) / sortedFaces.length;
          if (f.box.y < avgY - 50) position += ' (higher up)';
          if (f.box.y > avgY + 50) position += ' (lower down)';
          
          return `${f.match!.characterName} is ${position}`;
        })
        .join('; ');
      
      // Now start the conversation
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
      
      // Add AI's opening message
      setMessages([{
        role: 'assistant',
        content: chatData.message,
        timestamp: Date.now(),
      }]);
      
      // Update dossier
      updateDossier(chatData.extractedInfo);
      setPhase('conversation');
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Send a message in the conversation
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
      
      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
      }]);
      
      // Update dossier
      updateDossier(data.extractedInfo);
      
      // Check if story is complete
      if (data.suggestComplete) {
        setStoryComplete(true);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the dossier with new information
  const updateDossier = (info: { names: string[]; places: string[]; dates: string[] }) => {
    setDossier(prev => ({
      names: [...new Set([...prev.names, ...info.names])],
      places: [...new Set([...prev.places, ...info.places])],
      dates: [...new Set([...prev.dates, ...info.dates])],
    }));
  };

  // Synthesize the story into a cohesive narrative
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

  // Generate video (mock for now)
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

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Count user messages
  const userMessageCount = messages.filter(m => m.role === 'user').length;

  // Color palette for face boxes (distinct, accessible colors)
  const faceColors = [
    '#e11d48', // rose-600
    '#2563eb', // blue-600
    '#16a34a', // green-600
    '#d97706', // amber-600
    '#7c3aed', // violet-600
    '#0891b2', // cyan-600
    '#c026d3', // fuchsia-600
    '#ea580c', // orange-600
  ];

  // Get color for a face by index
  const getFaceColor = (index: number) => faceColors[index % faceColors.length];

  // Calculate face box styles for overlay
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

  // Get position label for a face
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

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--accent)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
            Memory Keeper
          </h1>
          <p className="text-[var(--foreground)] opacity-70">
            Preserving family stories, one photo at a time
          </p>
          {memoryBank.characters.length > 0 && (
            <p className="text-xs text-[var(--accent)] mt-1">
              {memoryBank.characters.length} family member{memoryBank.characters.length !== 1 ? 's' : ''} remembered
            </p>
          )}
        </header>

        {/* Narrative Preview Modal */}
        {(phase === 'preview' || phase === 'generating') && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="paper-texture rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-[var(--accent)] mb-2" style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}>
                  Your Story
                </h2>
                <p className="text-sm text-[var(--foreground)] opacity-60 mb-4">
                  This is how your memory will be narrated in the video (~{estimatedDuration} seconds)
                </p>
                
                <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4 border border-[var(--accent-light)] border-opacity-30">
                  <textarea
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="w-full min-h-[200px] bg-transparent focus:outline-none resize-none text-lg leading-relaxed"
                    style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                  />
                </div>
                
                <p className="text-xs text-[var(--foreground)] opacity-50 mb-6">
                  Feel free to edit the narrative above before generating the video.
                </p>
                
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
                    {phase === 'generating' ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="loading-dot w-2 h-2 bg-white rounded-full inline-block"></span>
                        <span className="loading-dot w-2 h-2 bg-white rounded-full inline-block"></span>
                        <span className="loading-dot w-2 h-2 bg-white rounded-full inline-block"></span>
                        <span className="ml-2">Creating Video...</span>
                      </span>
                    ) : (
                      '✨ Create Living Memory Video'
                    )}
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
                  
                  {/* Face detection overlay */}
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
                      {/* Face label */}
                      <div 
                        className="absolute -top-6 left-0 text-xs px-2 py-0.5 rounded whitespace-nowrap font-medium"
                        style={{
                          backgroundColor: getFaceColor(index),
                          color: 'white',
                        }}
                      >
                        {face.match 
                          ? face.match.characterName
                          : 'Unknown'}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="aspect-[4/3] bg-[var(--background)] rounded flex items-center justify-center">
                  <p className="text-[var(--accent)] opacity-50">Loading photo...</p>
                </div>
              )}
              
              {/* Face loading indicator */}
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
                          <button
                            onClick={() => {
                              setDetectedFaces(prev => prev.map((f, i) => 
                                i === index ? { ...f, isNaming: false, isEditing: false, tempName: '' } : f
                              ));
                            }}
                            className="text-xs text-[var(--foreground)] opacity-50 hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      ) : face.match ? (
                        <div className="flex-1 flex items-center justify-between">
                          <span>
                            <strong>{face.match.characterName}</strong>
                            <span className="text-xs opacity-60 ml-1">{getPositionLabel(index, detectedFaces.length)}</span>
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setDetectedFaces(prev => prev.map((f, i) => ({
                                  ...f,
                                  isEditing: i === index,
                                  tempName: i === index ? f.match?.characterName || '' : f.tempName,
                                })));
                              }}
                              className="text-xs text-[var(--foreground)] opacity-50 hover:opacity-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => confirmFaceMatch(index)}
                              className="text-xs text-[var(--accent)] hover:underline"
                            >
                              Confirm
                            </button>
                          </div>
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
            
            {/* Start Conversation Button */}
            {phase === 'initial' && (
              <button
                onClick={startConversation}
                disabled={!photoBase64 || isAnalyzing}
                className="w-full py-3 px-6 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="loading-dot w-2 h-2 bg-white rounded-full inline-block"></span>
                    <span className="loading-dot w-2 h-2 bg-white rounded-full inline-block"></span>
                    <span className="loading-dot w-2 h-2 bg-white rounded-full inline-block"></span>
                    <span className="ml-2">Looking at your photo...</span>
                  </span>
                ) : (
                  'Begin Sharing Memories'
                )}
              </button>
            )}

            {/* Dossier (Memory Notes) */}
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

            {/* Ready to Preserve Button */}
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
            {/* Conversation Header */}
            <div className="bg-[var(--accent)] bg-opacity-10 px-4 py-3 border-b border-[var(--accent-light)] border-opacity-20">
              <h2 className="font-medium text-[var(--accent)]">
                {phase !== 'initial' ? 'Tell Me About This Photo' : 'Your Story Awaits'}
              </h2>
              {phase === 'conversation' && userMessageCount > 0 && (
                <p className="text-xs text-[var(--foreground)] opacity-50 mt-1">
                  {userMessageCount} memories shared • {storyComplete ? 'Story feels complete!' : 'Keep sharing or preview anytime'}
                </p>
              )}
            </div>

            {/* Messages */}
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

            {/* Input Area */}
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
                <p className="text-xs text-[var(--foreground)] opacity-40 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
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
                // Get the first thumbnail from faces
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
                          // Re-run face matching
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

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-[var(--foreground)] opacity-50">
          <p>Face recognition + AI conversation + Story synthesis • Video generation coming soon</p>
        </div>
      </div>
    </main>
  );
}
