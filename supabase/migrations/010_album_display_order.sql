-- Migration 010: Add display_order to events for persistent album ordering
-- Allows users to drag-reorder albums and persist that order across sessions

ALTER TABLE events ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set initial display_order based on created_at (most recent = lowest number = shown first)
-- This preserves the current default ordering
UPDATE events SET display_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM events
) sub
WHERE events.id = sub.id;
