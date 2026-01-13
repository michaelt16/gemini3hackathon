# Migration Analysis: Current State → Living Memory

## 📊 Current Implementation (What Exists)

### ✅ What Works
1. **Single Photo Conversation**
   - Photo analysis with Gemini Vision (`/api/analyze-photo`)
   - Text-based chat (`/api/chat`) - NOT Gemini Live, just regular API
   - Story synthesis (`/api/synthesize-story`)
   - Video generation endpoint (mocked)

2. **Face Recognition**
   - Client-side face detection (face-api.js)
   - Face matching against known faces
   - Manual face naming
   - Face descriptors stored locally

3. **Client-Side Storage**
   - Memory bank in localStorage
   - Characters, faces, stories stored in browser
   - No database, no persistence across devices

4. **UI**
   - Single-page app (`page.tsx`)
   - Single photo view
   - Conversation interface
   - Face overlay on photos

5. **Architecture**
   - Next.js App Router ✅
   - API routes (server-side) ✅
   - Gemini API integration ✅
   - TypeScript ✅

### ❌ What's Missing for "Living Memory"

1. **Database & Persistence**
   - ❌ No Supabase (or any DB)
   - ❌ No user authentication
   - ❌ No multi-device sync
   - ❌ All data in localStorage (lost on clear)

2. **Events System**
   - ❌ No events table/model
   - ❌ Single photo only (no event grouping)
   - ❌ No event metadata (date, location, etc.)

3. **Multi-Contributor**
   - ❌ Single user only
   - ❌ No collaboration
   - ❌ No contributor attribution
   - ❌ No multi-perspective merging

4. **Gemini Live API**
   - ❌ Text-only conversations
   - ❌ No streaming/real-time
   - ❌ No audio input/output

5. **Data Model Mismatch**
   - Current: `MemoryBank` (characters, stories)
   - Needed: `events`, `media`, `snippets`, `facts`, `people`, `jobs`

6. **Missing Features**
   - ❌ Camera mode with continuous capture
   - ❌ Media upload to cloud storage
   - ❌ Snippets storage (transcripts in DB)
   - ❌ Facts extraction pipeline
   - ❌ Jobs system (async processing)
   - ❌ Album Mode UI
   - ❌ Capture Mode UI (separate routes)
   - ❌ Timeline view
   - ❌ People tagging system
   - ❌ Multi-perspective reconciliation

## 🔄 Migration Strategy Options

### Option 1: **Adapt Existing Code** (Recommended for Hackathon)
**Pros:**
- Keep working face recognition
- Keep Gemini integration patterns
- Reuse UI components
- Faster to MVP

**Cons:**
- Need to refactor data layer
- localStorage → Supabase migration
- Some code will need rewriting

**Approach:**
1. Add Supabase setup
2. Create new data models (events, media, snippets, etc.)
3. Migrate localStorage logic to DB calls
4. Split single page into `/capture` and `/album` routes
5. Add Gemini Live API integration
6. Build jobs system
7. Add camera mode

**Effort:** Medium (2-3 days for core migration)

---

### Option 2: **Fresh Start with New Structure**
**Pros:**
- Clean architecture from day 1
- No legacy code to maintain
- Follows new patterns exactly

**Cons:**
- Lose face recognition work
- Lose UI components
- More time to rebuild basics
- Risk of not finishing in hackathon time

**Approach:**
1. Create new Next.js structure
2. Set up Supabase from scratch
3. Build new data models
4. Rebuild UI components
5. Integrate Gemini Live

**Effort:** High (4-5 days, might not finish)

---

### Option 3: **Hybrid - Keep Core, Rebuild Data Layer**
**Pros:**
- Keep face recognition (valuable!)
- Keep Gemini integration patterns
- Clean data layer
- Faster than full rebuild

**Cons:**
- Some refactoring needed
- Temporary duplication during migration

**Approach:**
1. Keep `face-service.ts`, `gemini.ts`, UI components
2. Create new `lib/db.ts` for Supabase
3. Create new data models in `lib/types.ts`
4. Build new API routes alongside old ones
5. Migrate UI to use new routes
6. Remove old localStorage code

**Effort:** Medium-Low (1-2 days for data layer, then feature work)

---

## 🎯 Recommended Path: **Option 3 (Hybrid)**

### Phase 1: Foundation (Day 1)
1. **Set up Supabase**
   - Create project
   - Set up tables (events, media, snippets, facts, people, jobs)
   - Configure storage bucket
   - Add auth (simple email/password for MVP)

2. **Create Database Layer**
   - `lib/db.ts` - Supabase client
   - `lib/storage.ts` - File upload helpers
   - Update `lib/types.ts` with new models

3. **Keep Existing Code**
   - Don't delete anything yet
   - Mark old code as "legacy" with comments

### Phase 2: New API Routes (Day 1-2)
1. **Build New Endpoints**
   - `POST /api/events` - Create event
   - `GET /api/events` - List events
   - `POST /api/media` - Upload photo
   - `POST /api/snippets` - Save transcript
   - `POST /api/extract` - Extract facts (job)
   - `GET /api/jobs/:id` - Job status

2. **Gemini Live Integration**
   - `POST /api/live/connect` - WebSocket/streaming
   - Save transcripts to snippets table

### Phase 3: UI Migration (Day 2-3)
1. **Create New Routes**
   - `/capture` - Capture Mode (camera + conversation)
   - `/album` - Album Mode (event library)
   - `/album/[id]` - Event detail view

2. **Reuse Components**
   - Extract face detection UI to shared component
   - Reuse conversation UI
   - Adapt photo display

3. **Build New Features**
   - Camera mode with continuous capture
   - Timeline view
   - Contributor attribution
   - Job progress UI

### Phase 4: Features (Day 3-4)
1. **Facts Extraction**
   - Build extraction pipeline
   - Update event summary
   - Create timeline

2. **Animation & Stitching**
   - Integrate Veo 3 (when available)
   - Build stitch job
   - Video player

3. **Polish**
   - Multi-perspective reconciliation
   - Adaptive questions
   - Demo flow optimization

---

## 📋 What to Keep vs. Rebuild

### ✅ **KEEP** (Valuable Code)
- `src/lib/face-service.ts` - Face detection works well
- `src/lib/gemini.ts` - API integration pattern is good
- `src/lib/prompts.ts` - Can adapt prompts
- UI components (extract to shared)
- Face recognition logic

### 🔄 **ADAPT** (Needs Changes)
- `src/lib/types.ts` - Add new models, keep some old ones
- `src/app/page.tsx` - Split into `/capture` and `/album`
- API routes - Add new ones, keep patterns
- Conversation flow - Adapt for Gemini Live

### ❌ **REPLACE** (New Implementation)
- `src/lib/memory-bank.ts` - Replace with Supabase
- localStorage usage - Replace with DB calls
- Single photo model - Replace with events/media model
- Text-only chat - Replace with Gemini Live

---

## 🚀 Quick Start Plan

### Step 1: Supabase Setup (30 min)
```bash
npm install @supabase/supabase-js
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Step 2: Database Schema (1 hour)
Create tables in Supabase:
- events
- media
- snippets
- facts
- people
- media_people
- jobs

### Step 3: Database Layer (2 hours)
Create `lib/db.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(...)
```

### Step 4: First New Route (1 hour)
Build `POST /api/events` to test DB connection

### Step 5: Migrate UI (ongoing)
Start building `/capture` route, reuse existing components

---

## ⚠️ Key Decisions Needed

1. **Authentication**: Simple email/password or OAuth? (For MVP, email/password is fine)
2. **Face Recognition**: Keep client-side or move to server? (Keep client-side for now)
3. **Storage**: Supabase Storage or separate (S3, Cloudinary)? (Supabase Storage for simplicity)
4. **Jobs**: Supabase Edge Functions or external worker? (Edge Functions for MVP)
5. **Gemini Live**: Start with text streaming or wait for Live API? (Text streaming first, upgrade later)

---

## 📈 Success Metrics

**MVP Deliverable:**
- ✅ Create event
- ✅ Upload photos to event
- ✅ Have conversation (text or Live)
- ✅ Save snippets
- ✅ Extract facts
- ✅ Show timeline
- ✅ Multiple contributors can add to same event
- ✅ Generate recap video (even if mocked)

**Nice to Have:**
- Camera mode
- Face recognition integration
- Multi-perspective reconciliation
- Real animation (not mocked)

---

## 🎯 Recommendation

**Go with Option 3 (Hybrid)** - Keep the valuable parts (face recognition, Gemini patterns), rebuild the data layer, and build new features on top. This gives you:
- Fastest path to working MVP
- Keeps your best work (face recognition)
- Clean architecture going forward
- Manageable scope for hackathon

**Timeline:**
- Day 1: Supabase setup + new API routes
- Day 2: UI migration + Capture Mode
- Day 3: Album Mode + Facts extraction
- Day 4: Polish + Demo prep

This is aggressive but doable if you focus on core features first.
