import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/photos/[id]/animate
 * Save VEO 3 animated video to storage and update photo record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;

  try {
    const body = await request.json();
    const { videoBase64, videoUrl, animationType = 'veo3' } = body;

    if (!videoBase64 && !videoUrl) {
      return NextResponse.json({ error: 'Video data required' }, { status: 400 });
    }

    // Get the photo to find its event_id
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, event_id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    let animatedUrl = videoUrl;

    // If we have base64 data, upload to storage
    if (videoBase64) {
      const buffer = Buffer.from(videoBase64, 'base64');
      const fileName = `${photo.event_id}/animations/${photoId}_animated_${Date.now()}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, buffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(fileName);

      animatedUrl = urlData.publicUrl;
    }

    // Update photo record with animated_url and animation_type
    const { data: updatedPhoto, error: updateError } = await supabase
      .from('photos')
      .update({
        animated_url: animatedUrl,
        animation_type: animationType,
      })
      .eq('id', photoId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }

    console.log(`✅ ${animationType} animation saved for photo ${photoId}`);

    return NextResponse.json({
      success: true,
      animated_url: animatedUrl,
      animation_type: animationType,
      photo: updatedPhoto,
    });

  } catch (error) {
    console.error('Save animation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save animation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/photos/[id]/animate
 * Remove VEO 3 animation from photo (revert to Ken Burns)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;

  try {
    // Update photo to remove animated_url
    const { data, error } = await supabase
      .from('photos')
      .update({
        animated_url: null,
        animation_type: null,
      })
      .eq('id', photoId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Animation removed, will use Ken Burns effect',
      photo: data,
    });

  } catch (error) {
    console.error('Remove animation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove animation' },
      { status: 500 }
    );
  }
}
