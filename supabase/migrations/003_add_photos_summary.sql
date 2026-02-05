-- Add summary column to photos table for story/conversation summary
-- (extract-facts API saves here; photos API reads it)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS summary TEXT;
