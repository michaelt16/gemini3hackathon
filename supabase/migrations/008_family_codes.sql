-- Migration 008: Add family_code to family_members for family grouping

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS family_code TEXT DEFAULT NULL;

-- Set the 4 seeded demo accounts to the same family
UPDATE family_members SET family_code = 'FAMILY2024'
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);
