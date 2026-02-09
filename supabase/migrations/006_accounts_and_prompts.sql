-- Migration 006: Family members (accounts), family prompts updates, album members updates
-- Enables account switching and real question flow between family members

-- ============================================================================
-- FAMILY MEMBERS (accounts for profile switching)
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL DEFAULT 'demo123',
  avatar_color TEXT NOT NULL DEFAULT '#60a5fa',
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADD to_member_id to family_prompts (if it doesn't exist)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_prompts' AND column_name = 'to_member_id'
  ) THEN
    ALTER TABLE family_prompts ADD COLUMN to_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- ADD member_id to album_members (if it doesn't exist)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'album_members' AND column_name = 'member_id'
  ) THEN
    ALTER TABLE album_members ADD COLUMN member_id UUID REFERENCES family_members(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- SEED: 4 pre-seeded family member accounts
-- ============================================================================
INSERT INTO family_members (id, name, email, password, avatar_color, relationship) VALUES
  ('00000000-0000-0000-0000-000000000001', 'You',     'you@family.com',     'demo123', '#8b5cf6', 'Self'),
  ('00000000-0000-0000-0000-000000000002', 'James',   'dad@family.com',     'demo123', '#3b82f6', 'Father'),
  ('00000000-0000-0000-0000-000000000003', 'Susan',   'mom@family.com',     'demo123', '#ec4899', 'Mother'),
  ('00000000-0000-0000-0000-000000000004', 'William', 'grandpa@family.com', 'demo123', '#10b981', 'Grandfather')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SEED: Update existing album_members rows with member_id where name matches
-- ============================================================================
UPDATE album_members SET member_id = fm.id
FROM family_members fm
WHERE album_members.name = fm.name AND album_members.member_id IS NULL;

-- ============================================================================
-- SEED: Update existing family_prompts with to_member_id for demo data
-- ============================================================================
DO $$
DECLARE
  v_event_id UUID;
  v_photo_id UUID;
  v_you UUID := '00000000-0000-0000-0000-000000000001';
  v_dad UUID := '00000000-0000-0000-0000-000000000002';
  v_mom UUID := '00000000-0000-0000-0000-000000000003';
  v_grandpa UUID := '00000000-0000-0000-0000-000000000004';
BEGIN
  -- Get the first event
  SELECT id INTO v_event_id FROM events LIMIT 1;
  IF v_event_id IS NOT NULL THEN
    SELECT id INTO v_photo_id FROM photos WHERE event_id = v_event_id LIMIT 1;
  END IF;

  -- Update existing prompts that have from_member_id but no to_member_id
  -- (Set to_member_id = "You" for prompts where from_member_id is someone else)
  UPDATE family_prompts
  SET to_member_id = v_you
  WHERE to_member_id IS NULL
    AND from_member_id IS NOT NULL
    AND from_member_id != v_you;

  -- Set to_member_id for prompts from "You" to various family members
  UPDATE family_prompts
  SET to_member_id = v_grandpa
  WHERE to_member_id IS NULL
    AND from_member_id = v_you
    AND question ILIKE '%grandpa%';

  UPDATE family_prompts
  SET to_member_id = v_dad
  WHERE to_member_id IS NULL
    AND from_member_id = v_you
    AND (question ILIKE '%dad%' OR question ILIKE '%year%');

  -- Any remaining prompts from "You" without a target, send to Mom
  UPDATE family_prompts
  SET to_member_id = v_mom
  WHERE to_member_id IS NULL
    AND from_member_id = v_you;

  -- If no prompts exist at all, seed some
  IF NOT EXISTS (SELECT 1 FROM family_prompts WHERE to_member_id IS NOT NULL LIMIT 1) AND v_event_id IS NOT NULL THEN
    -- Question from You to Grandpa (unanswered)
    INSERT INTO family_prompts (event_id, from_member_id, to_member_id, photo_id, question, question_type)
    VALUES (v_event_id, v_you, v_grandpa, v_photo_id,
            'Grandpa, who is the person standing next to you in this photo? I don''t recognize them.', 'photo');

    -- Question from You to Dad (unanswered)
    INSERT INTO family_prompts (event_id, from_member_id, to_member_id, photo_id, question, question_type)
    VALUES (v_event_id, v_you, v_dad, v_photo_id,
            'Dad, do you remember what year this was taken? Mom thinks it was 1995 but I''m not sure.', 'photo');

    -- Question from Mom to You (unanswered - You needs to answer this)
    INSERT INTO family_prompts (event_id, from_member_id, to_member_id, photo_id, question, question_type)
    VALUES (v_event_id, v_mom, v_you, v_photo_id,
            'Honey, can you tell me more about this day? I remember it being really special but the details are fuzzy.', 'photo');

    -- Question from Dad to You (unanswered)
    INSERT INTO family_prompts (event_id, from_member_id, to_member_id, question, question_type)
    VALUES (v_event_id, v_dad, v_you,
            'Do you still have the recipe for that cake we made together? I''d love to make it again.', 'general');

    -- Answered: Grandpa to Mom
    INSERT INTO family_prompts (event_id, from_member_id, to_member_id, question, question_type, answer_text, answered_at)
    VALUES (v_event_id, v_grandpa, v_mom,
            'Susan, do you remember the name of that restaurant we all went to for your birthday?', 'general',
            'It was called "The Garden Table" on Main Street! They had the most amazing pasta.', NOW() - INTERVAL '2 days');

    -- Answered: Dad to Grandpa
    INSERT INTO family_prompts (event_id, from_member_id, to_member_id, question, question_type, answer_text, answered_at)
    VALUES (v_event_id, v_dad, v_grandpa,
            'Dad, what was the name of your first car? I remember it being blue.', 'general',
            'It was a 1957 Chevy Bel Air, powder blue! Your mother and I drove it on our first date.', NOW() - INTERVAL '5 days');
  END IF;
END $$;
