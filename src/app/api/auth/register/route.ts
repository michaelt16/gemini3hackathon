import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/register
 * Creates a new family member account (from the intro page)
 * - With inviteCode: joins that family (stores family_code, links to family events)
 * - Without inviteCode: standalone account (family_code = NULL)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, inviteCode } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Generate a default email if none provided
    const memberEmail = email?.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@family.com`;

    // Pick a random avatar color
    const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#f97316', '#06b6d4', '#ef4444'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    // Determine family_code: use inviteCode if provided, otherwise NULL
    const familyCode = inviteCode?.trim() || null;

    // Check if email already exists
    const { data: existing } = await supabase
      .from('family_members')
      .select('id, name, avatar_color, relationship, family_code')
      .eq('email', memberEmail)
      .single();

    if (existing) {
      // Return the existing member (they can just log in)
      return NextResponse.json({
        member: existing,
        message: 'Account already exists — welcome back!',
        isExisting: true,
      });
    }

    // Create new member with family_code
    const { data: newMember, error } = await supabase
      .from('family_members')
      .insert({
        name: name.trim(),
        email: memberEmail,
        password: 'demo123',
        avatar_color: avatarColor,
        relationship: 'Self',
        family_code: familyCode,
      })
      .select('id, name, email, avatar_color, relationship, family_code')
      .single();

    if (error) {
      console.error('Error creating family member:', error);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // If invite code provided, find events from that family and link the new member
    if (familyCode) {
      // Find all members with the same family_code to discover their events
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_code', familyCode)
        .neq('id', newMember.id);

      if (familyMembers && familyMembers.length > 0) {
        const memberIds = familyMembers.map((m: { id: string }) => m.id);

        // Find events those family members are part of via album_members
        const { data: albumLinks } = await supabase
          .from('album_members')
          .select('event_id')
          .in('member_id', memberIds);

        if (albumLinks && albumLinks.length > 0) {
          // Deduplicate event IDs
          const eventIds = [...new Set(albumLinks.map((a: { event_id: string }) => a.event_id))];
          const albumMemberRows = eventIds.map((eventId) => ({
            event_id: eventId,
            member_id: newMember.id,
            role: 'member',
          }));
          await supabase.from('album_members').insert(albumMemberRows).select();
        } else {
          // Fallback: if album_members doesn't have member_id links, get all events
          const { data: events } = await supabase.from('events').select('id');
          if (events && events.length > 0) {
            const albumMemberRows = events.map((e: { id: string }) => ({
              event_id: e.id,
              member_id: newMember.id,
              role: 'member',
            }));
            await supabase.from('album_members').insert(albumMemberRows).select();
          }
        }
      }
    }

    return NextResponse.json({
      member: newMember,
      message: familyCode ? `Joined family ${familyCode}!` : 'Account created!',
      isExisting: false,
    });
  } catch (err) {
    console.error('Error in /api/auth/register:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Registration failed' },
      { status: 500 }
    );
  }
}
