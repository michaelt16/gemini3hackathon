# PostgreSQL + pgvector Integration Guide

## Overview

The Living Memory app now includes a Postgres + pgvector backend for:
- **Persistent storage** of characters and stories
- **Vector similarity search** for faces (via face embeddings)
- **Semantic search** for narratives (requires embedding generation)
- **Fallback to localStorage** when Postgres is unavailable

## Quick Start

### 1. Environment Setup

Create/update `.env.local`:

```env
# Postgres Connection
DB_HOST=192.168.49.198
DB_PORT=5432
DB_NAME=memory_keeper
DB_USER=postgres
DB_PASSWORD=postgres

# Gemini API (existing)
GEMINI_API_KEY=your_key_here
```

### 2. Install Dependencies

```bash
npm install pg
npm install --save-dev @types/pg
```

Add to `package.json` dependencies:
```json
"pg": "^8.11.3"
```

### 3. Initialize Database

On app startup or via endpoint:

```bash
curl http://localhost:3000/api/db-init
```

This will:
- Create the pgvector extension
- Create `characters` table with face vectors
- Create `stories` table
- Create `story_embeddings` table for semantic search
- Set up indices for fast similarity search

## Architecture

### Data Flow

```
Client (localStorage)
    ↓
API Route (/api/*)
    ↓
memory-bank-enhanced.ts (hybrid logic)
    ↓
db/postgres.ts (server-only DB operations)
    ↓
PostgreSQL + pgvector
```

### Database Schema

#### Characters Table
```sql
characters {
  id: TEXT (primary key)
  name: TEXT
  relationship: TEXT
  description: TEXT
  places: TEXT[]
  story_ids: TEXT[]
  created_at: BIGINT
  updated_at: BIGINT
}
```

#### Character Faces Table (with Vector Index)
```sql
character_faces {
  id: SERIAL (primary key)
  character_id: TEXT (FK)
  descriptor: vector(128) -- face embedding
  photo_id: TEXT
  box: JSONB -- {x, y, width, height}
  thumbnail: TEXT (base64)
  created_at: BIGINT
  
  -- Index: character_faces_descriptor_idx (for fast similarity search)
}
```

#### Stories Table
```sql
stories {
  id: TEXT (primary key)
  photo_id: TEXT
  narrative: TEXT
  character_ids: TEXT[]
  places: TEXT[]
  dates: TEXT[]
  photo_base64: TEXT
  created_at: BIGINT
}
```

#### Story Embeddings Table (Optional - for semantic search)
```sql
story_embeddings {
  id: SERIAL (primary key)
  story_id: TEXT (FK, unique)
  embedding: vector(768) -- narrative embedding
  created_at: BIGINT
  
  -- Index: story_embeddings_idx (for fast semantic search)
}
```

## API Endpoints

### Database Initialization
```http
GET /api/db-init
```
Initializes the database and creates tables.

**Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully"
}
```

### Face Similarity Search
```http
POST /api/search-faces
Content-Type: application/json

{
  "descriptor": [number array of 128 floats],
  "threshold": 0.45,
  "limit": 5
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "characterId": "string",
      "characterName": "string",
      "descriptor": [number[]],
      "similarity": number
    }
  ]
}
```

### Story Semantic Search
```http
POST /api/search-stories
Content-Type: application/json

{
  "embedding": [number array of 768 floats],
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "storyId": "string",
      "narrative": "string",
      "photoId": "string",
      "similarity": number
    }
  ]
}
```

### Save Story Embedding
```http
POST /api/save-story-embedding
Content-Type: application/json

{
  "storyId": "string",
  "embedding": [number array of 768 floats]
}
```

## Usage in Code

### Client-Side (React Components)
```typescript
import { loadMemoryBank, upsertCharacter, addStory } from '@/lib/memory-bank-enhanced';

// Load from localStorage (fallback if Postgres unavailable)
const bank = loadMemoryBank();

// Add character - automatically syncs to Postgres on server
const { character } = upsertCharacter(bank, {
  name: 'Grandma',
  relationship: 'grandmother',
  faceDescriptor: [0.1, 0.2, ...], // 128-dim array
  photoId: 'photo123',
  faceBox: { x: 100, y: 50, width: 150, height: 200 }
});

// Add story - automatically syncs to Postgres
const { story } = addStory(bank, {
  photoId: 'photo123',
  narrative: 'This is the story...',
  characterIds: [character.id],
  places: ['kitchen', 'backyard'],
  dates: ['1985-06-15']
});
```

### Server-Side (API Routes)
```typescript
import { db } from '@/lib/memory-bank-enhanced';

// Search for similar faces
const results = await db?.findSimilarFaces(
  faceDescriptor, // 128-dim array
  0.45, // similarity threshold
  5 // limit
);

// Search for stories semantically
const storyResults = await db?.searchStories(
  narrativeEmbedding, // 768-dim array
  10 // limit
);

// Save narrative embedding for future semantic search
await db?.insertStoryEmbedding(storyId, embedding);

// Initialize database (call once on app startup)
await db?.initializeDatabase();
await db?.createTables();
```

## Migration from Old memory-bank.ts

The new system is **backward compatible**:

1. **Option A: Keep both** - Old code continues to work
   ```typescript
   import { loadMemoryBank } from '@/lib/memory-bank'; // OLD
   import { loadMemoryBank } from '@/lib/memory-bank-enhanced'; // NEW
   ```

2. **Option B: Migrate incrementally**
   - Replace imports: `@/lib/memory-bank` → `@/lib/memory-bank-enhanced`
   - Call `/api/db-init` on first load
   - Existing localStorage data is still used as primary cache

3. **Option C: Full migration**
   - Copy characters & stories from localStorage
   - Post them to sync endpoints
   - Switch to server-side queries

## Common Tasks

### Enable Face Similarity Search in Your App

**In a React component:**
```typescript
import { getAllKnownFaces } from '@/lib/memory-bank-enhanced';

async function matchFaceToDatabase(faceDescriptor: number[]) {
  const response = await fetch('/api/search-faces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ descriptor: faceDescriptor, threshold: 0.45 })
  });
  
  const data = await response.json();
  return data.results; // Similar faces from database
}
```

### Generate Story Embeddings

Use the Gemini Embedding API:
```typescript
async function embedStoryNarrative(narrative: string) {
  const response = await fetch('/api/embed-text', {
    method: 'POST',
    body: JSON.stringify({ text: narrative })
  });
  
  const { embedding } = await response.json();
  
  // Save to database
  await fetch('/api/save-story-embedding', {
    method: 'POST',
    body: JSON.stringify({ storyId, embedding })
  });
}
```

See [API_ROUTES.md](./API_ROUTES.md) for creating the embedding endpoint.

### Fallback Strategy

If Postgres is unavailable:
- Characters/stories still save to localStorage
- Face search falls back to brute-force client-side distance calculation
- Story search is disabled (requires embeddings table)

The app continues functioning with reduced capabilities.

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 192.168.49.198:5432
```
- Verify Postgres is running: `docker ps` or check server
- Verify firewall allows port 5432
- Check credentials in `.env.local`

### pgvector Extension Not Found
```
ERROR: type "vector" does not exist
```
- Install pgvector on the Postgres server:
  ```bash
  docker exec <container> psql -U postgres -d memory_keeper -c 'CREATE EXTENSION vector;'
  ```
- Or run `/api/db-init` again

### Vector Index Slow
```sql
-- Rebuild indices if needed
REINDEX INDEX character_faces_descriptor_idx;
REINDEX INDEX story_embeddings_idx;
```

## Performance Tips

1. **Lazy initialize** - Call `/api/db-init` on first use, not on every request
2. **Batch operations** - Insert multiple faces/stories in single transaction
3. **Adjust IVFFlat lists** - For 10K+ faces, tune:
   ```sql
   WITH (lists = 100) -- default is 30
   ```
4. **Cache results** - Use React Query or SWR for face/story searches

## Next Steps

1. Install pg: `npm install pg`
2. Set environment variables in `.env.local`
3. Call `GET /api/db-init` to initialize
4. Replace imports to use `memory-bank-enhanced` in your components
5. (Optional) Generate embeddings for stories and enable semantic search

---

Questions? See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for architecture overview.
