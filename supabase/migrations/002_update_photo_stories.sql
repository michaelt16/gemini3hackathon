-- ============================================
-- Migration: Update photo_stories table
-- Adds conversation_summary and emotional_tone columns
-- Removes generated_story (narration now generated at album assembly)
-- ============================================

-- Add new columns
ALTER TABLE photo_stories 
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS emotional_tone JSONB;

-- Remove old column (if it exists)
-- Note: Only run this if you haven't stored data in generated_story yet
-- ALTER TABLE photo_stories DROP COLUMN IF EXISTS generated_story;

-- Comment explaining the change
COMMENT ON TABLE photo_stories IS 'Stores extracted facts + summary from conversations. Narration is generated at album assembly time, not per-photo.';
COMMENT ON COLUMN photo_stories.conversation_summary IS 'Clean summary of what user said (no filler words)';
COMMENT ON COLUMN photo_stories.emotional_tone IS 'Array of emotions/significance e.g. ["proud", "nostalgic"]';
