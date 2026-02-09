import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const BUCKET = 'event-photos';

/**
 * PATCH /api/photos/[id]
 * Update a photo's memory (summary) in photo_stories.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;
    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { summary } = body;
    if (typeof summary !== 'string') {
      return NextResponse.json({ error: 'summary (string) is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Update photos.summary (primary source - used by editor)
    const { error: photoUpdateError } = await supabase
      .from('photos')
      .update({ summary: summary.trim() || null })
      .eq('id', photoId);
    if (photoUpdateError) {
      // Column may not exist in older schemas - continue to photo_stories
      console.warn('Could not update photos.summary:', photoUpdateError.message);
    }

    const { data: existingStory } = await supabase
      .from('photo_stories')
      .select('id')
      .eq('photo_id', photoId)
      .single();

    const now = new Date().toISOString();

    if (existingStory) {
      const { error: updateError } = await supabase
        .from('photo_stories')
        .update({
          conversation_summary: summary.trim() || null,
          updated_at: now,
        })
        .eq('id', existingStory.id);

      if (updateError) {
        console.error('Error updating photo_stories:', updateError);
        return NextResponse.json({ error: 'Failed to update memory' }, { status: 502 });
      }
    } else {
      const { error: insertError } = await supabase
        .from('photo_stories')
        .insert({
          photo_id: photoId,
          conversation_summary: summary.trim() || null,
          who_facts: [],
          what_facts: [],
          when_facts: [],
          where_facts: [],
          why_facts: [],
          completeness_score: summary.trim() ? 50 : 0,
          updated_at: now,
        });

      if (insertError) {
        console.error('Error inserting photo_stories:', insertError);
        return NextResponse.json({ error: 'Failed to save memory' }, { status: 502 });
      }
    }

    return NextResponse.json({ success: true, summary: summary.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH photo error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/photos/[id]
 * Delete a photo (DB row; storage object left as-is unless we have path).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get photo to optionally remove from storage (extract path from original_url if possible)
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('id, original_url')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete DB row (cascade will remove conversations, messages, photo_stories)
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      console.error('Error deleting photo:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 502 });
    }

    // Only remove from storage if no other photo rows share the same file
    if (photo.original_url) {
      const { count } = await supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('original_url', photo.original_url);

      if (count === 0) {
        // No other photo references this file — safe to delete from storage
        const match = photo.original_url.match(/\/event-photos\/(.+)$/);
        if (match?.[1]) {
          const storagePath = decodeURIComponent(match[1]);
          await supabase.storage.from(BUCKET).remove([storagePath]);
        }
      }
    }

    return NextResponse.json({ success: true, id: photoId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete photo error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
