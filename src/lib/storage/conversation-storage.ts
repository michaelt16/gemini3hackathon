/**
 * Storage utilities for conversation sessions and messages
 * Uses localStorage for client-side persistence
 */

import { ConversationSession, LiveConversationMessage, GeneratedStory } from '@/lib/types';

const STORAGE_KEY_SESSIONS = 'conversationSessions';
const STORAGE_KEY_MESSAGES = 'liveMessages';
const STORAGE_KEY_STORIES = 'generatedStories';

// Load all sessions
export function loadSessions(): ConversationSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load sessions:', error);
    return [];
  }
}

// Save a session
export function saveSession(session: ConversationSession): void {
  try {
    const sessions = loadSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

// Get a session by ID
export function getSession(sessionId: string): ConversationSession | null {
  const sessions = loadSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

// Update a session
export function updateSession(sessionId: string, updates: Partial<ConversationSession>): void {
  const session = getSession(sessionId);
  if (session) {
    const updated = {
      ...session,
      ...updates,
      updatedAt: Date.now(),
    };
    saveSession(updated);
  }
}

// Load all messages
export function loadMessages(): LiveConversationMessage[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_MESSAGES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load messages:', error);
    return [];
  }
}

// Get messages for a session
export function getSessionMessages(sessionId: string): LiveConversationMessage[] {
  const messages = loadMessages();
  return messages.filter(m => m.sessionId === sessionId).sort((a, b) => a.timestamp - b.timestamp);
}

// Save a message
export function saveMessage(message: LiveConversationMessage): void {
  try {
    const messages = loadMessages();
    const index = messages.findIndex(m => m.id === message.id);
    if (index >= 0) {
      messages[index] = message;
    } else {
      messages.push(message);
    }
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    
    // Update session's messageIds
    const session = getSession(message.sessionId);
    if (session && !session.messageIds.includes(message.id)) {
      updateSession(message.sessionId, {
        messageIds: [...session.messageIds, message.id],
      });
    }
  } catch (error) {
    console.error('Failed to save message:', error);
  }
}

// Load all stories
export function loadStories(): GeneratedStory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_STORIES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load stories:', error);
    return [];
  }
}

// Get story for a session
export function getSessionStory(sessionId: string): GeneratedStory | null {
  const stories = loadStories();
  return stories.find(s => s.sessionId === sessionId) || null;
}

// Save a story
export function saveStory(story: GeneratedStory): void {
  try {
    const stories = loadStories();
    const index = stories.findIndex(s => s.id === story.id);
    if (index >= 0) {
      stories[index] = story;
    } else {
      stories.push(story);
    }
    localStorage.setItem(STORAGE_KEY_STORIES, JSON.stringify(stories));
  } catch (error) {
    console.error('Failed to save story:', error);
  }
}

// Helper to get associated photo IDs for a message
export function getAssociatedPhotoIds(
  message: { content: string; timestamp: number },
  lastPhotoCaptureTime: number,
  recentPhotoIds: string[]
): string[] {
  const associatedIds: string[] = [];
  
  // 1. Temporal: Photo captured within 5 seconds
  const timeSinceLastPhoto = message.timestamp - lastPhotoCaptureTime;
  if (timeSinceLastPhoto >= 0 && timeSinceLastPhoto <= 5000 && recentPhotoIds.length > 0) {
    associatedIds.push(...recentPhotoIds);
  }
  
  // 2. Explicit: User mentions "this photo", "look at this", etc.
  const content = message.content.toLowerCase();
  const photoKeywords = [
    'this photo',
    'this picture',
    'look at this',
    'see this',
    'this image',
    'the photo',
    'the picture',
  ];
  
  if (photoKeywords.some(keyword => content.includes(keyword)) && recentPhotoIds.length > 0) {
    // Associate with most recent photo
    const mostRecent = recentPhotoIds[recentPhotoIds.length - 1];
    if (!associatedIds.includes(mostRecent)) {
      associatedIds.push(mostRecent);
    }
  }
  
  return associatedIds;
}

// Photo storage utilities
const STORAGE_KEY_PHOTOS = 'sessionPhotos';

export interface StoredPhoto {
  id: string;
  imageData: string;
  timestamp: number;
  description?: string;
  sessionId?: string;
}

// Save a photo
export function savePhoto(photo: StoredPhoto): void {
  try {
    const photos = loadPhotos();
    const index = photos.findIndex(p => p.id === photo.id);
    if (index >= 0) {
      photos[index] = photo;
    } else {
      photos.push(photo);
    }
    localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos));
  } catch (error) {
    console.error('Failed to save photo:', error);
  }
}

// Load all photos
export function loadPhotos(): StoredPhoto[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PHOTOS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load photos:', error);
    return [];
  }
}

// Get photos by IDs
export function getPhotosByIds(photoIds: string[]): StoredPhoto[] {
  const photos = loadPhotos();
  return photos.filter(p => photoIds.includes(p.id));
}
