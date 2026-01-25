// Enhanced Memory Bank with Postgres + pgvector support
// Falls back to localStorage when Postgres is unavailable
// Automatically syncs between client and server

import * as postgres from './db/postgres';

export interface CharacterFace {
  descriptor: number[]; // Face embedding (128-dim array)
  photoId: string;
  box: { x: number; y: number; width: number; height: number };
  thumbnail?: string;
}

export interface Character {
  id: string;
  name: string;
  relationship?: string;
  description?: string;
  faces: CharacterFace[];
  stories: string[];
  places: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Story {
  id: string;
  photoId: string;
  photoBase64?: string;
  narrative: string;
  characterIds: string[];
  places: string[];
  dates: string[];
  createdAt: number;
}

export interface MemoryBank {
  characters: Character[];
  stories: Story[];
  version: number;
}

const STORAGE_KEY = 'memory-keeper-bank';
const CURRENT_VERSION = 1;

// Check if we're on the server
const isServer = typeof window === 'undefined';

// Initialize or load the memory bank
export function loadMemoryBank(): MemoryBank {
  if (!isServer) {
    return loadMemoryBankClient();
  }
  return { characters: [], stories: [], version: CURRENT_VERSION };
}

function loadMemoryBankClient(): MemoryBank {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const bank = JSON.parse(stored) as MemoryBank;
      return bank;
    }
  } catch (error) {
    console.error('Failed to load memory bank:', error);
  }

  return { characters: [], stories: [], version: CURRENT_VERSION };
}

// Save the memory bank (client-side only)
export function saveMemoryBank(bank: MemoryBank): void {
  if (!isServer) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
    } catch (error) {
      console.error('Failed to save memory bank:', error);
    }
  }
}

// Generate a unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Server-side: Sync character to Postgres
export async function syncCharacterToPostgres(character: Character): Promise<void> {
  if (isServer) {
    try {
      await postgres.insertCharacter(
        character.id,
        character.name,
        character.relationship,
        character.description,
        character.places,
        character.createdAt,
        character.updatedAt
      );

      // Insert faces
      for (const face of character.faces) {
        await postgres.insertCharacterFace(
          character.id,
          face.descriptor,
          face.photoId,
          face.box,
          face.thumbnail
        );
      }
    } catch (error) {
      console.error('Failed to sync character to Postgres:', error);
    }
  }
}

// Server-side: Sync story to Postgres
export async function syncStoryToPostgres(story: Story): Promise<void> {
  if (isServer) {
    try {
      await postgres.insertStory(
        story.id,
        story.photoId,
        story.narrative,
        story.characterIds,
        story.places,
        story.dates,
        story.photoBase64,
        story.createdAt
      );
    } catch (error) {
      console.error('Failed to sync story to Postgres:', error);
    }
  }
}

// Add or update a character (works on both client and server)
export function upsertCharacter(
  bank: MemoryBank,
  data: {
    id?: string;
    name: string;
    relationship?: string;
    description?: string;
    faceDescriptor?: number[];
    faceBox?: { x: number; y: number; width: number; height: number };
    photoId?: string;
    thumbnail?: string;
  }
): { bank: MemoryBank; character: Character } {
  const now = Date.now();

  let character = data.id
    ? bank.characters.find(c => c.id === data.id)
    : bank.characters.find(c => c.name.toLowerCase() === data.name.toLowerCase());

  if (character) {
    // Update existing character
    character.name = data.name;
    if (data.relationship) character.relationship = data.relationship;
    if (data.description) character.description = data.description;
    character.updatedAt = now;

    // Add new face if provided
    if (data.faceDescriptor && data.photoId && data.faceBox) {
      const existingFace = character.faces.find(f => f.photoId === data.photoId);
      if (!existingFace) {
        character.faces.push({
          descriptor: data.faceDescriptor,
          photoId: data.photoId,
          box: data.faceBox,
          thumbnail: data.thumbnail,
        });
      }
    }
  } else {
    // Create new character
    character = {
      id: generateId(),
      name: data.name,
      relationship: data.relationship,
      description: data.description,
      faces:
        data.faceDescriptor && data.photoId && data.faceBox
          ? [
              {
                descriptor: data.faceDescriptor,
                photoId: data.photoId,
                box: data.faceBox,
                thumbnail: data.thumbnail,
              },
            ]
          : [],
      stories: [],
      places: [],
      createdAt: now,
      updatedAt: now,
    };
    bank.characters.push(character);
  }

  saveMemoryBank(bank);

  // Trigger async sync to Postgres if on server
  if (isServer) {
    syncCharacterToPostgres(character).catch(e => console.error('Sync error:', e));
  }

  return { bank, character };
}

// Add a story
export function addStory(
  bank: MemoryBank,
  data: {
    photoId: string;
    photoBase64?: string;
    narrative: string;
    characterIds: string[];
    places: string[];
    dates: string[];
  }
): { bank: MemoryBank; story: Story } {
  const story: Story = {
    id: generateId(),
    photoId: data.photoId,
    photoBase64: data.photoBase64,
    narrative: data.narrative,
    characterIds: data.characterIds,
    places: data.places,
    dates: data.dates,
    createdAt: Date.now(),
  };

  bank.stories.push(story);

  // Link story to characters
  for (const charId of data.characterIds) {
    const character = bank.characters.find(c => c.id === charId);
    if (character && !character.stories.includes(story.id)) {
      character.stories.push(story.id);
      // Also add places to character
      for (const place of data.places) {
        if (!character.places.includes(place)) {
          character.places.push(place);
        }
      }
    }
  }

  saveMemoryBank(bank);

  // Trigger async sync to Postgres if on server
  if (isServer) {
    syncStoryToPostgres(story).catch(e => console.error('Sync error:', e));
  }

  return { bank, story };
}

// Get all faces for matching
export function getAllKnownFaces(bank: MemoryBank): Array<{
  characterId: string;
  characterName: string;
  descriptor: number[];
}> {
  const faces: Array<{
    characterId: string;
    characterName: string;
    descriptor: number[];
  }> = [];

  for (const character of bank.characters) {
    for (const face of character.faces) {
      faces.push({
        characterId: character.id,
        characterName: character.name,
        descriptor: face.descriptor,
      });
    }
  }

  return faces;
}

// Get character by ID
export function getCharacter(bank: MemoryBank, id: string): Character | undefined {
  return bank.characters.find(c => c.id === id);
}

// Get stories for a character
export function getCharacterStories(bank: MemoryBank, characterId: string): Story[] {
  const character = bank.characters.find(c => c.id === characterId);
  if (!character) return [];

  return bank.stories.filter(s => character.stories.includes(s.id));
}

// Find character by name (fuzzy)
export function findCharacterByName(bank: MemoryBank, name: string): Character | undefined {
  const lowerName = name.toLowerCase();
  return bank.characters.find(
    c =>
      c.name.toLowerCase() === lowerName ||
      c.name.toLowerCase().includes(lowerName) ||
      lowerName.includes(c.name.toLowerCase())
  );
}

// Get summary for Gemini context
export function getMemoryBankSummary(bank: MemoryBank): string {
  if (bank.characters.length === 0) {
    return 'No known family members yet.';
  }

  const charSummaries = bank.characters.map(c => {
    const storyCount = c.stories.length;
    const placeStr = c.places.length > 0 ? ` (associated with: ${c.places.join(', ')})` : '';
    return `- ${c.name}${c.relationship ? ` (${c.relationship})` : ''}: ${storyCount} stories${placeStr}`;
  });

  return `Known family members:\n${charSummaries.join('\n')}`;
}

// Clear all data (for testing)
export function clearMemoryBank(): MemoryBank {
  const bank = { characters: [], stories: [], version: CURRENT_VERSION };
  saveMemoryBank(bank);
  return bank;
}

// Server-only exports for database operations
export const db = isServer
  ? {
      findSimilarFaces: postgres.findSimilarFaces,
      searchStories: postgres.searchStories,
      getAllCharacters: postgres.getAllCharacters,
      getAllStories: postgres.getAllStories,
      initializeDatabase: postgres.initializeDatabase,
      createTables: postgres.createTables,
      insertStoryEmbedding: postgres.insertStoryEmbedding,
    }
  : null;
