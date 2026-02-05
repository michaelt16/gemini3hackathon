-- ============================================
-- Living Memory - Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable pgvector for face embeddings (optional, can skip if not using face recognition)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- USERS (must come first - referenced by other tables)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
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
-- PEOPLE (must come before events due to person_id reference)
-- ============================================

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  nicknames TEXT[],                -- ["Grandpa", "Bob", "Pops"]
  avatar_url TEXT,
  
  -- Relationships
  relationships JSONB,             -- {"father_of": ["Dad"], "married_to": "Ruth"}
  
  -- Accumulated facts from conversations
  facts JSONB[],                   -- ["born 1944", "loves fishing", ...]
  
  -- Optional: Face recognition (uncomment if using pgvector)
  -- face_embedding VECTOR(512),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENTS (Albums)
-- ============================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  album_type TEXT NOT NULL DEFAULT 'event',  -- 'event' | 'person' | 'theme'
  
  -- Event-specific fields (nullable if person-based)
  date_start DATE,
  date_end DATE,
  location TEXT,
  
  -- Person-specific fields (nullable if event-based)
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  
  -- Common fields
  summary TEXT,                    -- AI-generated album summary
  cover_photo_id UUID,             -- Will add FK after photos table exists
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHOTOS
-- ============================================

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
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

-- Add FK from events.cover_photo_id to photos
ALTER TABLE events 
  ADD CONSTRAINT fk_cover_photo 
  FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

-- ============================================
-- CONVERSATIONS & MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  transcript TEXT,                 -- Full conversation JSON
  audio_url TEXT,                  -- Original audio (for voice cloning)
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,              -- 'user' | 'assistant'
  content TEXT NOT NULL,
  timestamp_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHOTO STORIES (extracted from conversations)
-- ============================================

-- NOTE: Stores facts + summary, NOT narration. Narration generated at album assembly.
CREATE TABLE IF NOT EXISTS photo_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  
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
-- PHOTO-PEOPLE JUNCTION
-- ============================================

CREATE TABLE IF NOT EXISTS photo_people (
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  
  mentioned_in_conversation BOOLEAN DEFAULT false,
  visually_detected BOOLEAN DEFAULT false,
  confidence FLOAT,
  bbox JSONB,                      -- {x, y, width, height}
  
  PRIMARY KEY (photo_id, person_id)
);

-- ============================================
-- ALBUM NARRATIONS (final output)
-- ============================================

CREATE TABLE IF NOT EXISTS album_narrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
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
-- JOBS (Background Processing)
-- ============================================

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,              -- 'extract' | 'animate' | 'stitch' | 'tts'
  status TEXT DEFAULT 'queued',    -- 'queued' | 'running' | 'done' | 'error'
  
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  
  progress INTEGER DEFAULT 0,      -- 0-100
  result_url TEXT,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for common queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(event_id, order_in_album);
CREATE INDEX IF NOT EXISTS idx_conversations_photo ON conversations(photo_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_photo_stories_photo ON photo_stories(photo_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_event ON jobs(event_id);

-- ============================================
-- ROW LEVEL SECURITY (optional, enable later)
-- ============================================

-- For now, we're using service role key which bypasses RLS.
-- When adding auth, enable RLS on tables and add policies:
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own events" ON events FOR SELECT USING (auth.uid() = created_by);
