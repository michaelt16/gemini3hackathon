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

-- Events (Albums) - Can be event-based OR person-based
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  album_type TEXT NOT NULL,        -- 'event' | 'person' | 'theme'
  
  -- Event-specific fields (nullable if person-based)
  date_start DATE,
  date_end DATE,
  location TEXT,
  
  -- Person-specific fields (nullable if event-based)
  person_id UUID REFERENCES people(id),  -- For person-based albums
  
  -- Common fields
  summary TEXT,                    -- AI-generated album summary
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
-- NOTE: Stores facts + summary, NOT narration. Narration generated at album assembly.
CREATE TABLE photo_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id),
  
  -- Extracted facts (structured, filtered from conversation)
  who_facts JSONB,                 -- ["Grandpa Bob", "Tommy"]
  what_facts JSONB,                -- ["fishing trip", "first catch"]
  when_facts JSONB,                -- ["summer 2024", "early morning"]
  where_facts JSONB,               -- ["Lake Tahoe", "the old dock"]
  why_facts JSONB,                 -- ["annual tradition", "teaching moment"]
  
  -- Summary & metadata (NOT narration - that comes at album assembly)
  conversation_summary TEXT,       -- Clean summary of what user said (no filler)
  emotional_tone JSONB,            -- ["proud", "nostalgic", "joyful"]
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

### 0. Album Types

**Two Organizational Models**:

#### A. Event-Based Albums (Chronological)
- **Use Case**: "Summer 2024 Reunion", "Grandma's 80th Birthday"
- **Structure**: Photos from a specific time/place/event
- **Narration**: Chronological story ("It started on the beach... Later we...")
- **Timeline**: Linear progression

#### B. Person-Based Albums (Thematic)
- **Use Case**: "All Photos with Grandma", "Tommy's Growing Up"
- **Structure**: Photos featuring a specific person, across different times/events
- **Narration**: Thematic story ("Throughout the years...", "From childhood to...")
- **Timeline**: Can span years, organized by theme or life stage

**How It Works**:

```
┌─────────────────────────────────────────────────────────┐
│  PERSON-BASED ALBUM: "All Photos with Grandma"         │
├─────────────────────────────────────────────────────────┤
│  Photos included:                                        │
│  ├── Photo 1: 1985 - Grandma at wedding                │
│  ├── Photo 2: 1995 - Grandma with grandkids            │
│  ├── Photo 3: 2010 - Grandma's 70th birthday           │
│  ├── Photo 4: 2024 - Grandma at family reunion         │
│  └── Photo 5: 2024 - Grandma teaching Tommy to fish    │
│                                                          │
│  User orders: [2024 reunion] → [1985 wedding] →         │
│               [2010 birthday] → [1995 grandkids] →       │
│               [2024 fishing]                             │
│                                                          │
│  AI generates narration:                                 │
│  "This collection spans nearly four decades,             │
│   capturing moments with Grandma Ruth from her           │
│   daughter's wedding in 1985 to teaching her            │
│   great-grandson to fish in 2024. Each photo tells       │
│   a story of love, tradition, and the bonds that        │
│   connect generations..."                                │
│                                                          │
│  [0:00-0:07] "In 2024, the family gathered at Lake      │
│              Tahoe for a reunion that brought four       │
│              generations together..."                    │
│                                                          │
│  [0:07-0:14] "But the story begins decades earlier,     │
│              at a wedding in 1985, where Grandma        │
│              Ruth beamed with pride..."                  │
│                                                          │
│  [0:14-0:21] "By 2010, she was celebrating her 70th     │
│              birthday, surrounded by the family she      │
│              had built..."                               │
│                                                          │
│  [0:21-0:28] "Throughout the years, she's been the      │
│              heart of the family, from playing with      │
│              grandkids in 1995..."                       │
│                                                          │
│  [0:28-0:35] "To passing down traditions, like          │
│              teaching Tommy to fish, in 2024..."        │
└─────────────────────────────────────────────────────────┘
```

**Key Differences**:

| Aspect | Event-Based | Person-Based |
|--------|-------------|--------------|
| **Time Span** | Days/weeks | Years/decades |
| **Narration Style** | Chronological ("Then...", "Later...") | Thematic ("Throughout...", "From... to...") |
| **Photo Selection** | All photos from event | All photos with person |
| **Context** | Event details (location, date) | Person's life story, relationships |
| **Transitions** | Temporal ("After that...") | Reflective ("This moment reminds us...") |

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

**Two-Layer Approach** (facts now, narration at assembly):

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: PER-PHOTO (After Conversation)                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Raw Conversation                                        │
│       ↓                                                 │
│  FACT EXTRACTION (filter filler, extract substance)     │
│       ↓                                                 │
│  Structured Facts:                                       │
│  ├── who: ["Grandpa", "Tommy"]                          │
│  ├── what: ["fishing trip", "first catch"]              │
│  ├── when: ["summer 2024"]  ← or null if unknown        │
│  ├── where: ["Lake Tahoe"]  ← or null if unknown        │
│  ├── why: ["annual tradition"]                          │
│  └── emotions: ["proud", "nostalgic"]                   │
│                                                          │
│  Conversation Summary (clean, no filler):                │
│  "User shared this is Grandpa teaching Tommy to fish.   │
│   Tommy caught his first fish. Annual tradition they've │
│   kept for years. User emotional about passing down."   │
│                                                          │
│  Completeness: 80% (4/5 categories filled)              │
│                                                          │
│  ✓ NO NARRATION YET - just raw ingredients              │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  LAYER 2: ALBUM-LEVEL (At Album Assembly)                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User orders photos: [Photo B] → [Photo A] → [Photo C]  │
│       ↓                                                 │
│  AI sees ALL photos + their facts + summaries           │
│       ↓                                                 │
│  NARRATION GENERATION (one unified pass)                │
│       ↓                                                 │
│  Order-aware script:                                     │
│                                                          │
│  [0:00-0:07] Photo B (opening)                          │
│  "The adventure began on Grandpa's boat..."             │
│                                                          │
│  [0:07-0:14] Photo A (middle - transition)              │
│  "After docking, Tommy couldn't wait..."                │
│                                                          │
│  [0:14-0:21] Photo C (closing)                          │
│  "As the sun set, we knew this day..."                  │
│                                                          │
│  ✓ Transitions adapt based on order                     │
│  ✓ Cross-photo inference (fill missing details)         │
│  ✓ Consistent voice/style across entire album           │
│  ✓ Opening/middle/closing narrative structure           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Why Two Layers?**
- **No wasted work** — narration generated once when order is final
- **Full context** — AI sees all photos at once for better coherence
- **Better inference** — "Photo B mentions Lake Tahoe → Photo A probably same trip"
- **Handles incomplete gracefully** — missing details inferred from album context

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

**Two Narration Modes**:

#### A. Event-Based Narration (Chronological)
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

#### B. Person-Based Narration (Thematic)

**Different Approach for Person Albums**:

```
┌─────────────────────────────────────────────────────────┐
│  PERSON-BASED ALBUM NARRATION                            │
├─────────────────────────────────────────────────────────┤
│  Photos: [1985 wedding] → [1995 kids] → [2024 fishing]  │
│  Time span: 39 years                                     │
│  Person: Grandma Ruth                                    │
│                                                          │
│  AI generates thematic narration:                       │
│                                                          │
│  [0:00-0:07] "This collection spans nearly four         │
│              decades, capturing moments with Grandma     │
│              Ruth from her daughter's wedding..."        │
│                                                          │
│  [0:07-0:14] "Throughout the years, she's been the      │
│              heart of the family, from playing with      │
│              grandkids in 1995..."                       │
│                                                          │
│  [0:14-0:21] "To passing down traditions, like          │
│              teaching Tommy to fish, in 2024..."        │
│                                                          │
│  Key phrases for person-based:                          │
│  - "Throughout the years..."                           │
│  - "From [time] to [time]..."                         │
│  - "This moment reminds us of..."                      │
│  - "Across decades..."                                 │
│  - "The story of [person]..."                          │
│  - "From [life stage] to [life stage]..."             │
└─────────────────────────────────────────────────────────┘
```

**AI Prompt Template for Person-Based Albums**:

```
You are creating a narration for a person-based photo album about [Person Name].

This album contains photos from different times and events, all featuring [Person Name].
The photos span from [earliest_year] to [latest_year] ([time_span] years).

Key facts about [Person Name]:
- [Facts from knowledge base]
- Relationships: [relationships]
- Life events: [extracted from all photos]

Photos in order:
1. [Photo 1]: [Year] - [Context from story]
2. [Photo 2]: [Year] - [Context from story]
...

Generate a narration that:
- Tells the story of [Person Name] across time
- Uses thematic transitions ("Throughout...", "From... to...", "Across decades...")
- Connects moments across years
- Highlights their role in the family and life journey
- Each segment is 20-25 words, fitting 7 seconds
- Style: Reflective, nostalgic, connecting past to present
- Acknowledge the time span when appropriate

DO NOT use chronological transitions like "Then...", "Later that day...", "After that..."
Instead use: "Throughout...", "From... to...", "This moment reminds us...", "Across the years..."
```

**Order Still Matters (But Differently)**:
- User can arrange by: chronological, reverse chronological, or thematic
- AI adapts transitions accordingly
- Chronological: "From her wedding in 1985..."
- Reverse: "Looking back to 1985..."
- Thematic: "This collection shows Grandma's journey from..."

### 7. Creating Person-Based Albums

**Different Approach**:

```
┌─────────────────────────────────────────────────────────┐
│  PERSON-BASED ALBUM NARRATION                            │
├─────────────────────────────────────────────────────────┤
│  Photos: [1985 wedding] → [1995 kids] → [2024 fishing]  │
│  Time span: 39 years                                     │
│                                                          │
│  AI generates thematic narration:                       │
│                                                          │
│  [0:00-0:07] "This collection spans nearly four         │
│              decades, capturing moments with Grandma     │
│              Ruth from her daughter's wedding..."        │
│                                                          │
│  [0:07-0:14] "Throughout the years, she's been the      │
│              heart of the family, from playing with      │
│              grandkids in 1995..."                       │
│                                                          │
│  [0:14-0:21] "To passing down traditions, like          │
│              teaching Tommy to fish, in 2024..."        │
│                                                          │
│  Key phrases:                                            │
│  - "Throughout the years..."                            │
│  - "From [time] to [time]..."                          │
│  - "This moment reminds us of..."                       │
│  - "Across decades..."                                  │
│  - "The story of [person]..."                           │
└─────────────────────────────────────────────────────────┘
```

**AI Prompt for Person-Based Albums**:

```
You are creating a narration for a person-based photo album about [Person Name].

This album contains photos from different times and events, all featuring [Person Name].

Key facts about [Person Name]:
- [Facts from knowledge base]

Photos in order:
1. [Photo 1]: [Year] - [Context from story]
2. [Photo 2]: [Year] - [Context from story]
...

Generate a narration that:
- Tells the story of [Person Name] across time
- Uses thematic transitions ("Throughout...", "From... to...")
- Connects moments across years
- Highlights their role in the family
- Each segment is 20-25 words, fitting 7 seconds

Style: Reflective, nostalgic, connecting past to present
```

**Order Still Matters**:
- User can arrange by: chronological, reverse chronological, or thematic
- AI adapts transitions accordingly
- "From her wedding in 1985..." vs "Looking back to 1985..."

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

### 7. Creating Person-Based Albums

**User Flow**:

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: User Creates New Album                         │
├─────────────────────────────────────────────────────────┤
│  "Create New Album"                                      │
│                                                          │
│  ┌─────────────────────────────────────┐               │
│  │ Album Type:                          │               │
│  │ ○ Event Album                        │               │
│  │   (Photos from a specific time/place) │               │
│  │                                       │               │
│  │ ● Person Album                       │               │
│  │   (All photos featuring someone)     │               │
│  └─────────────────────────────────────┘               │
├─────────────────────────────────────────────────────────┤
│  STEP 2: Select Person (if person-based)                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐               │
│  │ Select Person:                       │               │
│  │ [Dropdown: All people in knowledge base]              │
│  │                                       │               │
│  │ ○ Grandma Ruth                      │               │
│  │ ○ Grandpa Bob                       │               │
│  │ ○ Tommy                             │               │
│  │ ○ ...                               │               │
│  └─────────────────────────────────────┘               │
├─────────────────────────────────────────────────────────┤
│  STEP 3: System Queries Photos                         │
├─────────────────────────────────────────────────────────┤
│  SQL:                                                    │
│  SELECT photos.*                                         │
│  FROM photos                                             │
│  JOIN photo_people ON photos.id = photo_people.photo_id │
│  WHERE photo_people.person_id = [selected_person_id]     │
│                                                          │
│  Returns: All photos where person is mentioned or       │
│           visually detected                             │
├─────────────────────────────────────────────────────────┤
│  STEP 4: User Reviews & Orders Photos                  │
├─────────────────────────────────────────────────────────┤
│  Photos shown with dates:                                │
│  - 1985: Wedding photo                                  │
│  - 1995: With grandkids                                 │
│  - 2010: 70th birthday                                  │
│  - 2024: Family reunion                                 │
│  - 2024: Teaching fishing                               │
│                                                          │
│  User can:                                               │
│  - Reorder photos (drag & drop)                        │
│  - Remove photos that don't fit                        │
│  - Add more photos manually                            │
├─────────────────────────────────────────────────────────┤
│  STEP 5: Generate Thematic Narration                    │
├─────────────────────────────────────────────────────────┤
│  AI uses person-based prompt template                   │
│  Output: Thematic story spanning years                  │
└─────────────────────────────────────────────────────────┘
```

**Backend Query Logic**:

```sql
-- Get all photos for a person-based album
SELECT 
  p.id,
  p.original_url,
  p.cleaned_url,
  p.animated_url,
  p.taken_at,
  ps.generated_story,
  ps.who_facts,
  ps.when_facts,
  ps.where_facts
FROM photos p
JOIN photo_people pp ON p.id = pp.photo_id
LEFT JOIN photo_stories ps ON p.id = ps.photo_id
WHERE pp.person_id = $1
  AND (pp.mentioned_in_conversation = true 
       OR pp.visually_detected = true)
ORDER BY p.taken_at ASC;  -- Default: chronological, user can reorder
```

**UI Considerations**:
- Show time span: "Photos from 1985 to 2024 (39 years)"
- Group by decade or year for easier browsing
- Highlight photos with complete stories vs incomplete
- Allow filtering: "Show only photos with stories"

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

> **Principle:** Follow the user journey end-to-end first (MVP), then enhance.
> 
> **User Journey:** Capture → Talk → Extract Facts → Order Photos → Narrate → Watch

---

### Phase 1: Capture & Conversation ✅ COMPLETE
*Goal: User can scan photos and talk about them*

- [x] Next.js app structure
- [x] Gemini Live API integration
- [x] Camera capture with 4-corner detection
- [x] Nano Banana photo extraction
- [x] Basic UI (capture + album modes)
- [x] Supabase integration (events CRUD, schema, capture/album wired to API)
- [x] Photo upload to Supabase Storage + `photos` table (photo–event linking)
- [x] Photo-conversation linking (save transcript to `conversations`/`messages` when session ends)

---

### Phase 2A: Capture Session Flow ✅ COMPLETE
*Goal: Complete the capture UX — user can scan multiple photos, talk, and finish session*

- [x] **"Finish Session" button** — Saves all conversations, navigates to album view
- [x] **Photo status indicators** — Show which photos have been discussed (✓ discussed, 💬 current)
- [x] **Track current photo** — Most recently captured photo is marked as "current"
- [x] **Graceful disconnect** — Ensure all data saved before leaving
- [ ] **Tap photo to switch context** — AI switches to selected photo (Post-MVP)

*Key: Continuous mode — scan/talk freely until user taps "Finish Session"*

---

### Phase 2B: Fact Extraction (Background) ✅ COMPLETE
*Goal: Extract structured facts from conversations (NO narration yet)*

- [x] **Fact extraction API** — `/api/photos/[id]/extract-facts` extracts who/what/when/where/why
- [x] **Conversation summary** — Clean summary generated, filters filler words
- [x] **Completeness scoring** — Calculates % of 5 fact categories filled
- [x] **Trigger on session end** — Runs extraction in background after "Finish Session"
- [x] **Store in `photo_stories`** — Facts + summary stored per photo
- [x] **UI indicator** — Album shows completeness bars + badges on photo cards
- [x] **Photo detail modal** — Click photo to see full facts breakdown

*Key: Store raw ingredients (facts/summary), NOT narration. Narration comes at assembly.*

---

### Phase 3: Album Ordering ✅ COMPLETE
*Goal: User can reorder photos for their narrative*

- [x] **Drag-drop photo reordering** — Horizontal timeline editor with drag-drop
- [x] **Album preview** — See photos in order with summary snippets
- [x] **"Ready for video" indicator** — Shows when 3+ photos in timeline
- [x] **Order persistence** — `PUT /api/events/[id]/reorder` saves order to database
- [x] **Timeline tab** — New tab on album page for editing order
- [x] **Arrow controls** — Click-to-move for accessibility

---

### Phase 4: Order-Aware Narration ✅ COMPLETE
*Goal: AI generates fitted narration based on photo order*

- [x] **Narration generation API** — `POST /api/events/[id]/narration` takes all photos in order
- [x] **Cross-photo inference** — AI fills missing details from album context
- [x] **Transition awareness** — Opening/middle/closing structure, order-based transitions
- [x] **Script segments** — Each segment ~20-25 words, fits 7-second clips
- [x] **Script review UI** — NarrationEditor component with full script preview
- [x] **Editable segments** — Click to edit any segment text manually
- [x] **Regenerate single segment** — `PUT /api/events/[id]/narration/segment` with context awareness
- [x] **Store in `album_narrations`** — `photo_order`, `script_segments`, `full_script`
- [x] **"Narration" tab** — New tab on album page for editing narration

**Bonus: Talk About Photo Later**
- [x] **Photo chat API** — `POST /api/photos/[id]/chat` for simple text chat about a photo
- [x] **Chat history** — `GET /api/photos/[id]/chat` retrieves previous messages
- [x] **PhotoChatPanel** — Full-screen chat UI with photo side-by-side
- [x] **"Tell Your Story" button** — Opens chat from photo modal in album page
- [x] **Save Story** — Triggers fact extraction when done chatting

*Key: One generation pass for entire album = consistent voice, coherent flow.*

---

### Phase 5: Audio & Animation ✅ COMPLETE
*Goal: Photos come alive with animation + voice narration*

- [x] **TTS API** — `POST /api/tts` using Google Cloud TTS REST API
- [x] **Audio generation** — `POST /api/events/[id]/narration/audio` generates audio for all segments
- [x] **Ken Burns animation** — `KenBurnsPhoto` component with mixed zoom/pan effects (randomized per photo)
- [x] **Animation preview modal** — `AnimationPreviewModal` with full playback controls
- [x] **Clickable preview** — Play button on photos in grid, modal, and timeline
- [x] **Audio + animation sync** — Plays audio while animating each photo
- [x] **Progress indicator** — Visual progress bar across segments
- [x] **Store audio URLs** — Saved to `album_narrations.script_segments[].audio_url`
- [x] **NarrationEditor update** — "Generate Audio" button and audio status indicators

*Deferred: Veo premium animation, voice cloning*

---

### Phase 6: Video Output ✅ COMPLETE
*Goal: User gets a shareable video*

- [x] **Video stitching** — Canvas-based recording with MediaRecorder API
- [x] **Ken Burns rendering** — Draws animated frames with zoom/pan effects
- [x] **Narration overlay** — Text displayed at bottom of each frame
- [x] **Audio sync** — Voice narration plays alongside animation
- [x] **Progress indicator** — Real-time progress bar during export
- [x] **Video preview** — Built-in video player to review before download
- [x] **Download** — Download as .webm file
- [x] **Store final video** — `POST /api/events/[id]/video` uploads to storage
- [x] **"Generate Recap Video" button** — Integrated into album page actions

---

## 🎯 Post-MVP: Completed Enhancements

### Phase 7: AI Animation ✅ COMPLETE
*Goal: Photos come alive with AI-powered animation*

- [x] **VEO 3 Integration** — `POST /api/animate-photo` with Gemini VEO 3
- [x] **Grok Imagine Integration** — `POST /api/animate-photo-grok` alternative animation
- [x] **Animation version management** — Multiple versions per photo (VEO 3 + Grok)
- [x] **Version selection UI** — Switch between animation versions in inspector
- [x] **Animation persistence** — `animation_versions` table stores all versions
- [x] **Nano Banana crop in editor** — `POST /api/photos/[id]/enhance` for late cropping
- [x] **Animated badge** — Photos show "Animated" tag in media pool and modal

---

### Phase 8: Album Editor ✅ COMPLETE  
*Goal: Full-featured album editing experience*

- [x] **Netflix-style album cards** — Swimlane layout with hover effects
- [x] **Album settings modal** — Edit name, date, delete with confirmation
- [x] **Media pool** — Scrollable, draggable photos with delete option
- [x] **Timeline drag-drop** — Reorder clips, drag to/from media pool
- [x] **Narration persistence** — Auto-save narration edits to database
- [x] **Video export** — Full VideoExporter component with save to album
- [x] **Export override** — New exports replace previous video (cache-busted URLs)
- [x] **Film Ready tag** — Albums with exported video show badge

---

## 🚀 Hackathon Sprint: Enhancement Phases

### Phase 9A: AI Companion "EVA" ✅ COMPLETE
*Goal: Transform AI into memorable named companion*

- [x] **Aurora orb** — Sticky bottom-right orb, Gemini-style glow + pulse
- [x] **Hover interaction** — Orb pulses/glows on hover, scales up
- [x] **Capture modal** — Click opens centered modal with full capture (camera + Tell Story)
- [x] **EVA naming** — "Add Memory with EVA" and personality in copy
- [x] **Modal layout** — Left: camera/gallery, Right: Gemini Live conversation
- [x] **EVA personality** — Warm, conversational tone in AI system prompt

*Completed!*

📄 **Full spec**: See `docs/EVA_IMPLEMENTATION.md` for detailed design, layout, and future agent mode.

---

### Phase 9B: Voice Cloning 🎯 PLANNED
*Goal: Narration sounds like the person, not robotic TTS*

- [ ] **Voice sample upload** — UI to record/upload 30+ second sample
- [ ] **ElevenLabs integration** — API to create voice clone
- [ ] **Clone management** — Store voice clone ID per user/album
- [ ] **Voice selection** — Choose cloned voice or default TTS
- [ ] **Narration with clone** — Generate audio using cloned voice
- [ ] **Fallback handling** — Graceful fallback if clone unavailable

*Estimated: 1 day*

---

### Phase 9C: Better Question Quality 🎯 PLANNED
*Goal: AI asks smarter, observation-based questions*

- [ ] **Image analysis first** — Detect objects, people, setting, era clues
- [ ] **Observation questions** — "I see candles on a cake - whose birthday?"
- [ ] **Memory-aware framing** — "What do you know about..." vs "Do you remember..."
- [ ] **Pivot on uncertainty** — "Who might remember this moment?"
- [ ] **Context injection** — Use existing facts to inform questions
- [ ] **Relationship focus** — Ask about connections, not just events

*Estimated: 2-4 hours (prompt engineering)*

---

## 🔮 Future: Post-Hackathon Phases

### Phase 10: Knowledge Base
*Goal: Persistent AI memory across conversations*

- [ ] Person knowledge base (link names → `people` table)
- [ ] Vector storage for facts (pgvector or Pinecone)
- [ ] RAG retrieval during conversations
- [ ] Context injection (feed existing facts to Gemini Live)
- [ ] Cross-album context sharing
- [ ] Conflict resolution when facts contradict

---

### Phase 11: Multi-User & Collaboration
*Goal: Family members contribute together*

- [ ] User authentication/accounts
- [ ] Album permissions (view, contribute, admin)
- [ ] Multiple stories per photo (different perspectives)
- [ ] Combined recap showing all perspectives
- [ ] Shared album invitations
- [ ] Activity feed for contributions

---

### Phase 12: Premium Features
*Goal: Advanced customization options*

- [ ] Custom scrapbook builder (drag-drop layout)
- [ ] Immortalized calligraphy (handwriting fonts)
- [ ] Family tree detection from conversations
- [ ] Face detection + auto-tagging
- [ ] Memory timeline visualization
- [ ] Music/soundtrack generation

---

### Phase 13: Polish & Scale
*Goal: Production-ready quality*

- [ ] Mobile optimization
- [ ] Duplicate photo detection
- [ ] Batch photo import
- [ ] Storage cost optimization
- [ ] Offline mode
- [ ] Multi-language support
- [ ] Photo restoration (AI enhancement)

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

6. **Album Type Selection**: 
   - Should users choose album type when creating?
   - Or auto-detect based on photo selection?
   - Can albums be converted between types?

7. **Person-Based Album Creation**:
   - How to select "all photos with Grandma"?
   - Auto-suggest based on photo_people table?
   - Manual selection with person filter?

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

## 🔮 Beyond MVP: Future Considerations

> **Note**: These are edge cases, blind spots, and enhancements identified during planning. They are **NOT** part of the hackathon MVP scope but should be considered for post-MVP development.

### Critical Edge Cases

#### 1. Duplicate Photo Detection
**Problem**: Same photo scanned multiple times, or same photo appears in multiple albums.

**Impact**: Data bloat, confusion, wasted storage.

**MVP Workaround**: Basic image hashing comparison before storage.

**Future Solution**: Advanced similarity detection, duplicate grouping UI, "already scanned" warnings.

---

#### 2. Conversation Conflicts
**Problem**: Two people tell different stories about the same photo.

**Impact**: Which story is "correct"? How to handle conflicting narratives?

**MVP Workaround**: Store both conversations, mark as "multiple perspectives", let user choose primary.

**Future Solution**: Conflict resolution UI, merge stories, version comparison, "most complete" auto-selection.

---

#### 3. Photo Quality Issues
**Problem**: Blurry, damaged, or unreadable photos.

**Impact**: Poor extraction, bad animations, unusable content.

**MVP Workaround**: Basic quality check, suggest re-scanning if below threshold.

**Future Solution**: AI photo restoration, quality scoring, auto-enhancement options.

---

#### 4. Privacy & Sensitive Information
**Problem**: Conversations may contain private details, health issues, family conflicts.

**Impact**: Legal/ethical concerns, privacy violations.

**MVP Workaround**: User review before publishing, basic content warnings.

**Future Solution**: Content moderation, privacy filters, granular sharing controls, sensitive content detection.

---

#### 5. Storage Costs at Scale
**Problem**: Large albums, high-res photos, video files add up quickly.

**Impact**: Expensive infrastructure, user quotas needed.

**MVP Workaround**: Use free tiers, compress images, limit album sizes.

**Future Solution**: Tiered storage, compression optimization, user quotas, pay-per-use model.

---

### Technical Considerations

#### 6. Multi-Language Support
**Problem**: Conversations in different languages (e.g., Grandma speaks Spanish, kids speak English).

**Impact**: Narration generation, TTS, story extraction.

**MVP Workaround**: English only, detect language and warn.

**Future Solution**: Multi-language TTS, translation for narration, language detection per conversation.

---

#### 7. EXIF Metadata Conflicts
**Problem**: Photos already have dates/locations in EXIF data.

**Impact**: Conflicting information between EXIF and conversation.

**MVP Workaround**: Use EXIF as default, allow user override.

**Future Solution**: Smart merging, confidence scoring, "most likely" inference.

---

#### 8. Incomplete Albums
**Problem**: User starts album, never finishes, or abandons mid-conversation.

**Impact**: Orphaned data, storage waste, confusion.

**MVP Workaround**: Auto-save drafts, basic cleanup.

**Future Solution**: "Continue later" prompts, auto-archive incomplete albums, cleanup policies.

---

#### 9. Photo Ownership & Permissions
**Problem**: Who can edit/delete photos? Who owns the conversation?

**Impact**: Collaboration conflicts, data loss.

**MVP Workaround**: Simple owner/contributor model.

**Future Solution**: Role-based permissions (owner, editor, viewer), granular controls, audit logs.

---

#### 10. Batch Processing
**Problem**: User wants to scan 50 photos at once.

**Impact**: Current flow is one-at-a-time, slow.

**MVP Workaround**: Manual one-by-one scanning.

**Future Solution**: Batch upload, queue system, progress tracking, background processing.

---

#### 11. Offline Mode
**Problem**: Poor connectivity during scanning (e.g., scanning old photos in basement).

**Impact**: Can't use Live API, can't save.

**MVP Workaround**: Requires internet connection.

**Future Solution**: Local storage, sync when online, queue uploads, offline conversation mode.

---

#### 12. Photo Formats & Sources
**Problem**: Old physical photos vs digital uploads vs screenshots.

**Impact**: Different processing needs, quality variations.

**MVP Workaround**: Focus on physical photo scanning.

**Future Solution**: Support multiple input methods, format normalization, source detection.

---

#### 13. Temporal Context Errors
**Problem**: Photo date is wrong or unknown.

**Impact**: Incorrect timeline, wrong context.

**MVP Workaround**: User provides date in conversation.

**Future Solution**: AI date inference from conversation, visual analysis, user correction UI.

---

#### 14. Story Accuracy & Hallucinations
**Problem**: AI misinterprets conversation or makes up details.

**Impact**: Incorrect stories, loss of trust.

**MVP Workaround**: User review step, edit capability.

**Future Solution**: Fact-checking prompts, confidence scores, source attribution, edit history.

---

### UX Enhancements

#### 15. Voice Cloning Consent
**Problem**: Do all family members consent to voice cloning?

**Impact**: Privacy, ethical concerns.

**MVP Workaround**: Explicit opt-in, use default voice if declined.

**Future Solution**: Per-person consent, voice sample approval workflow, revocation options.

---

#### 16. Album Sharing & Collaboration
**Problem**: Who can see/edit? Public vs private? Share links?

**Impact**: Privacy, collaboration needs.

**MVP Workaround**: Basic private albums, simple invite system.

**Future Solution**: Granular permissions, public/private/unlisted, share links with expiration, collaboration features.

---

#### 17. Version Control
**Problem**: User wants to regenerate narration with different order.

**Impact**: Losing previous versions, can't compare.

**MVP Workaround**: Overwrite previous narration.

**Future Solution**: Save multiple versions, "Create new version" button, version comparison, rollback.

---

#### 18. Photo Restoration
**Problem**: Damaged/old photos that need restoration.

**Impact**: Poor quality, unusable.

**MVP Workaround**: Use as-is, or suggest professional restoration.

**Future Solution**: Optional AI restoration step before extraction, quality enhancement.

---

#### 19. Conversation Editing
**Problem**: Can users edit/delete conversations after storing?

**Impact**: Mistakes, changing stories, data integrity.

**MVP Workaround**: Basic edit/delete, no history.

**Future Solution**: Edit history, soft delete, "undo" functionality, version tracking.

---

### Business/Legal Considerations

#### 20. Data Retention & Legacy
**Problem**: How long to keep data? What if user dies? Inheritance?

**Impact**: Long-term storage, family legacy.

**MVP Workaround**: Standard data retention policies.

**Future Solution**: Data export, inheritance/legacy access, "digital will" features, long-term archival.

---

#### 21. Copyright & Ownership
**Problem**: Who owns generated content? Can it be commercialized?

**Impact**: Legal clarity, user rights.

**MVP Workaround**: User owns outputs (standard ToS).

**Future Solution**: Explicit ownership terms, licensing options, commercial use policies.

---

#### 22. GDPR/Privacy Compliance
**Problem**: EU users, data portability, right to deletion.

**Impact**: Legal requirements, user rights.

**MVP Workaround**: Basic privacy controls.

**Future Solution**: Full GDPR compliance, data export, deletion workflows, consent management.

---

#### 23. Cost Overruns
**Problem**: User generates many Veo animations, exceeds budget.

**Impact**: Unexpected costs, user frustration.

**MVP Workaround**: Usage limits, cost warnings.

**Future Solution**: Pay-per-use model, usage dashboards, budget alerts, tiered pricing.

---

### Edge Cases

#### 24. Empty Albums
**Problem**: Album created but no photos added.

**Impact**: Confusion, clutter.

**MVP Workaround**: Manual deletion.

**Future Solution**: Auto-delete after X days, or convert to draft, "start adding photos" prompts.

---

#### 25. Single-Photo Albums
**Problem**: Only one photo in album.

**Impact**: Narration doesn't need transitions.

**MVP Workaround**: Special handling in narration generation.

**Future Solution**: Single-photo narration templates, "add more photos" suggestions.

---

#### 26. Photos Without People
**Problem**: Landscape photos, objects, no faces.

**Impact**: Person-based albums can't include these.

**MVP Workaround**: Filter out, or allow with "no people" tag.

**Future Solution**: Object/place-based albums, alternative organization methods.

---

#### 27. Very Old Photos
**Problem**: Photos from 1800s, no context available.

**Impact**: Limited story extraction.

**MVP Workaround**: Accept "unknown" facts, focus on what can be extracted.

**Future Solution**: Historical context AI, period-appropriate narration, research integration.

---

#### 28. Group Photos
**Problem**: 20+ people in one photo.

**Impact**: Tagging becomes overwhelming.

**MVP Workaround**: Tag key people only.

**Future Solution**: "Key people" selection, auto-face detection with suggestions, group tagging.

---

#### 29. Video Clips
**Problem**: User wants to include video clips, not just photos.

**Impact**: Current system is photo-only.

**MVP Workaround**: Not supported.

**Future Solution**: Video upload support, frame extraction, or full video integration in albums.

---

#### 30. Cross-Album Context
**Problem**: Same person appears in multiple albums, context should be shared.

**Impact**: Knowledge base should be global, not per-album.

**MVP Workaround**: Basic cross-album knowledge sharing.

**Future Solution**: Global knowledge graph, cross-album references, unified person profiles.

---

### Prioritization for Post-MVP

**High Priority** (Address soon after MVP):
1. Duplicate photo detection
2. Conversation conflicts handling
3. Privacy & sensitive information
4. Photo quality issues
5. Storage cost optimization

**Medium Priority** (Next phase):
6. Multi-language support
7. Batch processing
8. Album sharing & collaboration
9. Version control
10. Offline mode

**Low Priority** (Nice to have):
11. Photo restoration
12. Video clips support
13. Advanced permissions
14. Legacy/inheritance features
15. Commercial use options

---

## Post-MVP Feature Ideas

### Hackathon Priority Features (Recommended)

#### 1. AI Companion "EVA" / "The Guide"
**Status**: ✅ RECOMMENDED FOR HACKATHON

**Concept**: Transform the AI from a generic assistant into a named, personified companion with emotional presence. Inspired by the "Eulogy" episode of Black Mirror.

**Implementation Details**:
- Name the AI "EVA" (or "The Guide") throughout the app
- Add floating aurora/animated UI effect (like Gemini's visual presence)
- Interactive hover states that make EVA feel "alive"
- Convert capture from separate page (`/capture/id`) to modal overlay on `/album/[id]`
- Give EVA a personality with intro messages and contextual responses

**Why High Priority**:
- Extremely high demo visibility - judges see it immediately
- Transforms "photo app" into "AI companion experience"
- Relatively low implementation effort (1-2 days)
- Memorable branding for hackathon presentation

**Technical Approach**:
- CSS animations for aurora effect
- Framer Motion for interactive animations
- Modal component for capture flow
- Consistent naming/personality in all AI responses

---

#### 2. Voice Cloning for Narration
**Status**: ✅ RECOMMENDED FOR HACKATHON

**Concept**: Use voice cloning (ElevenLabs) so narration sounds like the person telling the story, not robotic TTS.

**Implementation Details**:
- User uploads voice sample (30 seconds minimum)
- ElevenLabs creates voice clone
- Narration generated using cloned voice
- Option to use default voice or cloned voice per album

**Why High Priority**:
- Massive emotional impact - hearing "grandma" narrate her own story
- Clear demo moment that creates emotional response
- Medium implementation effort (1 day with ElevenLabs API)
- Schema already has `voice_clone_id` fields ready

**Technical Approach**:
- ElevenLabs API integration
- Voice sample upload/storage in Supabase
- Voice selection UI in album settings
- Fallback to default TTS if no clone available

---

#### 3. Better Question Quality (Prompt Engineering)
**Status**: ✅ RECOMMENDED FOR HACKATHON

**Concept**: Improve AI conversation quality by making observations about the image rather than assuming user remembers everything.

**Current Problem**:
- AI asks "Do you remember when this was?" for childhood photos
- User often doesn't remember details from when they were young
- Questions don't leverage visual observations from the image

**Improved Approach**:
- Analyze image first: objects, people count, setting, era clues, clothing, decorations
- Generate observation-based questions: "I see candles on a cake - whose birthday was this?"
- If user says "I don't remember", pivot to: "Who might remember this moment?"
- Contextual awareness: ask about relationships, not just events
- Frame questions as "What do you know about..." rather than "Do you remember..."

**Why High Priority**:
- Low effort (prompt engineering only, 2-4 hours)
- Improves quality of every demo conversation
- Shows sophisticated AI understanding
- No infrastructure changes needed

---

### Future Feature Ideas (Post-Hackathon)

#### 4. Knowledge Base Implementation
**Status**: 🔮 FUTURE (Not for hackathon)

**Concept**: Persistent memory across conversations and albums. AI remembers facts about people, places, and relationships.

**Why Deferred**:
- Not visible in short demo
- Requires vector DB, embedding pipeline
- Medium-hard implementation
- Benefits emerge over long-term use

**Implementation Notes**:
- Vector storage for facts (Pinecone, Supabase pgvector)
- RAG retrieval during conversations
- Cross-album fact sharing
- Conflict resolution when facts contradict

---

#### 5. Multi-User Accounts & Perspectives
**Status**: 🔮 FUTURE (Not for hackathon)

**Concept**: Multiple family members can contribute stories to the same photo. Different perspectives enrich the narrative.

**Features**:
- User authentication/accounts
- Photo permissions (view, contribute, admin)
- Multiple stories per photo from different users
- Combined recap showing all perspectives
- Admin controls timeline/album composition

**Why Deferred**:
- Very complex (3-5 days minimum)
- Requires full auth system
- Hard to demo in 2-3 minutes
- High risk of bugs/edge cases

---

#### 6. Custom Scrapbook Builder
**Status**: 🔮 FUTURE (Not for hackathon)

**Concept**: Interactive scrapbook-style layout where users can arrange animated photos, add decorations, customize look and feel.

**Features**:
- Book-style page turning interface
- Drag-and-drop photo placement
- Decorative elements (stickers, frames, backgrounds)
- Text annotations with custom fonts
- Export as PDF or interactive digital book

**Why Deferred**:
- Very complex UI work (1-2 weeks)
- High effort for presentation
- Scope creep risk

---

#### 7. Immortalized Calligraphy
**Status**: 🔮 FUTURE (Not for hackathon)

**Concept**: Scan handwriting samples to create custom fonts. Stories displayed in the person's actual handwriting.

**Features**:
- Upload handwriting sample (journal page, letters)
- AI generates custom font from handwriting
- Per-user fonts for multi-user albums
- Use handwriting font in scrapbook/titles

**Why Deferred**:
- Very hard ML problem (font generation)
- High risk of poor quality results
- Requires significant R&D
- Cool concept but hard to execute well

---

#### 8. Memory Timeline Visualization
**Status**: 🔮 FUTURE (Maybe for hackathon if time permits)

**Concept**: Beautiful vertical timeline showing life's memories organized by date, expandable on hover.

**Features**:
- Vertical timeline component
- Cluster albums by year/decade
- Hover preview, click to expand
- Visual representation of life's moments

**Why Potentially Deferred**:
- Albums may not have linear timelines (e.g., childhood memories with random undated photos)
- Users may not remember exact dates
- Could be confusing for non-chronological albums
- Medium effort (4-6 hours) but uncertain UX value

**Consideration**: Could work for dated albums, but would need graceful handling of albums without clear dates.

---

#### 9. Family Tree Detection
**Status**: 🔮 FUTURE (Not for hackathon)

**Concept**: AI builds family tree from conversations, detecting relationships and connecting people across photos.

**Features**:
- Extract relationships from conversations ("That's my grandmother")
- Build visual family tree
- Face recognition to connect people across albums
- Knowledge base integration for persistent relationships
- Auto-suggest relationships based on detected patterns

**Why Deferred**:
- Requires knowledge base first
- Complex relationship modeling
- Face recognition adds complexity
- Very ambitious scope

---

### Post-MVP Priority Matrix

| Feature | Effort | Wow Factor | Demo Visible | Risk | Hackathon? |
|---------|--------|------------|--------------|------|------------|
| AI Companion (EVA) | Medium | ⭐⭐⭐⭐⭐ | Very High | Low | ✅ YES |
| Voice Cloning | Medium | ⭐⭐⭐⭐⭐ | Very High | Medium | ✅ YES |
| Better Questions | Easy | ⭐⭐⭐ | Medium | Low | ✅ YES |
| Knowledge Base | Hard | ⭐⭐ | Low | Medium | ❌ No |
| Multi-User | Very Hard | ⭐⭐⭐ | Low | High | ❌ No |
| Scrapbook | Very Hard | ⭐⭐⭐⭐ | High | High | ❌ No |
| Calligraphy | Very Hard | ⭐⭐⭐⭐ | Medium | Very High | ❌ No |
| Timeline View | Medium | ⭐⭐⭐ | High | Medium | ⚠️ Maybe |
| Family Tree | Very Hard | ⭐⭐⭐⭐ | Medium | High | ❌ No |

### Recommended Hackathon Sprint

**Day 1 AM**: EVA naming + personality (all UI references, intro messages)
**Day 1 PM**: Aurora floating UI effect (animated EVA button/avatar)
**Day 2 AM**: Voice cloning integration (ElevenLabs)
**Day 2 PM**: Better prompts + polish (improved questions, bug fixes)

---

*This document is a living plan. Update as decisions are made.*
