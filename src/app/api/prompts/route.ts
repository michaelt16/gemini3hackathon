import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/prompts
 * Fetch all unanswered family prompts (questions)
 * Optionally filter by event_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const includeAnswered = searchParams.get('include_answered') === 'true';

    const supabase = createServerClient();

    let query = supabase
      .from('family_prompts')
      .select(`
        *,
        album_members!from_member_id (
          id,
          name,
          relationship,
          avatar_color
        ),
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

    // Filter unanswered only by default
    if (!includeAnswered) {
      query = query.is('answered_at', null);
    }

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to cleaner format
    const formatted = (prompts || []).map(p => ({
      id: p.id,
      event_id: p.event_id,
      album_title: p.events?.title || 'Unknown Album',
      photo_id: p.photo_id,
      photo: p.photos ? {
        id: p.photos.id,
        thumbnail_url: p.photos.thumbnail_url || p.photos.cleaned_url || p.photos.original_url,
      } : null,
      from_member: p.album_members ? {
        id: p.album_members.id,
        name: p.album_members.name,
        relationship: p.album_members.relationship,
        avatar_color: p.album_members.avatar_color,
      } : null,
      question: p.question,
      question_type: p.question_type || 'photo',
      answered_at: p.answered_at,
      answer_text: p.answer_text,
      created_at: p.created_at,
    }));

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
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id, photo_id, from_member_id, question, question_type } = body;

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
