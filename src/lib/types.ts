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
