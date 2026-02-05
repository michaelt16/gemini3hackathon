import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Save exported video to storage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Convert to buffer
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage - use fixed filename to override previous export
    const fileName = `${eventId}/exported_video.webm`;
    
    const { error: uploadError } = await supabase.storage
      .from('event-photos')
      .upload(fileName, buffer, {
        contentType: 'video/webm',
        upsert: true, // Overwrites existing file
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload video: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL with cache-busting timestamp
    const { data: urlData } = supabase.storage
      .from('event-photos')
      .getPublicUrl(fileName);

    // Add cache-busting timestamp so browser fetches fresh video after re-export
    const videoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update event record with video URL (includes cache buster)
    const { data: updateData, error: updateError } = await supabase
      .from('events')
      .update({ video_url: videoUrl })
      .eq('id', eventId)
      .select('id, video_url')
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ 
        error: `Video uploaded but failed to update event: ${updateError.message}` 
      }, { status: 500 });
    }

    console.log('Video saved successfully:', { eventId, videoUrl, dbVideoUrl: updateData?.video_url });

    return NextResponse.json({ 
      success: true, 
      videoUrl,
      dbVideoUrl: updateData?.video_url,
      message: 'Video saved successfully'
    });

  } catch (error) {
    console.error('Save video error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save video' },
      { status: 500 }
    );
  }
}

// Get video URL for event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  try {
    const { data, error } = await supabase
      .from('events')
      .select('video_url')
      .eq('id', eventId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ videoUrl: data.video_url });
  } catch (error) {
    console.error('Get video error:', error);
    return NextResponse.json({ error: 'Failed to get video' }, { status: 500 });
  }
}
