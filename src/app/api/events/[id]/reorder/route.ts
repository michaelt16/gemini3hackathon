import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PUT /api/events/[id]/reorder
 * Update the order of photos in an album
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  try {
    const body = await request.json();
    const { photo_ids } = body;

    if (!photo_ids || !Array.isArray(photo_ids)) {
      return NextResponse.json(
        { error: 'photo_ids array is required' },
        { status: 400 }
      );
    }

    console.log(`Reordering ${photo_ids.length} photos for event ${eventId}`);

    // 1. Set order_in_album to null for photos NOT in the list (removed from timeline)
    const { data: allEventPhotos } = await supabase
      .from('photos')
      .select('id')
      .eq('event_id', eventId);

    const idsToKeep = new Set(photo_ids);
    const idsToRemove = (allEventPhotos || [])
      .map((p: { id: string }) => p.id)
      .filter((id: string) => !idsToKeep.has(id));

    if (idsToRemove.length > 0) {
      const { error: clearError } = await supabase
        .from('photos')
        .update({ order_in_album: null })
        .eq('event_id', eventId)
        .in('id', idsToRemove);
      if (clearError) {
        console.error('Error clearing order for removed photos:', clearError);
      }
    }

    // 2. Update each photo in the list with its new order
    const updates = photo_ids.map((photoId: string, index: number) => 
      supabase
        .from('photos')
        .update({ order_in_album: index + 1 })
        .eq('id', photoId)
        .eq('event_id', eventId)
    );

    const results = await Promise.all(updates);
    
    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Reorder errors:', errors.map(e => e.error));
      return NextResponse.json(
        { error: 'Failed to update some photos', details: errors.map(e => e.error) },
        { status: 500 }
      );
    }

    console.log(`Successfully reordered ${photo_ids.length} photos`);

    return NextResponse.json({
      success: true,
      message: `Reordered ${photo_ids.length} photos`,
    });
  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reorder photos' },
      { status: 500 }
    );
  }
}
