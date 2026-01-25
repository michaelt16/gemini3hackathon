// PostgreSQL + pgvector integration for memory bank persistence
// This module handles all Postgres operations for characters and stories

import { Client, Pool } from 'pg';

let pool: Pool | null = null;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Initialize connection pool
export async function initializeDatabase(): Promise<void> {
  if (pool) return; // Already initialized

  const config: DatabaseConfig = {
    host: process.env.DB_HOST || '192.168.49.198',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'memory_keeper',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  try {
    pool = new Pool(config);
    console.log('Database pool initialized');

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection successful');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Get a client from the pool
async function getClient(): Promise<Client> {
  if (!pool) {
    await initializeDatabase();
  }
  return pool!.connect();
}

// Create tables and pgvector extension
export async function createTables(): Promise<void> {
  const client = await getClient();

  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Characters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relationship TEXT,
        description TEXT,
        places TEXT[] DEFAULT '{}',
        story_ids TEXT[] DEFAULT '{}',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);

    // Character faces table with vector embeddings
    await client.query(`
      CREATE TABLE IF NOT EXISTS character_faces (
        id SERIAL PRIMARY KEY,
        character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        descriptor vector(128) NOT NULL,
        photo_id TEXT NOT NULL,
        box JSONB NOT NULL,
        thumbnail TEXT,
        created_at BIGINT NOT NULL,
        UNIQUE(character_id, photo_id)
      );
    `);

    // Create index on descriptor for fast similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS character_faces_descriptor_idx 
      ON character_faces USING ivfflat (descriptor vector_cosine_ops);
    `);

    // Stories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        photo_id TEXT NOT NULL,
        narrative TEXT NOT NULL,
        character_ids TEXT[] NOT NULL,
        places TEXT[] NOT NULL,
        dates TEXT[] NOT NULL,
        photo_base64 TEXT,
        created_at BIGINT NOT NULL
      );
    `);

    // Narrative embeddings for semantic search
    await client.query(`
      CREATE TABLE IF NOT EXISTS story_embeddings (
        id SERIAL PRIMARY KEY,
        story_id TEXT NOT NULL UNIQUE REFERENCES stories(id) ON DELETE CASCADE,
        embedding vector(768) NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);

    // Create index on story embeddings
    await client.query(`
      CREATE INDEX IF NOT EXISTS story_embeddings_idx 
      ON story_embeddings USING ivfflat (embedding vector_cosine_ops);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Failed to create tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Character operations
export async function insertCharacter(
  id: string,
  name: string,
  relationship: string | undefined,
  description: string | undefined,
  places: string[],
  createdAt: number,
  updatedAt: number
): Promise<void> {
  const client = await getClient();

  try {
    await client.query(
      `INSERT INTO characters (id, name, relationship, description, places, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         relationship = EXCLUDED.relationship,
         description = EXCLUDED.description,
         places = EXCLUDED.places,
         updated_at = EXCLUDED.updated_at`,
      [id, name, relationship || null, description || null, places, createdAt, updatedAt]
    );
  } finally {
    client.release();
  }
}

// Insert character face with vector embedding
export async function insertCharacterFace(
  characterId: string,
  descriptor: number[],
  photoId: string,
  box: { x: number; y: number; width: number; height: number },
  thumbnail: string | undefined
): Promise<void> {
  const client = await getClient();

  try {
    const vectorStr = `[${descriptor.join(',')}]`;
    await client.query(
      `INSERT INTO character_faces (character_id, descriptor, photo_id, box, thumbnail, created_at)
       VALUES ($1, $2::vector, $3, $4, $5, $6)
       ON CONFLICT (character_id, photo_id) DO NOTHING`,
      [characterId, vectorStr, photoId, JSON.stringify(box), thumbnail || null, Date.now()]
    );
  } finally {
    client.release();
  }
}

// Find faces similar to a given descriptor
export async function findSimilarFaces(
  descriptor: number[],
  threshold: number = 0.45,
  limit: number = 5
): Promise<
  Array<{
    characterId: string;
    characterName: string;
    descriptor: number[];
    similarity: number;
  }>
> {
  const client = await getClient();

  try {
    const vectorStr = `[${descriptor.join(',')}]`;
    const result = await client.query(
      `SELECT 
        c.id as character_id, 
        c.name as character_name,
        cf.descriptor,
        1 - (cf.descriptor <=> $1::vector) as similarity
       FROM character_faces cf
       JOIN characters c ON cf.character_id = c.id
       WHERE 1 - (cf.descriptor <=> $1::vector) > $2
       ORDER BY cf.descriptor <=> $1::vector
       LIMIT $3`,
      [vectorStr, 1 - threshold, limit]
    );

    return result.rows.map((row: any) => ({
      characterId: row.character_id,
      characterName: row.character_name,
      descriptor: row.descriptor,
      similarity: row.similarity,
    }));
  } finally {
    client.release();
  }
}

// Story operations
export async function insertStory(
  id: string,
  photoId: string,
  narrative: string,
  characterIds: string[],
  places: string[],
  dates: string[],
  photoBase64: string | undefined,
  createdAt: number
): Promise<void> {
  const client = await getClient();

  try {
    await client.query(
      `INSERT INTO stories (id, photo_id, narrative, character_ids, places, dates, photo_base64, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [id, photoId, narrative, characterIds, places, dates, photoBase64 || null, createdAt]
    );
  } finally {
    client.release();
  }
}

// Insert story embedding for semantic search
export async function insertStoryEmbedding(storyId: string, embedding: number[]): Promise<void> {
  const client = await getClient();

  try {
    const vectorStr = `[${embedding.join(',')}]`;
    await client.query(
      `INSERT INTO story_embeddings (story_id, embedding, created_at)
       VALUES ($1, $2::vector, $3)
       ON CONFLICT (story_id) DO UPDATE SET
         embedding = EXCLUDED.embedding`,
      [storyId, vectorStr, Date.now()]
    );
  } finally {
    client.release();
  }
}

// Search stories semantically
export async function searchStories(
  embedding: number[],
  limit: number = 10
): Promise<
  Array<{
    storyId: string;
    narrative: string;
    photoId: string;
    similarity: number;
  }>
> {
  const client = await getClient();

  try {
    const vectorStr = `[${embedding.join(',')}]`;
    const result = await client.query(
      `SELECT 
        s.id as story_id,
        s.narrative,
        s.photo_id,
        1 - (se.embedding <=> $1::vector) as similarity
       FROM story_embeddings se
       JOIN stories s ON se.story_id = s.id
       ORDER BY se.embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit]
    );

    return result.rows.map((row: any) => ({
      storyId: row.story_id,
      narrative: row.narrative,
      photoId: row.photo_id,
      similarity: row.similarity,
    }));
  } finally {
    client.release();
  }
}

// Get all characters
export async function getAllCharacters(): Promise<
  Array<{
    id: string;
    name: string;
    relationship?: string;
    description?: string;
    places: string[];
  }>
> {
  const client = await getClient();

  try {
    const result = await client.query('SELECT * FROM characters ORDER BY updated_at DESC');
    return result.rows;
  } finally {
    client.release();
  }
}

// Get all stories
export async function getAllStories(): Promise<
  Array<{
    id: string;
    photoId: string;
    narrative: string;
    characterIds: string[];
    places: string[];
    dates: string[];
  }>
> {
  const client = await getClient();

  try {
    const result = await client.query('SELECT * FROM stories ORDER BY created_at DESC');
    return result.rows.map((row: any) => ({
      id: row.id,
      photoId: row.photo_id,
      narrative: row.narrative,
      characterIds: row.character_ids,
      places: row.places,
      dates: row.dates,
    }));
  } finally {
    client.release();
  }
}

// Close the pool
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
