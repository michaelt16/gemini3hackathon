import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/photos/[id]/copy-to-album
 * Copy a photo (and optionally its animated versions) to another album.
 * Body: { targetEventId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;
    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { targetEventId } = body;
    if (!targetEventId || typeof targetEventId !== 'string') {
      return NextResponse.json({ error: 'targetEventId is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Fetch the source photo
    const { data: sourcePhoto, error: photoError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (photoError || !sourcePhoto) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // 2. Verify target event exists
    const { data: targetEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', targetEventId)
      .single();

    if (eventError || !targetEvent) {
      return NextResponse.json({ error: 'Target album not found' }, { status: 404 });
    }

    // 3. Get next order in the target album
    const { data: maxOrder } = await supabase
      .from('photos')
      .select('order_in_album')
      .eq('event_id', targetEventId)
      .order('order_in_album', { ascending: false })
      .limit(1)
      .single();

    const orderInAlbum = (maxOrder?.order_in_album ?? 0) + 1;

    // 4. Insert a new photo row in the target album, sharing the same storage URLs
    const { data: newPhoto, error: insertError } = await supabase
      .from('photos')
      .insert({
        event_id: targetEventId,
        original_url: sourcePhoto.original_url,
        thumbnail_url: sourcePhoto.thumbnail_url,
        animated_url: sourcePhoto.animated_url,
        animation_type: sourcePhoto.animation_type || 'none',
        order_in_album: orderInAlbum,
        summary: sourcePhoto.summary,
      })
      .select('id, event_id, original_url, thumbnail_url, animated_url, animation_type, order_in_album, summary, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 502 });
    }

    // 5. Copy animation versions if any exist
    const { data: versions } = await supabase
      .from('photo_animations')
      .select('*')
      .eq('photo_id', photoId);

    if (versions && versions.length > 0) {
      const versionInserts = versions.map(v => ({
        photo_id: newPhoto.id,
        animated_url: v.animated_url,
        animation_type: v.animation_type,
        is_selected: v.is_selected,
      }));
      await supabase.from('photo_animations').insert(versionInserts);
    }

    // 6. Copy style previews (Disney, Ghibli, Anime, etc.) if any exist
    const { data: stylePreviews } = await supabase
      .from('style_previews')
      .select('*')
      .eq('photo_id', photoId);

    if (stylePreviews && stylePreviews.length > 0) {
      const previewInserts = stylePreviews.map(sp => ({
        photo_id: newPhoto.id,
        style_id: sp.style_id,
        image_url: sp.image_url,
        is_selected: sp.is_selected,
        model: sp.model,
      }));
      await supabase.from('style_previews').insert(previewInserts);
    }

    // 7. Copy photo story if exists
    const { data: story } = await supabase
      .from('photo_stories')
      .select('*')
      .eq('photo_id', photoId)
      .single();

    if (story) {
      await supabase.from('photo_stories').insert({
        photo_id: newPhoto.id,
        conversation_summary: story.conversation_summary,
        facts: story.facts,
      });
    }

    return NextResponse.json({ success: true, photo: newPhoto });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
