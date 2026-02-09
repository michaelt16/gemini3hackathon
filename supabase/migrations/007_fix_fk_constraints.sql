-- Fix: Change from_member_id FK from album_members to family_members

-- Drop old FK constraint on from_member_id (it points to album_members)
ALTER TABLE family_prompts DROP CONSTRAINT IF EXISTS family_prompts_from_member_id_fkey;

-- Re-add it pointing to family_members
ALTER TABLE family_prompts 
  ADD CONSTRAINT family_prompts_from_member_id_fkey 
  FOREIGN KEY (from_member_id) REFERENCES family_members(id) ON DELETE SET NULL;

-- Also fix to_member_id if it accidentally points elsewhere
ALTER TABLE family_prompts DROP CONSTRAINT IF EXISTS family_prompts_to_member_id_fkey;
ALTER TABLE family_prompts 
  ADD CONSTRAINT family_prompts_to_member_id_fkey 
  FOREIGN KEY (to_member_id) REFERENCES family_members(id) ON DELETE SET NULL;
