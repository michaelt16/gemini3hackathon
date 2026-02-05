-- ============================================
-- Migration: Animation Versions
-- Store multiple animation versions per photo (VEO3, Grok, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS animation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,                  -- Supabase Storage URL
  type TEXT NOT NULL,                 -- 'veo3' | 'grok-imagine'
  is_selected BOOLEAN DEFAULT false,  -- Currently selected version for this photo
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by photo
CREATE INDEX IF NOT EXISTS idx_animation_versions_photo ON animation_versions(photo_id);

-- Ensure only one version is selected per photo
CREATE UNIQUE INDEX IF NOT EXISTS idx_animation_versions_selected 
  ON animation_versions(photo_id) 
  WHERE is_selected = true;

COMMENT ON TABLE animation_versions IS 'Multiple animation versions per photo. The is_selected version is used for playback/export.';
