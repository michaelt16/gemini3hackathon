import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/prompts
 * Fetch family prompts (questions)
 * 
 * Query params:
 *   event_id         - filter by specific event
 *   for_user={id}    - questions addressed TO this user (they need to answer)
 *   from_user={id}   - questions sent BY this user (awaiting response)
 *   include_answered  - 'true' to include answered prompts (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const forUser = searchParams.get('for_user');
    const fromUser = searchParams.get('from_user');
    const includeAnswered = searchParams.get('include_answered') === 'true';

    const supabase = createServerClient();

    // First, try the query with family_members joins
    let query = supabase
      .from('family_prompts')
      .select(`
        *,
        photos!photo_id (
          id,
          thumbnail_url,
          cleaned_url,
          original_url
        ),
        events!event_id (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by event if provided
    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    // Filter by recipient (questions FOR this user)
    if (forUser) {
      query = query.eq('to_member_id', forUser);
    }

    // Filter by sender (questions FROM this user)
    if (fromUser) {
      query = query.eq('from_member_id', fromUser);
    }

    // Filter unanswered only by default
    if (!includeAnswered) {
      query = query.is('answered_at', null);
    }

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Batch-fetch member info for from_member_id and to_member_id
    const memberIds = new Set<string>();
    (prompts || []).forEach((p: Record<string, unknown>) => {
      if (p.from_member_id) memberIds.add(p.from_member_id as string);
      if (p.to_member_id) memberIds.add(p.to_member_id as string);
    });

    // Fetch from family_members
    const memberMap = new Map<string, { id: string; name: string; relationship: string; avatar_color: string }>();
    if (memberIds.size > 0) {
      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, relationship, avatar_color')
        .in('id', [...memberIds]);
      members?.forEach((m: { id: string; name: string; relationship: string; avatar_color: string }) => {
        memberMap.set(m.id, m);
      });

      // Also check album_members for IDs not found in family_members
      const missingIds = [...memberIds].filter(id => !memberMap.has(id));
      if (missingIds.length > 0) {
        const { data: albumMembers } = await supabase
          .from('album_members')
          .select('id, name, relationship, avatar_color')
          .in('id', missingIds);
        albumMembers?.forEach((m: { id: string; name: string; relationship: string; avatar_color: string }) => {
          memberMap.set(m.id, m);
        });
      }
    }

    // Transform to cleaner format
    const formatted = (prompts || []).map((p: Record<string, unknown>) => {
      const photo = p.photos as { id: string; thumbnail_url: string; cleaned_url: string; original_url: string } | null;
      const event = p.events as { id: string; title: string } | null;
      const fromMember = p.from_member_id ? memberMap.get(p.from_member_id as string) || null : null;
      const toMember = p.to_member_id ? memberMap.get(p.to_member_id as string) || null : null;

      return {
        id: p.id,
        event_id: p.event_id,
        album_title: event?.title || 'Unknown Album',
        photo_id: p.photo_id,
        photo: photo ? {
          id: photo.id,
          thumbnail_url: photo.thumbnail_url || photo.cleaned_url || photo.original_url,
        } : null,
        from_member: fromMember ? {
          id: fromMember.id,
          name: fromMember.name,
          relationship: fromMember.relationship,
          avatar_color: fromMember.avatar_color,
        } : null,
        to_member: toMember ? {
          id: toMember.id,
          name: toMember.name,
          relationship: toMember.relationship,
          avatar_color: toMember.avatar_color,
        } : null,
        question: p.question,
        question_type: p.question_type || 'photo',
        answered_at: p.answered_at,
        answer_text: p.answer_text,
        created_at: p.created_at,
      };
    });

    return NextResponse.json({ prompts: formatted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get prompts error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/prompts
 * Create a new family prompt (question)
 * 
 * Body: { event_id, photo_id?, from_member_id, to_member_id, question, question_type? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id, photo_id, from_member_id, to_member_id, question, question_type } = body;

    if (!event_id || !question) {
      return NextResponse.json(
        { error: 'event_id and question are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: prompt, error } = await supabase
      .from('family_prompts')
      .insert({
        event_id,
        photo_id: photo_id || null,
        from_member_id: from_member_id || null,
        to_member_id: to_member_id || null,
        question,
        question_type: question_type || (photo_id ? 'photo' : 'general'),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prompt:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create prompt error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
