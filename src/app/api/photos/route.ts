import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const BUCKET = 'event-photos'

/**
 * Parse data URL to buffer and mime type
 */
function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string; ext: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  return { buffer, mime, ext };
}

/**
 * POST /api/photos
 * Upload a photo to Supabase Storage and create a photos row.
 * Body: { event_id: string, image: string } — image is a data URL (data:image/...;base64,...)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id: eventId, image } = body;

    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'image (data URL) is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Ensure event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let buffer: Buffer;
    let mime: string;
    let ext: string;
    try {
      const parsed = parseDataUrl(image);
      buffer = parsed.buffer;
      mime = parsed.mime;
      ext = parsed.ext;
    } catch {
      return NextResponse.json({ error: 'Invalid image data URL' }, { status: 400 });
    }

    // Next order in album
    const { data: maxOrder } = await supabase
      .from('photos')
      .select('order_in_album')
      .eq('event_id', eventId)
      .order('order_in_album', { ascending: false })
      .limit(1)
      .single();

    const orderInAlbum = (maxOrder?.order_in_album ?? 0) + 1;
    const filePath = `${eventId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: mime,
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message?.toLowerCase().includes('bucket') || uploadError.message?.toLowerCase().includes('not found')) {
        return NextResponse.json(
          { error: `Storage bucket "${BUCKET}" not found. Create it in Supabase Dashboard: Storage → New bucket → name: ${BUCKET}, Public: true.` },
          { status: 502 }
        );
      }
      return NextResponse.json({ error: uploadError.message }, { status: 502 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const originalUrl = urlData.publicUrl;

    const { data: photo, error: insertError } = await supabase
      .from('photos')
      .insert({
        event_id: eventId,
        original_url: originalUrl,
        order_in_album: orderInAlbum,
        animation_type: 'none',
      })
      .select('id, event_id, original_url, order_in_album, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 502 });
    }

    return NextResponse.json(photo);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
