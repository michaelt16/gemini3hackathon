# PostgreSQL Vector Database Setup for Face Recognition

This guide explains how to set up PostgreSQL with pgvector extension to store and search face embeddings for the Memory Keeper app.

## 🎯 Overview

Currently, the app uses **localStorage** for face recognition storage. Moving to PostgreSQL with pgvector will provide:
- ✅ Persistent storage across devices
- ✅ Fast similarity search for face matching
- ✅ Scalability for many users
- ✅ Better data organization
- ✅ Multi-user support

## 📊 Current Face Recognition System

### Current Data Structure (localStorage)
```typescript
{
  characters: [{
    id: string,
    name: string,
    faces: [{
      descriptor: number[], // 128-dim face embedding
      photoId: string,
      box: { x, y, width, height },
      thumbnail: string // base64
    }]
  }]
}
```

### Face Embedding Details
- **Dimensions**: 128 (from face-api.js)
- **Type**: Float32Array → number[]
- **Matching**: Euclidean distance
- **Threshold**: < 0.45 = match

---

## 🗄️ PostgreSQL + pgvector Setup

### Step 1: Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### Step 2: Install pgvector Extension

**macOS:**
```bash
brew install pgvector
```

**Linux:**
```bash
# Clone pgvector repository
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

**Windows:**
Follow instructions at [pgvector GitHub](https://github.com/pgvector/pgvector)

### Step 3: Create Database

```sql
-- Connect to PostgreSQL
psql postgres

-- Create database
CREATE DATABASE memory_keeper;

-- Connect to new database
\c memory_keeper

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 4: Create Schema

```sql
-- Users table (for multi-user support)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Characters table (people in photos)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100), -- "father", "uncle", etc.
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Face embeddings table (with vector storage)
CREATE TABLE face_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_id VARCHAR(255) NOT NULL,
  embedding vector(128) NOT NULL, -- 128-dim face embedding
  box_x INTEGER,
  box_y INTEGER,
  box_width INTEGER,
  box_height INTEGER,
  thumbnail_url TEXT, -- Store S3 URL or base64
  confidence FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast similarity search
CREATE INDEX ON face_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  title VARCHAR(500),
  narrative TEXT NOT NULL,
  word_count INTEGER,
  estimated_duration INTEGER, -- seconds
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Story-Photo associations
CREATE TABLE story_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  photo_id VARCHAR(255) NOT NULL,
  photo_url TEXT,
  photo_analysis JSONB, -- Store full photo analysis
  created_at TIMESTAMP DEFAULT NOW()
);

-- Story-Character associations
CREATE TABLE story_characters (
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, character_id)
);

-- Conversation sessions
CREATE TABLE conversation_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation messages
CREATE TABLE conversation_messages (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Message-Photo associations
CREATE TABLE message_photos (
  message_id VARCHAR(255) REFERENCES conversation_messages(id) ON DELETE CASCADE,
  photo_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (message_id, photo_id)
);
```

---

## 🔍 Vector Similarity Search

### Finding Matching Faces

```sql
-- Function to find matching faces for a given embedding
CREATE OR REPLACE FUNCTION find_matching_faces(
  query_embedding vector(128),
  user_id_param UUID,
  threshold FLOAT DEFAULT 0.45
)
RETURNS TABLE (
  character_id UUID,
  character_name VARCHAR(255),
  distance FLOAT,
  face_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    1 - (fe.embedding <=> query_embedding) as distance, -- Cosine distance
    fe.id
  FROM face_embeddings fe
  JOIN characters c ON fe.character_id = c.id
  WHERE fe.user_id = user_id_param
    AND 1 - (fe.embedding <=> query_embedding) < threshold
  ORDER BY fe.embedding <=> query_embedding
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### Usage Example

```sql
-- Find match for a new face embedding
SELECT * FROM find_matching_faces(
  '[0.123, 0.456, ...]'::vector(128), -- Your 128-dim embedding
  'user-uuid-here'::UUID,
  0.45 -- Threshold
);
```

---

## 💻 Node.js Integration

### Install Dependencies

```bash
npm install pg @types/pg
# or
npm install postgres
```

### Database Connection

Create `src/lib/db.ts`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'memory_keeper',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;
```

### Face Matching Service

Create `src/lib/face-db.ts`:

```typescript
import pool from './db';

export interface FaceMatch {
  characterId: string;
  characterName: string;
  distance: number;
  faceId: string;
}

/**
 * Find matching face in database using vector similarity
 */
export async function findMatchingFace(
  embedding: number[], // 128-dim array
  userId: string,
  threshold: number = 0.45
): Promise<FaceMatch | null> {
  // Convert array to PostgreSQL vector format
  const vectorString = `[${embedding.join(',')}]`;
  
  const query = `
    SELECT 
      c.id as character_id,
      c.name as character_name,
      1 - (fe.embedding <=> $1::vector(128)) as distance,
      fe.id as face_id
    FROM face_embeddings fe
    JOIN characters c ON fe.character_id = c.id
    WHERE fe.user_id = $2::UUID
      AND 1 - (fe.embedding <=> $1::vector(128)) < $3
    ORDER BY fe.embedding <=> $1::vector(128)
    LIMIT 1;
  `;
  
  const result = await pool.query(query, [
    vectorString,
    userId,
    threshold
  ]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    characterId: row.character_id,
    characterName: row.character_name,
    distance: parseFloat(row.distance),
    faceId: row.face_id,
  };
}

/**
 * Save face embedding to database
 */
export async function saveFaceEmbedding(
  userId: string,
  characterId: string,
  embedding: number[],
  photoId: string,
  box: { x: number; y: number; width: number; height: number },
  thumbnailUrl?: string
): Promise<string> {
  const vectorString = `[${embedding.join(',')}]`;
  
  const query = `
    INSERT INTO face_embeddings (
      character_id, user_id, photo_id, embedding, 
      box_x, box_y, box_width, box_height, thumbnail_url
    )
    VALUES ($1::UUID, $2::UUID, $3, $4::vector(128), $5, $6, $7, $8, $9)
    RETURNING id;
  `;
  
  const result = await pool.query(query, [
    characterId,
    userId,
    photoId,
    vectorString,
    box.x,
    box.y,
    box.width,
    box.height,
    thumbnailUrl,
  ]);
  
  return result.rows[0].id;
}

/**
 * Create or get character
 */
export async function upsertCharacter(
  userId: string,
  name: string,
  relationship?: string,
  description?: string
): Promise<string> {
  // Try to find existing character
  const findQuery = `
    SELECT id FROM characters 
    WHERE user_id = $1::UUID AND LOWER(name) = LOWER($2)
    LIMIT 1;
  `;
  
  const findResult = await pool.query(findQuery, [userId, name]);
  
  if (findResult.rows.length > 0) {
    // Update existing
    const updateQuery = `
      UPDATE characters 
      SET relationship = COALESCE($3, relationship),
          description = COALESCE($4, description),
          updated_at = NOW()
      WHERE id = $1::UUID
      RETURNING id;
    `;
    const updateResult = await pool.query(updateQuery, [
      findResult.rows[0].id,
      relationship,
      description,
    ]);
    return updateResult.rows[0].id;
  } else {
    // Create new
    const insertQuery = `
      INSERT INTO characters (user_id, name, relationship, description)
      VALUES ($1::UUID, $2, $3, $4)
      RETURNING id;
    `;
    const insertResult = await pool.query(insertQuery, [
      userId,
      name,
      relationship,
      description,
    ]);
    return insertResult.rows[0].id;
  }
}

/**
 * Get all known faces for a user (for client-side matching fallback)
 */
export async function getAllKnownFaces(userId: string): Promise<{
  characterId: string;
  characterName: string;
  embedding: number[];
}[]> {
  const query = `
    SELECT 
      c.id as character_id,
      c.name as character_name,
      fe.embedding
    FROM face_embeddings fe
    JOIN characters c ON fe.character_id = c.id
    WHERE fe.user_id = $1::UUID
    ORDER BY fe.created_at DESC;
  `;
  
  const result = await pool.query(query, [userId]);
  
  return result.rows.map(row => ({
    characterId: row.character_id,
    characterName: row.character_name,
    embedding: row.embedding, // pgvector returns as array
  }));
}
```

---

## 🔄 Migration from localStorage

### Migration Script

Create `scripts/migrate-to-postgres.ts`:

```typescript
import pool from '../src/lib/db';
import { loadMemoryBank } from '../src/lib/memory-bank';

async function migrate() {
  // Load from localStorage (run in browser context)
  const memoryBank = loadMemoryBank();
  
  // Create user (or get existing)
  const userResult = await pool.query(
    'INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = $2 RETURNING id',
    ['user@example.com', 'Default User']
  );
  const userId = userResult.rows[0].id;
  
  // Migrate characters and faces
  for (const character of memoryBank.characters) {
    const characterId = await upsertCharacter(
      userId,
      character.name,
      character.relationship,
      character.description
    );
    
    for (const face of character.faces) {
      await saveFaceEmbedding(
        userId,
        characterId,
        face.descriptor,
        face.photoId,
        face.box,
        face.thumbnail
      );
    }
  }
  
  console.log('Migration complete!');
}
```

---

## 🚀 API Routes for Face Recognition

### New API Route: `/api/face/match`

```typescript
// src/app/api/face/match/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { findMatchingFace } from '@/lib/face-db';

export async function POST(request: NextRequest) {
  try {
    const { embedding, userId, threshold } = await request.json();
    
    if (!embedding || !userId) {
      return NextResponse.json(
        { error: 'Missing embedding or userId' },
        { status: 400 }
      );
    }
    
    const match = await findMatchingFace(
      embedding,
      userId,
      threshold || 0.45
    );
    
    return NextResponse.json({ match });
  } catch (error) {
    console.error('Face matching error:', error);
    return NextResponse.json(
      { error: 'Failed to match face' },
      { status: 500 }
    );
  }
}
```

### New API Route: `/api/face/save`

```typescript
// src/app/api/face/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { upsertCharacter, saveFaceEmbedding } from '@/lib/face-db';

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      name, 
      relationship, 
      embedding, 
      photoId, 
      box, 
      thumbnailUrl 
    } = await request.json();
    
    // Create or get character
    const characterId = await upsertCharacter(
      userId,
      name,
      relationship
    );
    
    // Save face embedding
    const faceId = await saveFaceEmbedding(
      userId,
      characterId,
      embedding,
      photoId,
      box,
      thumbnailUrl
    );
    
    return NextResponse.json({ 
      characterId, 
      faceId 
    });
  } catch (error) {
    console.error('Save face error:', error);
    return NextResponse.json(
      { error: 'Failed to save face' },
      { status: 500 }
    );
  }
}
```

---

## 🔐 Environment Variables

Add to `.env.local`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=memory_keeper
DB_USER=postgres
DB_PASSWORD=your_password

# In production, use connection pooling
DATABASE_URL=postgresql://user:password@host:5432/memory_keeper
```

---

## 📊 Performance Considerations

### Indexing Strategy

```sql
-- IVFFlat index for fast approximate search
CREATE INDEX face_embeddings_embedding_idx 
ON face_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- For exact search (slower but more accurate)
-- CREATE INDEX face_embeddings_embedding_idx 
-- ON face_embeddings 
-- USING ivfflat (embedding vector_l2_ops);
```

### Query Optimization

- Use `LIMIT 1` for matching (we only need the best match)
- Filter by `user_id` first (reduces search space)
- Consider caching frequently accessed embeddings
- Use connection pooling (pg.Pool)

---

## 🧪 Testing

### Test Face Matching

```sql
-- Insert test embedding
INSERT INTO face_embeddings (character_id, user_id, photo_id, embedding)
VALUES (
  'character-uuid',
  'user-uuid',
  'photo-1',
  '[0.1, 0.2, 0.3, ...]'::vector(128)
);

-- Test similarity search
SELECT * FROM find_matching_faces(
  '[0.1, 0.2, 0.3, ...]'::vector(128),
  'user-uuid'::UUID,
  0.45
);
```

---

## 🔄 Hybrid Approach (Recommended)

For best performance, use a **hybrid approach**:

1. **Client-side**: Fast initial matching using cached embeddings
2. **Server-side**: Database for persistence and cross-device sync
3. **Fallback**: If client cache misses, query database

This gives you:
- ✅ Fast initial load (client-side cache)
- ✅ Persistent storage (database)
- ✅ Multi-device sync
- ✅ Scalability

---

## 📚 Resources

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)
- [Vector Similarity Search Guide](https://www.postgresql.org/docs/current/static/pgtrgm.html)

---

This setup will give your uncle a robust, scalable vector database for face recognition that can handle many users and millions of face embeddings efficiently!
