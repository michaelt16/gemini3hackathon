import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/events/[id]/photos
 * Fetch all photos for an event with their story completeness.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch photos for this event
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select(`
        id,
        original_url,
        thumbnail_url,
        cleaned_url,
        animated_url,
        order_in_album,
        animation_type,
        summary,
        taken_at,
        created_at
      `)
      .eq('event_id', eventId)
      .order('order_in_album', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return NextResponse.json({ error: photosError.message }, { status: 502 });
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    // Get photo_stories for all photos
    const photoIds = photos.map(p => p.id);
    const { data: stories, error: storiesError } = await supabase
      .from('photo_stories')
      .select(`
        photo_id,
        who_facts,
        what_facts,
        when_facts,
        where_facts,
        why_facts,
        conversation_summary,
        completeness_score
      `)
      .in('photo_id', photoIds);

    if (storiesError) {
      console.error('Error fetching stories:', storiesError);
      // Continue without stories - they may not exist yet
    }

    // Create a map of photo_id -> story
    const storyMap = new Map(
      (stories || []).map(s => [s.photo_id, s])
    );

    // Enrich photos with story data
    const enrichedPhotos = photos.map(photo => {
      const story = storyMap.get(photo.id);
      // Prioritize summary from photos table, fallback to photo_stories
      const summary = photo.summary || story?.conversation_summary || null;
      return {
        ...photo,
        has_story: !!summary || !!story,
        completeness: story?.completeness_score || 0,
        summary: summary,
        facts: story ? {
          who: story.who_facts || [],
          what: story.what_facts || [],
          when: story.when_facts || [],
          where: story.where_facts || [],
          why: story.why_facts || [],
        } : null,
      };
    });

    return NextResponse.json({ photos: enrichedPhotos });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/events/[id]/photos:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
