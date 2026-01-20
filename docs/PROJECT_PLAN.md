# Living Memory - Project Plan

> **Last Updated**: January 2026  
> **Status**: In Development (Hackathon MVP)

---

## 🎯 Project Vision

**Living Memory** turns scattered family photos into a shared, contextualized event story built from multiple perspectives, then generates a stitched cinematic recap.

### Core Value Proposition
- Photos alone lose context over time
- This app reconstructs context by collecting multi-perspective stories from friends/family
- Stores everything as an event knowledge base
- Generates a stitched recap video from animated photos with AI-generated narration

### What Makes This NOT an "AI Wrapper"
- Multi-contributor inputs (family members add their perspectives)
- Event-level knowledge base (facts, timeline, people entities)
- Cross-photo context (AI knows about Bob from previous conversations)
- Order-aware narration (story changes based on clip arrangement)
- Compounding value over time

---

## 🏗️ System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. CAPTURE MODE (Mobile-First)                                         │
│     ┌─────────┐    ┌─────────────┐    ┌─────────────┐                  │
│     │ Scan    │───▶│ Gemini Live │───▶│ Store       │                  │
│     │ Photo   │    │ Conversation│    │ Context     │                  │
│     └─────────┘    └─────────────┘    └─────────────┘                  │
│          │                                    │                          │
│          ▼                                    ▼                          │
│     ┌─────────┐                        ┌─────────────┐                  │
│     │ Nano    │                        │ Extract     │                  │
│     │ Banana  │                        │ Facts       │                  │
│     │ Crop    │                        │ & Story     │                  │
│     └─────────┘                        └─────────────┘                  │
│          │                                    │                          │
│          ▼                                    ▼                          │
│     ┌─────────┐                        ┌─────────────┐                  │
│     │ Animate │                        │ Knowledge   │                  │
│     │ (Veo/   │                        │ Base        │                  │
│     │ Subtle) │                        │ Update      │                  │
│     └─────────┘                        └─────────────┘                  │
│          │                                    │                          │
│          └────────────────┬───────────────────┘                          │
│                           ▼                                              │
│  2. ALBUM MODE (Desktop-Friendly)                                       │
│     ┌─────────────────────────────────────────────────┐                 │
│     │ User Orders Clips in Album                       │                 │
│     │ [Beach] → [Boat] → [Sunset] → [Dinner]          │                 │
│     └─────────────────────────────────────────────────┘                 │
│                           │                                              │
│                           ▼                                              │
│     ┌─────────────────────────────────────────────────┐                 │
│     │ AI Generates Order-Aware Narration Script       │                 │
│     │ (Fitted to each 7-second clip)                  │                 │
│     └─────────────────────────────────────────────────┘                 │
│                           │                                              │
│                           ▼                                              │
│     ┌─────────────────────────────────────────────────┐                 │
│     │ TTS with Cloned Voice (Optional)                │                 │
│     └─────────────────────────────────────────────────┘                 │
│                           │                                              │
│                           ▼                                              │
│     ┌─────────────────────────────────────────────────┐                 │
│     │ Stitch Final Video                              │                 │
│     │ Output: 20-60 second family memory film         │                 │
│     └─────────────────────────────────────────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| AI Chat | Gemini Live API |
| Vision | Gemini 2.0 Flash |
| Animation | Veo 3 (premium) / CSS (default) |
| TTS | Google Cloud TTS / ElevenLabs |
| Voice Clone | ElevenLabs (optional) |
| Deployment | Vercel |

---

## 📊 Data Model

### Supabase Tables

```sql
-- ============================================
-- CORE TABLES
-- ============================================

-- Events (Albums)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  location TEXT,
  summary TEXT,                    -- AI-generated event summary
  cover_photo_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  uploader_id UUID REFERENCES users(id),
  
  -- Image URLs (Supabase Storage)
  original_url TEXT,               -- Raw camera capture
  cleaned_url TEXT,                -- After Nano Banana extraction
  animated_url TEXT,               -- Veo or subtle animation
  thumbnail_url TEXT,
  
  -- Metadata
  order_in_album INTEGER,          -- User-defined order
  animation_type TEXT,             -- 'veo' | 'subtle' | 'none'
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATION & STORY TABLES
-- ============================================

-- Conversations (linked to specific photos)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id),
  author_id UUID REFERENCES users(id),
  
  transcript TEXT,                 -- Full conversation JSON
  audio_url TEXT,                  -- Original audio (for voice cloning)
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages within conversations
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL,              -- 'user' | 'assistant'
  content TEXT NOT NULL,
  timestamp_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo Stories (extracted from conversations)
CREATE TABLE photo_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id),
  
  -- Extracted facts
  who_facts JSONB,                 -- ["Grandpa Bob", "Tommy"]
  what_facts JSONB,                -- ["fishing trip", "first catch"]
  when_facts JSONB,                -- ["summer 2024", "early morning"]
  where_facts JSONB,               -- ["Lake Tahoe", "the old dock"]
  why_facts JSONB,                 -- ["annual tradition", "teaching moment"]
  
  -- Generated content
  generated_story TEXT,            -- Individual photo narrative
  completeness_score INTEGER,      -- 0-100%
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PEOPLE & KNOWLEDGE BASE
-- ============================================

-- People (family members, friends)
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES users(id),
  
  name TEXT NOT NULL,
  nicknames TEXT[],                -- ["Grandpa", "Bob", "Pops"]
  avatar_url TEXT,
  
  -- Relationships
  relationships JSONB,             -- {"father_of": ["Dad"], "married_to": "Ruth"}
  
  -- Accumulated facts from conversations
  facts JSONB[],                   -- ["born 1944", "loves fishing", ...]
  
  -- Optional: Face recognition
  face_embedding VECTOR(512),      -- For future face matching
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link people to photos
CREATE TABLE photo_people (
  photo_id UUID REFERENCES photos(id),
  person_id UUID REFERENCES people(id),
  
  mentioned_in_conversation BOOLEAN DEFAULT false,
  visually_detected BOOLEAN DEFAULT false,
  confidence FLOAT,
  bbox JSONB,                      -- {x, y, width, height}
  
  PRIMARY KEY (photo_id, person_id)
);

-- ============================================
-- ALBUM OUTPUT
-- ============================================

-- Album Narrations (final output)
CREATE TABLE album_narrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  
  -- Order & Script
  photo_order UUID[],              -- Array of photo_ids in order
  full_script TEXT,                -- Combined narrative
  script_segments JSONB,           -- [{photo_id, start_time, end_time, text}, ...]
  
  -- Generated media
  audio_url TEXT,                  -- TTS narration audio
  video_url TEXT,                  -- Final stitched video
  
  -- Voice settings
  voice_type TEXT,                 -- 'cloned' | 'default'
  voice_clone_id TEXT,             -- ElevenLabs voice ID
  
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS & VOICE CLONING
-- ============================================

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  
  -- Voice cloning
  voice_clone_id TEXT,             -- ElevenLabs voice ID
  voice_sample_url TEXT,           -- Original audio sample
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOBS (Background Processing)
-- ============================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,              -- 'extract' | 'animate' | 'stitch' | 'tts'
  status TEXT DEFAULT 'queued',    -- 'queued' | 'running' | 'done' | 'error'
  
  event_id UUID REFERENCES events(id),
  photo_id UUID REFERENCES photos(id),
  
  progress INTEGER DEFAULT 0,      -- 0-100
  result_url TEXT,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 Key Workflows

### 1. Photo-Conversation Linking

**Problem**: Keep conversations tied to specific photos, not mixed together.

**Flow**:
```
1. User clicks "Scan Photo"
2. 4-corner detection activates
3. Photo captured → Nano Banana extraction → photo_id created
4. Gemini Live session starts with photo context
5. All messages stored with photo_id
6. User scans NEW photo → New photo_id → Previous conversation "closed"
7. Facts extracted from conversation → photo_stories table
```

**Key**: Each photo has its own conversation bucket. The AI asks questions specifically about THAT photo.

### 2. Story Generation Pipeline

**Hybrid Approach** (generate now, refine later):

```
┌─────────────────────────────────────────────────────────┐
│  DURING CONVERSATION                                     │
├─────────────────────────────────────────────────────────┤
│  AI tracks "story completeness":                         │
│  ├── Who is in the photo? ✓ (extracted)                 │
│  ├── When was it taken? ✓ (extracted)                   │
│  ├── Where? ✗ (missing)                                 │
│  ├── What happened? ✓ (extracted)                       │
│  └── Why is it meaningful? ✗ (missing)                  │
│                                                          │
│  Display to user: "Story 60% complete"                  │
├─────────────────────────────────────────────────────────┤
│  AFTER CONVERSATION                                      │
├─────────────────────────────────────────────────────────┤
│  Generate DRAFT story (even if incomplete)              │
│  Mark gaps: "[Location unknown]"                        │
│  User can return later to fill gaps                     │
├─────────────────────────────────────────────────────────┤
│  AT ALBUM ASSEMBLY                                       │
├─────────────────────────────────────────────────────────┤
│  AI can infer missing details from album context:       │
│  "Photo B mentions Lake Tahoe, Photo A looks like       │
│   the same trip → probably Lake Tahoe too"              │
└─────────────────────────────────────────────────────────┘
```

### 3. Animation Strategy

**Two Tiers**:

| Tier | Method | Cost | Use Case |
|------|--------|------|----------|
| Default | Subtle CSS/Canvas | FREE | All photos |
| Premium | Veo 3 | ~$0.20/clip | "Hero" moments |

**Subtle Animation Options**:
- Ken Burns effect (pan/zoom)
- Parallax depth (foreground/background separation)
- Particle overlay (dust, light rays)
- Gentle motion blur

**Veo Animation**:
- Full motion (people move, expressions change)
- 7-second clips only
- User selects "✨ Bring to Life" on specific photos
- Limit: 2-3 per album for free tier

### 4. Narration Pipeline (7-Second Clips)

**The Challenge**: Veo generates 7-second clips, narration must fit.

**Solution**:

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Animate Each Photo Independently               │
├─────────────────────────────────────────────────────────┤
│  Photo A → Animate → 7s clip (stored)                   │
│  Photo B → Animate → 7s clip (stored)                   │
│  Photo C → Animate → 7s clip (stored)                   │
├─────────────────────────────────────────────────────────┤
│  STEP 2: User Orders Clips                              │
├─────────────────────────────────────────────────────────┤
│  [B] → [A] → [C]                                        │
│  Total duration: 21 seconds                             │
├─────────────────────────────────────────────────────────┤
│  STEP 3: Generate Fitted Narration                      │
├─────────────────────────────────────────────────────────┤
│  AI generates script with timing constraints:           │
│                                                          │
│  [0:00-0:07] Clip B narration (~20-25 words)           │
│  "The adventure began on Grandpa's boat,                │
│   the same vessel he'd sailed since '62."               │
│                                                          │
│  [0:07-0:14] Clip A narration (~20-25 words)           │
│  "After docking, Tommy couldn't wait to                 │
│   build his first sandcastle on the shore."             │
│                                                          │
│  [0:14-0:21] Clip C narration (~20-25 words)           │
│  "As the sun dipped below the mountains,                │
│   we knew this was a day we'd never forget."            │
├─────────────────────────────────────────────────────────┤
│  STEP 4: TTS + Stitch                                   │
├─────────────────────────────────────────────────────────┤
│  Generate audio for each segment                         │
│  Stitch: Video B + Audio B → Video A + Audio A → ...    │
│  Output: Seamless 21-second film                        │
└─────────────────────────────────────────────────────────┘
```

**Order Matters**:
- If user reorders to [A] → [B] → [C]:
- Narration regenerates with different transitions
- "It started on the beach... Later, we took the boat out..."

### 5. Voice Cloning (Optional)

**Service**: ElevenLabs (best quality, has free tier)

**Flow**:
```
1. During Gemini Live conversation:
   └── User's voice is streamed
   
2. Extract clean voice samples:
   └── Filter out AI responses
   └── Need 30+ seconds of user speaking
   
3. Send to ElevenLabs:
   └── POST /voices/add
   └── Returns voice_id
   
4. Store in Supabase:
   └── users.voice_clone_id = "elevenlabs_xxxxx"
   
5. When generating narration:
   └── Use cloned voice_id for TTS
   └── Fallback: Use warm default voice
```

**Free Tier Limits**:
- 10,000 characters/month
- ~3-4 short videos per month
- Good enough for demo

### 6. Person Knowledge Base

**Concept**: AI knows about family members across all conversations.

**How It Works**:
```
┌─────────────────────────────────────────────────────────┐
│  KNOWLEDGE BASE                                          │
├─────────────────────────────────────────────────────────┤
│  Person: "Bob"                                           │
│  ├── Mentioned in: [photo_1, photo_5, photo_8]          │
│  ├── Relationships: {grandpa: true, married_to: "Ruth"} │
│  ├── Facts:                                              │
│  │   ├── "First visited Lake Tahoe in 1962"            │
│  │   ├── "Taught Tommy to fish"                        │
│  │   ├── "Loves telling stories about his boat"        │
│  │   └── "Born in Chicago"                             │
│  └── Face embedding: [optional]                         │
├─────────────────────────────────────────────────────────┤
│  SYSTEM PROMPT FOR GEMINI LIVE                          │
├─────────────────────────────────────────────────────────┤
│  "Known people in this family:                          │
│   - Bob (Grandpa): Visited Lake Tahoe since 1962,       │
│     taught Tommy to fish, loves his boat                │
│   - Tommy (Grandson): 8 years old, learning to fish     │
│   - Ruth (Grandma): Bob's wife, excellent cook          │
│                                                          │
│   When user mentions these people, connect their        │
│   stories. Ask follow-up questions that deepen          │
│   the narrative."                                       │
├─────────────────────────────────────────────────────────┤
│  EXAMPLE INTERACTION                                     │
├─────────────────────────────────────────────────────────┤
│  User: "This is Bob and Tommy at the lake"              │
│                                                          │
│  AI: "Oh, is this the same lake where Bob taught        │
│       Tommy to fish? You mentioned that was a special   │
│       moment for them. What made this day different?"   │
└─────────────────────────────────────────────────────────┘
```

**Key Insight**: This works WITHOUT face recognition. Just name matching + accumulated facts from conversations.

---

## 📱 UI/UX Design

### Capture Mode (Mobile-First)

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │     📷 Camera Feed             │    │
│  │     (70% opacity)              │    │
│  │                                 │    │
│  │   ┌─────────────────────┐      │    │
│  │   │  ┌───┐       ┌───┐  │      │    │
│  │   │  └───┘       └───┘  │      │    │
│  │   │                     │      │    │
│  │   │   SCAN ZONE (95%)   │      │    │
│  │   │                     │      │    │
│  │   │  ┌───┐       ┌───┐  │      │    │
│  │   │  └───┘       └───┘  │      │    │
│  │   └─────────────────────┘      │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │  ~~~~~~~~ Aurora Wave ~~~~~~~~  │    │
│  │  (Reacts to user/AI speech)     │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐     │
│  │ 💬 "Tell me about this photo"  │     │
│  │                                 │     │
│  │ 👤 "This is my grandpa Bob..." │     │
│  └────────────────────────────────┘     │
│                                          │
│     [🎤 Mic]  [📷 Scan]  [📁 Gallery]   │
│                                          │
└─────────────────────────────────────────┘
```

### Album Mode (Desktop-Friendly)

```
┌─────────────────────────────────────────────────────────────────┐
│  Living Memory                              🔍  👤  ⚙️          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │                    HERO IMAGE                           │    │
│  │                 (Featured Memory)                       │    │
│  │                                                          │    │
│  │     Summer 2024 Reunion                                 │    │
│  │     Lake Tahoe · 12 photos · 3 stories                  │    │
│  │                                                          │    │
│  │     [▶ Watch Film]  [+ Add Story]                       │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Films Ready                                              ──▶   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │ 📷     │ │ 📷     │ │ 📷     │ │ 📷     │                   │
│  │        │ │        │ │        │ │        │                   │
│  │ ▶ Film │ │ ▶ Film │ │ ▶ Film │ │ ▶ Film │                   │
│  └────────┘ └────────┘ └────────┘ └────────┘                   │
│                                                                  │
│  Needs More Stories                                       ──▶   │
│  ┌────────┐ ┌────────┐ ┌────────┐                              │
│  │ 📷     │ │ 📷     │ │ 📷     │                              │
│  │  60%   │ │  40%   │ │  80%   │                              │
│  │        │ │        │ │        │                              │
│  └────────┘ └────────┘ └────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💰 Cost Estimates

### Per Album (10 photos)

| Item | Cost |
|------|------|
| Gemini Live API | Free tier (50 req/day) |
| Gemini Vision (Nano Banana) | Free tier |
| Veo Animation (3 hero clips) | ~$0.60 |
| Subtle Animation (7 clips) | FREE |
| ElevenLabs TTS | Free tier |
| Supabase | Free tier |
| **Total** | **~$0.60** |

### For Demo

| Item | Cost |
|------|------|
| Pre-animate 5 clips with Veo | ~$1.00 |
| All other features | Free tier |
| **Total** | **~$1.00** |

---

## 📅 Implementation Phases

### Phase 1: Foundation (Current)
- [x] Next.js app structure
- [x] Gemini Live API integration
- [x] Camera capture with 4-corner detection
- [x] Nano Banana photo extraction
- [x] Basic UI (capture + album modes)
- [ ] Photo-conversation linking
- [ ] Supabase integration

### Phase 2: Story Pipeline
- [ ] Fact extraction from conversations
- [ ] Story completeness scoring
- [ ] Individual photo story generation
- [ ] Person knowledge base
- [ ] Context injection into Gemini Live

### Phase 3: Animation & Media
- [ ] Subtle animation (CSS/Canvas)
- [ ] Veo integration for premium animation
- [ ] Video storage in Supabase

### Phase 4: Narration & Output
- [ ] Order-aware narration script generation
- [ ] TTS integration (Google Cloud / ElevenLabs)
- [ ] Voice cloning (optional)
- [ ] Video stitching
- [ ] Final film export

### Phase 5: Polish
- [ ] Face detection + manual tagging
- [ ] Auto-suggest face matches
- [ ] Cross-album context
- [ ] Multi-contributor support
- [ ] Mobile optimization

---

## ❓ Open Questions

1. **Animation Default**: Should all photos get subtle animation, or only when requested?

2. **Story Minimum**: Block video generation if story <50% complete?

3. **Narration Style**: 
   - Documentary style? ("In the summer of 2024...")
   - Personal style? ("I remember when...")
   - Third person? ("The family gathered...")

4. **Multi-Contributor Conflict**: What if two people tell conflicting stories about the same photo?

5. **Privacy**: Who can see/add to family albums? Share links? Invite system?

---

## 🔗 Related Documents

- [.cursorrules](.cursorrules) - AI assistant rules
- [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) - Technical architecture
- [AI_AGENTS_GUIDE.md](docs/AI_AGENTS_GUIDE.md) - AI integration details
- [VEO3_SETUP.md](docs/VEO3_SETUP.md) - Veo animation setup

---

## 👥 Team Responsibilities

### Frontend (Current Focus)
- Capture mode UI
- Album mode UI
- Gemini Live integration
- Photo scanning & extraction

### Backend (Partner)
- Supabase schema setup
- Storage configuration
- API routes for CRUD
- Knowledge base implementation

### AI Pipeline (Shared)
- Story extraction prompts
- Narration generation
- Context management
- Voice cloning setup

---

*This document is a living plan. Update as decisions are made.*
