// Core types for the Memory Preservation App

export interface PhotoAnalysis {
  // People detected in the photo
  people: {
    description: string;
    estimatedAge?: string;
    clothing?: string;
    expression?: string;
  }[];
  
  // Setting and environment
  setting: {
    location: string;
    indoor: boolean;
    details: string[];
  };
  
  // Time period estimation
  era: {
    estimatedDecade: string;
    clues: string[];
  };
  
  // Overall mood/vibe
  mood: 'happy' | 'formal' | 'melancholic' | 'chaotic' | 'tender' | 'celebratory' | 'casual';
  
  // Key visual elements to reference
  visualAnchors: string[];
  
  // Opening observation for the conversation
  openingObservation: string;
  
  // First question to ask
  firstQuestion: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ConversationState {
  // The photo being discussed
  photoId: string;
  photoAnalysis: PhotoAnalysis | null;
  
  // Conversation history
  messages: ConversationMessage[];
  
  // Memory dossier - names, places, dates mentioned
  dossier: {
    names: Map<string, string>; // name -> context/relationship
    places: string[];
    dates: string[];
    events: string[];
  };
  
  // Story status
  storyComplete: boolean;
  storyTranscript: string;
}

export interface VideoGenerationRequest {
  photoUrl: string;
  audioTranscript: string;
  keywords: string[];
  duration: number; // in seconds
  narratorVoiceStyle?: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  // For mock: status indicator
  status: 'completed' | 'processing' | 'failed' | 'mocked';
}

export interface ChatRequest {
  photoAnalysis: PhotoAnalysis;
  messages: ConversationMessage[];
  userMessage: string;
}

export interface ChatResponse {
  message: string;
  // Names/places/dates extracted from user's response
  extractedInfo: {
    names: string[];
    places: string[];
    dates: string[];
  };
  // Whether the AI thinks the story is complete
  suggestComplete: boolean;
}

export interface SynthesisResponse {
  narrative: string;
  wordCount: number;
  estimatedDuration: number; // in seconds
}

// Conversation session - groups related conversations
export interface ConversationSession {
  id: string;
  title?: string; // Auto-generated or user-provided
  createdAt: number;
  updatedAt: number;
  photoIds: string[]; // Photos captured during this session
  messageIds: string[]; // Messages in this session
}

// Enhanced conversation message with photo associations
export interface LiveConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  associatedPhotoIds: string[]; // Photos visible/relevant during this message
  context?: {
    cameraActive?: boolean;
    photosVisible?: string[]; // Photos in view when message was sent
  };
}

// Story generated from conversation
export interface GeneratedStory {
  id: string;
  sessionId: string;
  title: string;
  narrative: string;
  associatedPhotoIds: string[];
  wordCount: number;
  estimatedDuration: number;
  createdAt: number;
}

// Voice profile for TTS
export interface VoiceProfile {
  id: string;
  name: string;
  createdAt: number;
}

// Animated story (photo + animation + narration)
export interface AnimatedStory {
  id: string;
  photoId: string;
  storyId?: string;
  animatedVideoUrl: string;
  audioUrl: string;
  audioBase64?: string;
  duration: number;
  voiceId: string;
  hasMinors: boolean;
  createdAt: number;
  status: 'completed' | 'processing' | 'failed';
}