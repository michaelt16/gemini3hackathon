import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Hardcoded family members for demo fallback (when table doesn't exist yet)
const DEMO_MEMBERS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Michael', email: 'you@family.com', avatar_color: '#8b5cf6', relationship: 'Son', family_code: 'FAMILY2024', voice_clone_id: null },
  { id: '00000000-0000-0000-0000-000000000002', name: 'James', email: 'dad@family.com', avatar_color: '#3b82f6', relationship: 'Father', family_code: 'FAMILY2024', voice_clone_id: null },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Susan', email: 'mom@family.com', avatar_color: '#ec4899', relationship: 'Mother', family_code: 'FAMILY2024', voice_clone_id: null },
  { id: '00000000-0000-0000-0000-000000000004', name: 'William', email: 'grandpa@family.com', avatar_color: '#10b981', relationship: 'Grandfather', family_code: 'FAMILY2024', voice_clone_id: null },
];

/**
 * GET /api/auth/members
 * Returns all family member profiles (for the login profile picker)
 * Includes voice_clone_id from the users table for voice playback features.
 * Falls back to hardcoded demo members if the table doesn't exist.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('family_members')
      .select('id, name, email, avatar_color, relationship, family_code')
      .order('created_at', { ascending: true });

    if (error) {
      console.log('family_members not available, using demo fallback');
      return NextResponse.json(DEMO_MEMBERS);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(DEMO_MEMBERS);
    }

    // Enrich with voice_clone_id from users table
    const memberIds = data.map(m => m.id);
    const { data: users } = await supabase
      .from('users')
      .select('id, voice_clone_id')
      .in('id', memberIds);

    const voiceMap = new Map<string, string | null>();
    users?.forEach(u => voiceMap.set(u.id, u.voice_clone_id || null));

    const enriched = data.map(m => ({
      ...m,
      voice_clone_id: voiceMap.get(m.id) || null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('Error in /api/auth/members:', err);
    return NextResponse.json(DEMO_MEMBERS);
  }
}
