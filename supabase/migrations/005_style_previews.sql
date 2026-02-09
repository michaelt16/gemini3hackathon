-- Style previews: stores style-transferred images (Disney, Ghibli, Anime etc.)
-- generated before animation, so users can pick their favorite.

CREATE TABLE IF NOT EXISTS style_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

  style_id TEXT NOT NULL,              -- 'disney' | 'ghibli' | 'anime' etc.
  image_url TEXT NOT NULL,             -- Supabase Storage public URL
  is_selected BOOLEAN DEFAULT false,   -- Currently selected preview for this photo+style
  model TEXT,                          -- Which Gemini model generated it

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_style_previews_photo ON style_previews(photo_id);
CREATE INDEX IF NOT EXISTS idx_style_previews_photo_style ON style_previews(photo_id, style_id);
