import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/photos/[id]/style-previews?style=disney
 * Fetch all style previews for a photo, optionally filtered by style.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;
  const styleId = request.nextUrl.searchParams.get('style');

  try {
    let query = supabase
      .from('style_previews')
      .select('id, style_id, image_url, is_selected, model, created_at')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true });

    if (styleId) {
      query = query.eq('style_id', styleId);
    }

    const { data: previews, error } = await query;

    if (error) {
      console.error('Error fetching style previews:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ previews: previews || [] });
  } catch (error) {
    console.error('Get style previews error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch style previews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/[id]/style-previews
 * Save a new style preview image.
 * Body: { styleId, imageBase64, mimeType?, model?, select? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;

  try {
    const body = await request.json();
    const { styleId, imageBase64, mimeType = 'image/jpeg', model, select = false } = body;

    if (!styleId || !imageBase64) {
      return NextResponse.json({ error: 'styleId and imageBase64 are required' }, { status: 400 });
    }

    // Get the photo to find its event_id for storage path
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, event_id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Upload image to Supabase storage
    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = `${photo.event_id}/style-previews/${photoId}_${styleId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('event-photos')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload preview image' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('event-photos')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // If selecting this one, deselect others for this photo+style
    if (select) {
      await supabase
        .from('style_previews')
        .update({ is_selected: false })
        .eq('photo_id', photoId)
        .eq('style_id', styleId);
    }

    // Insert DB record
    const { data: preview, error: insertError } = await supabase
      .from('style_previews')
      .insert({
        photo_id: photoId,
        style_id: styleId,
        image_url: imageUrl,
        is_selected: select,
        model: model || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, preview });
  } catch (error) {
    console.error('Save style preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save style preview' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/photos/[id]/style-previews
 * Select a specific preview for a photo+style.
 * Body: { previewId: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;

  try {
    const body = await request.json();
    const { previewId } = body;

    if (!previewId) {
      return NextResponse.json({ error: 'previewId is required' }, { status: 400 });
    }

    // Get the preview to find its style
    const { data: target, error: findError } = await supabase
      .from('style_previews')
      .select('style_id')
      .eq('id', previewId)
      .eq('photo_id', photoId)
      .single();

    if (findError || !target) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    // Deselect all previews for this photo+style
    await supabase
      .from('style_previews')
      .update({ is_selected: false })
      .eq('photo_id', photoId)
      .eq('style_id', target.style_id);

    // Select the target
    const { data: preview, error: selectError } = await supabase
      .from('style_previews')
      .update({ is_selected: true })
      .eq('id', previewId)
      .select()
      .single();

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, preview });
  } catch (error) {
    console.error('Select style preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to select preview' },
      { status: 500 }
    );
  }
}
