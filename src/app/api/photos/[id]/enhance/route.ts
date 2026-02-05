/**
 * POST /api/photos/[id]/enhance
 * Run Nano Banana crop on a photo and replace original/thumbnail with the enhanced version.
 * Use when the photo wasn't cropped during capture (e.g. user talked to AI before cropping).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'event-photos';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;

  try {
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, event_id, original_url, thumbnail_url')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const imageUrl = photo.original_url || photo.thumbnail_url;
    if (!imageUrl) {
      return NextResponse.json({ error: 'Photo has no image URL' }, { status: 400 });
    }

    // Fetch the image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch photo image' }, { status: 502 });
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Call Nano Banana API (internal)
    const baseUrl = request.nextUrl.origin;
    const nanoRes = await fetch(`${baseUrl}/api/nano-banana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    });

    if (!nanoRes.ok) {
      const errData = await nanoRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.error || 'Nano Banana extraction failed' },
        { status: nanoRes.status }
      );
    }

    const nanoData = await nanoRes.json();
    if (!nanoData.success || !nanoData.imageBase64) {
      return NextResponse.json(
        { error: nanoData.error || 'No enhanced image returned' },
        { status: 500 }
      );
    }

    // Upload to storage
    const buffer = Buffer.from(nanoData.imageBase64, 'base64');
    const ext = nanoData.mimeType?.includes('png') ? 'png' : 'jpg';
    const fileName = `${photo.event_id}/enhanced/${photoId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: nanoData.mimeType || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Enhance upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload enhanced photo' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const newUrl = urlData.publicUrl;

    // Update photo with new URLs
    const { data: updated, error: updateError } = await supabase
      .from('photos')
      .update({
        original_url: newUrl,
        thumbnail_url: newUrl,
      })
      .eq('id', photoId)
      .select()
      .single();

    if (updateError) {
      console.error('Enhance update error:', updateError);
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      original_url: newUrl,
      thumbnail_url: newUrl,
      photo: updated,
    });
  } catch (error) {
    console.error('Enhance photo error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enhance failed' },
      { status: 500 }
    );
  }
}
