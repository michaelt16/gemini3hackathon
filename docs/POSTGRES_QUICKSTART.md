# What Was Added - Postgres + pgvector Integration

## Files Created

### 1. Database Layer
- **`src/lib/db/postgres.ts`** - Connection pooling, table creation, vector queries
  - `initializeDatabase()` - Creates connection pool
  - `createTables()` - Creates all tables and indices
  - `insertCharacter()` - Save character data
  - `insertCharacterFace()` - Save face vector (128-dim)
  - `findSimilarFaces()` - Vector similarity search
  - `insertStory()` - Save narrative
  - `insertStoryEmbedding()` - Save narrative vector (768-dim)
  - `searchStories()` - Semantic search on narratives

### 2. Enhanced Memory Bank
- **`src/lib/memory-bank-enhanced.ts`** - Hybrid localStorage + Postgres
  - Identical API to original `memory-bank.ts`
  - Auto-syncs to Postgres (server-side only)
  - Falls back to localStorage if DB unavailable
  - Server export `db` namespace with Postgres functions

### 3. API Routes
- **`src/app/api/db-init/route.ts`** - Initialize database
- **`src/app/api/search-faces/route.ts`** - Find similar faces by descriptor
- **`src/app/api/search-stories/route.ts`** - Find stories by embedding
- **`src/app/api/save-story-embedding/route.ts`** - Store narrative embedding
- **`src/app/api/embed-narrative/route.ts`** - Generate embedding from text

### 4. Documentation
- **`docs/POSTGRES_PGVECTOR_SETUP.md`** - Complete technical setup guide
- **`docs/INTEGRATION_GUIDE.md`** - Quick start + code examples
- **`.env.local.example`** - Environment variables template

## 5-Minute Setup

```bash
# 1. Install
npm install pg

# 2. Configure
cp .env.local.example .env.local
# Edit .env.local with your Postgres credentials (already filled with 192.168.49.198)

# 3. Start app
npm run dev

# 4. Initialize database
curl http://localhost:3000/api/db-init

# 5. Use in code
import { loadMemoryBank, addStory } from '@/lib/memory-bank-enhanced';
```

## Key Features

### ✅ Vector Face Search
- Store 128-dimensional face embeddings from face-api.js
- Fast similarity search (pgvector IVF index)
- Find matching faces across all photos
- Configurable threshold

### ✅ Semantic Story Search
- Store 768-dimensional narrative embeddings
- Find narratives about similar events
- Improves Gemini context window
- Optional - enable when you generate embeddings

### ✅ Hybrid Persistence
- localStorage: Fast, offline-capable, client-side
- PostgreSQL: Persistent, searchable, server-side
- Auto-sync: Changes save to both
- Fallback: Works without Postgres

### ✅ Backward Compatible
- Drop-in replacement for `memory-bank.ts`
- Can keep both files temporarily
- Incremental migration possible

## Architecture

```
React Components
    ↓ (fetch)
API Routes (/api/*)
    ↓ (server-only)
memory-bank-enhanced.ts
    ├→ localStorage (always)
    └→ postgres.ts (if available)
        ↓
Postgres 192.168.49.198:5432
    ├─ character_faces (vectors)
    ├─ story_embeddings (vectors)
    └─ Indices (IVFFlat for speed)
```

## What to Do Next

### Option 1: Replace Current memory-bank
```bash
# Change imports in your components
- import from '@/lib/memory-bank'
+ import from '@/lib/memory-bank-enhanced'
```

### Option 2: Use Face Search in Your App
```typescript
// In face-service.ts or detect logic
const results = await fetch('/api/search-faces', {
  method: 'POST',
  body: JSON.stringify({ descriptor, threshold: 0.45 })
});
```

### Option 3: Add Semantic Search
```typescript
// When saving stories
const embedding = await generateEmbedding(narrative);
await saveStoryEmbedding(storyId, embedding);
```

## Database Schema

```sql
-- Character faces with vector index
CREATE TABLE character_faces (
  id SERIAL PRIMARY KEY,
  character_id TEXT,
  descriptor vector(128),           -- face embedding
  photo_id TEXT,
  box JSONB,
  created_at BIGINT,
  UNIQUE(character_id, photo_id)
);
CREATE INDEX character_faces_descriptor_idx 
  ON character_faces USING ivfflat (descriptor vector_cosine_ops);

-- Story embeddings with vector index
CREATE TABLE story_embeddings (
  id SERIAL PRIMARY KEY,
  story_id TEXT UNIQUE,
  embedding vector(768),            -- narrative embedding
  created_at BIGINT
);
CREATE INDEX story_embeddings_idx 
  ON story_embeddings USING ivfflat (embedding vector_cosine_ops);
```

## API Examples

### Search for Faces
```bash
curl -X POST http://localhost:3000/api/search-faces \
  -H "Content-Type: application/json" \
  -d '{
    "descriptor": [0.1, 0.2, ...],
    "threshold": 0.45,
    "limit": 5
  }'
```

### Search Stories
```bash
curl -X POST http://localhost:3000/api/search-stories \
  -H "Content-Type: application/json" \
  -d '{
    "embedding": [0.1, 0.2, ...],
    "limit": 10
  }'
```

## Environment Variables

Add to `.env.local`:
```env
DB_HOST=192.168.49.198
DB_PORT=5432
DB_NAME=memory_keeper
DB_USER=postgres
DB_PASSWORD=postgres
```

## Questions?

- **Setup issues?** → See `POSTGRES_PGVECTOR_SETUP.md`
- **Code examples?** → See `INTEGRATION_GUIDE.md`
- **Database schema?** → Check `postgres.ts` `createTables()`
- **Want to migrate?** → `INTEGRATION_GUIDE.md` has step-by-step

## Status: ✅ Ready to Use

All files are created and documented. Next steps:
1. Install pg: `npm install pg`
2. Set environment variables
3. Call `/api/db-init` to initialize
4. Start using in your code!

---

The system maintains **backward compatibility** - your existing code continues to work while gaining database superpowers. 🚀
