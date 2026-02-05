import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NarrationSegment {
  photo_id: string;
  text: string;
  order: number;
}

/**
 * GET /api/events/[id]/narration
 * Fetch saved narration segments for an event
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  try {
    const { data, error } = await supabase
      .from('album_narrations')
      .select('id, script_segments, photo_order, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching narration:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ segments: [], photoOrder: [] });
    }

    return NextResponse.json({
      id: data.id,
      segments: data.script_segments || [],
      photoOrder: data.photo_order || [],
    });
  } catch (error) {
    console.error('Get narration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch narration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/narration
 * Save narration segments for an event (upsert)
 * Body: { segments: [{photo_id, text, order}], photoOrder: [uuid, ...] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  try {
    const body = await request.json();
    const { segments, photoOrder } = body as { segments: NarrationSegment[]; photoOrder: string[] };

    if (!segments || !Array.isArray(segments)) {
      return NextResponse.json({ error: 'segments array is required' }, { status: 400 });
    }

    // Check if narration exists for this event
    const { data: existing } = await supabase
      .from('album_narrations')
      .select('id')
      .eq('event_id', eventId)
      .limit(1)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('album_narrations')
        .update({
          script_segments: segments,
          photo_order: photoOrder || [],
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating narration:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, narration: data });
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('album_narrations')
        .insert({
          event_id: eventId,
          script_segments: segments,
          photo_order: photoOrder || [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting narration:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, narration: data });
    }
  } catch (error) {
    console.error('Save narration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save narration' },
      { status: 500 }
    );
  }
}
