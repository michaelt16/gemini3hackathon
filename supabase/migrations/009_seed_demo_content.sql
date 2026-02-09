-- Migration 009: Seed demo content for a fully functional feed
-- Creates events, photos, animations, conversations, album_members, and feed questions
-- All linked to FAMILY2024 family via the 4 seeded family members

-- ============================================================================
-- Ensure family_member UUIDs exist in users table (satisfy FK on photos/conversations)
-- ============================================================================
INSERT INTO users (id, email, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'michael@family.com', 'Michael'),
  ('00000000-0000-0000-0000-000000000002', 'dad@family.com', 'James'),
  ('00000000-0000-0000-0000-000000000003', 'mom@family.com', 'Susan'),
  ('00000000-0000-0000-0000-000000000004', 'grandpa@family.com', 'William')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EVENTS (7 demo albums)
-- ============================================================================
INSERT INTO events (id, title, album_type, location, created_by, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Summer BBQ 2024',      'event', 'Backyard',          '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'),
  ('10000000-0000-0000-0000-000000000002', 'Christmas 2023',       'event', NULL,                 '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '8 hours'),
  ('10000000-0000-0000-0000-000000000003', 'Family Reunion',       'event', NULL,                 '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day'),
  ('10000000-0000-0000-0000-000000000004', 'Old Times',            'event', NULL,                 '00000000-0000-0000-0000-000000000004', NOW() - INTERVAL '12 hours'),
  ('10000000-0000-0000-0000-000000000005', 'Beach Trip 2024',      'event', 'Malibu, CA',         '00000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 hours'),
  ('10000000-0000-0000-0000-000000000006', 'Graduation Day',       'event', NULL,                 '00000000-0000-0000-0000-000000000001', NOW() - INTERVAL '40 minutes'),
  ('10000000-0000-0000-0000-000000000007', 'Wedding Anniversary',  'event', 'The Garden Venue',   '00000000-0000-0000-0000-000000000004', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ============================================================================
-- PHOTOS (10 photos across the albums)
-- Using /public static assets as URLs (served by Next.js)
-- ============================================================================
INSERT INTO photos (id, event_id, uploader_id, original_url, thumbnail_url, order_in_album, created_at) VALUES
  -- Summer BBQ 2024 (pic1, pic7, pic8)
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '/pic1.PNG',      '/pic1.PNG',      1, NOW() - INTERVAL '5 minutes'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '/pic7.jpg',      '/pic7.jpg',      2, NOW() - INTERVAL '5 hours'),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '/pic8.jpg',      '/pic8.jpg',      3, NOW() - INTERVAL '6 hours'),
  -- Christmas 2023 (pic3, pic6)
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '/pic3.PNG',      '/pic3.PNG',      1, NOW() - INTERVAL '25 minutes'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '/pic6.jpg',      '/pic6.jpg',      2, NOW() - INTERVAL '18 hours'),
  -- Family Reunion (pic5)
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '/pic5.jpg',      '/pic5.jpg',      1, NOW() - INTERVAL '1 hour'),
  -- Old Times (pic2, pic9)
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '/pic2.PNG',      '/pic2.PNG',      1, NOW() - INTERVAL '90 minutes'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '/pic9.jpg',      '/pic9.jpg',      2, NOW() - INTERVAL '2 hours'),
  -- Graduation Day (pic4)
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '/pic4.PNG',      '/pic4.PNG',      1, NOW() - INTERVAL '40 minutes'),
  -- Beach Trip 2024 (testphoto)
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '/testphoto.jpg', '/testphoto.jpg', 1, NOW() - INTERVAL '36 hours')
ON CONFLICT (id) DO UPDATE SET original_url = EXCLUDED.original_url;

-- Set cover photos and video_url on events (video = the cover photo's animation)
UPDATE events SET cover_photo_id = '20000000-0000-0000-0000-000000000001', video_url = '/animations/pic1.mp4' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE events SET cover_photo_id = '20000000-0000-0000-0000-000000000003', video_url = '/animations/pic3.mp4' WHERE id = '10000000-0000-0000-0000-000000000002';
UPDATE events SET cover_photo_id = '20000000-0000-0000-0000-000000000005', video_url = '/animations/pic5.mp4' WHERE id = '10000000-0000-0000-0000-000000000003';
UPDATE events SET cover_photo_id = '20000000-0000-0000-0000-000000000002', video_url = '/animations/pic2.mp4' WHERE id = '10000000-0000-0000-0000-000000000004';
UPDATE events SET cover_photo_id = '20000000-0000-0000-0000-000000000010', video_url = '/animations/testphoto.mp4' WHERE id = '10000000-0000-0000-0000-000000000005';
UPDATE events SET cover_photo_id = '20000000-0000-0000-0000-000000000004', video_url = '/animations/pic4.mp4' WHERE id = '10000000-0000-0000-0000-000000000006';
UPDATE events SET cover_photo_id = '20000000-0000-0000-0000-000000000010', video_url = '/animations/testphoto.mp4' WHERE id = '10000000-0000-0000-0000-000000000007';

-- Set animated_url on photos that have animations
UPDATE photos SET animated_url = '/animations/pic1.mp4' WHERE id = '20000000-0000-0000-0000-000000000001';
UPDATE photos SET animated_url = '/animations/pic2.mp4' WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE photos SET animated_url = '/animations/pic3.mp4' WHERE id = '20000000-0000-0000-0000-000000000003';
UPDATE photos SET animated_url = '/animations/pic4.mp4' WHERE id = '20000000-0000-0000-0000-000000000004';
UPDATE photos SET animated_url = '/animations/pic5.mp4' WHERE id = '20000000-0000-0000-0000-000000000005';
UPDATE photos SET animated_url = '/animations/pic6.mp4' WHERE id = '20000000-0000-0000-0000-000000000006';
UPDATE photos SET animated_url = '/animations/pic7.mp4' WHERE id = '20000000-0000-0000-0000-000000000007';
UPDATE photos SET animated_url = '/animations/pic9.mp4' WHERE id = '20000000-0000-0000-0000-000000000009';
UPDATE photos SET animated_url = '/animations/testphoto.mp4' WHERE id = '20000000-0000-0000-0000-000000000010';

-- ============================================================================
-- ANIMATION VERSIONS (9 animations linked to photos)
-- ============================================================================
INSERT INTO animation_versions (id, photo_id, url, type, is_selected, created_at) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '/animations/pic1.mp4',      'grok-imagine', true, NOW() - INTERVAL '5 minutes'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '/animations/pic2.mp4',      'grok-imagine', true, NOW() - INTERVAL '90 minutes'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '/animations/pic3.mp4',      'grok-imagine', true, NOW() - INTERVAL '8 hours'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '/animations/pic4.mp4',      'grok-imagine', true, NOW() - INTERVAL '40 minutes'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '/animations/pic5.mp4',      'grok-imagine', true, NOW() - INTERVAL '24 hours'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '/animations/pic6.mp4',      'veo3',         true, NOW() - INTERVAL '3 hours'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', '/animations/pic7.mp4',      'grok-imagine', true, NOW() - INTERVAL '5 hours'),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', '/animations/pic9.mp4',      'grok-imagine', true, NOW() - INTERVAL '12 hours'),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', '/animations/testphoto.mp4', 'grok-imagine', true, NOW() - INTERVAL '36 hours')
ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url;

-- ============================================================================
-- CONVERSATIONS (2 stories)
-- ============================================================================
INSERT INTO conversations (id, photo_id, author_id, transcript, duration_seconds, created_at) VALUES
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000004',
   'This was taken right after your grandmother and I got back from our honeymoon. We were so young then — I think I was only 23. That old car behind us was our first...',
   180, NOW() - INTERVAL '2 hours'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003',
   'I remember this moment so clearly. The kids had just finished opening their presents and they all ran outside to play in the snow. It was the first white Christmas we had in years...',
   240, NOW() - INTERVAL '18 hours')
ON CONFLICT (id) DO UPDATE SET transcript = EXCLUDED.transcript;

-- ============================================================================
-- ALBUM MEMBERS (link all 4 family members to all 7 demo events)
-- ============================================================================
INSERT INTO album_members (event_id, member_id, name, avatar_color, relationship) VALUES
  -- Summer BBQ 2024
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Michael', '#8b5cf6', 'Son'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'James',   '#3b82f6', 'Father'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Susan',   '#ec4899', 'Mother'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'William', '#10b981', 'Grandfather'),
  -- Christmas 2023
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Michael', '#8b5cf6', 'Son'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'James',   '#3b82f6', 'Father'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Susan',   '#ec4899', 'Mother'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'William', '#10b981', 'Grandfather'),
  -- Family Reunion
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Michael', '#8b5cf6', 'Son'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'James',   '#3b82f6', 'Father'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Susan',   '#ec4899', 'Mother'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'William', '#10b981', 'Grandfather'),
  -- Old Times
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Michael', '#8b5cf6', 'Son'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'James',   '#3b82f6', 'Father'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Susan',   '#ec4899', 'Mother'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'William', '#10b981', 'Grandfather'),
  -- Beach Trip 2024
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Michael', '#8b5cf6', 'Son'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'James',   '#3b82f6', 'Father'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Susan',   '#ec4899', 'Mother'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'William', '#10b981', 'Grandfather'),
  -- Graduation Day
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Michael', '#8b5cf6', 'Son'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'James',   '#3b82f6', 'Father'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 'Susan',   '#ec4899', 'Mother'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004', 'William', '#10b981', 'Grandfather'),
  -- Wedding Anniversary
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Michael', '#8b5cf6', 'Son'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'James',   '#3b82f6', 'Father'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'Susan',   '#ec4899', 'Mother'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000004', 'William', '#10b981', 'Grandfather')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FEED QUESTIONS (2: 1 unanswered, 1 answered)
-- These are separate from the per-account questions seeded in 006
-- ============================================================================
INSERT INTO family_prompts (id, event_id, from_member_id, to_member_id, photo_id, question, question_type, created_at) VALUES
  ('50000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000003',
   'Who is the person standing behind grandpa in this photo? I''ve never met them!',
   'photo',
   NOW() - INTERVAL '25 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_prompts (id, event_id, from_member_id, to_member_id, photo_id, question, question_type, answer_text, answered_at, created_at) VALUES
  ('50000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000008',
   'What was the name of that dish grandma made? Everyone kept going back for seconds!',
   'general',
   'That was her famous arroz con pollo! She used saffron from the market downtown.',
   NOW() - INTERVAL '5 hours',
   NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;
