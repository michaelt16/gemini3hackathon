import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/family-code?user_id=X
 * Returns the user's current family_code
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('family_members')
      .select('family_code')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ family_code: null });
    }

    return NextResponse.json({ family_code: data.family_code });
  } catch (err) {
    console.error('Error in GET /api/auth/family-code:', err);
    return NextResponse.json({ error: 'Failed to fetch family code' }, { status: 500 });
  }
}

/**
 * POST /api/auth/family-code
 * Actions:
 *   - generate: Creates a random 8-char code and saves it as the user's family_code
 *   - join: Sets the user's family_code to the given code and links them to that family's events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, action, code } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    if (action === 'generate') {
      // Generate a random 8-char alphanumeric code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous chars
      let familyCode = '';
      for (let i = 0; i < 8; i++) {
        familyCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { error } = await supabase
        .from('family_members')
        .update({ family_code: familyCode })
        .eq('id', user_id);

      if (error) {
        console.error('Error generating family code:', error);
        return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
      }

      return NextResponse.json({ family_code: familyCode, message: 'Family code generated!' });
    }

    if (action === 'join') {
      if (!code?.trim()) {
        return NextResponse.json({ error: 'Code is required to join a family' }, { status: 400 });
      }

      const joinCode = code.trim().toUpperCase();

      // Verify the code exists (at least one member has it)
      const { data: existingMembers } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_code', joinCode);

      if (!existingMembers || existingMembers.length === 0) {
        return NextResponse.json({ error: 'Invalid family code. No family found with that code.' }, { status: 404 });
      }

      // Update the user's family_code
      const { error: updateError } = await supabase
        .from('family_members')
        .update({ family_code: joinCode })
        .eq('id', user_id);

      if (updateError) {
        console.error('Error joining family:', updateError);
        return NextResponse.json({ error: 'Failed to join family' }, { status: 500 });
      }

      // Link the user to the family's events via album_members
      const memberIds = existingMembers.map((m: { id: string }) => m.id);
      const { data: albumLinks } = await supabase
        .from('album_members')
        .select('event_id')
        .in('member_id', memberIds);

      if (albumLinks && albumLinks.length > 0) {
        const eventIds = [...new Set(albumLinks.map((a: { event_id: string }) => a.event_id))];
        const albumMemberRows = eventIds.map((eventId) => ({
          event_id: eventId,
          member_id: user_id,
          role: 'member',
        }));

        // Use upsert to avoid duplicate errors
        await supabase
          .from('album_members')
          .upsert(albumMemberRows, { onConflict: 'event_id,member_id' })
          .select();
      }

      return NextResponse.json({
        family_code: joinCode,
        message: `Joined family! You now have access to ${albumLinks?.length || 0} shared albums.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "generate" or "join".' }, { status: 400 });
  } catch (err) {
    console.error('Error in POST /api/auth/family-code:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Operation failed' },
      { status: 500 }
    );
  }
}
