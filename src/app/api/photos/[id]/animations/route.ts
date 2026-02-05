import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/photos/[id]/animations
 * Fetch all animation versions for a photo
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;

  try {
    const { data: versions, error } = await supabase
      .from('animation_versions')
      .select('id, url, type, is_selected, created_at')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching animation versions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ versions: versions || [] });
  } catch (error) {
    console.error('Get animations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch animations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/[id]/animations
 * Add a new animation version
 * Body: { url: string, type: 'veo3' | 'grok-imagine', select?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;

  try {
    const body = await request.json();
    const { url, type, select = true } = body;

    if (!url || !type) {
      return NextResponse.json({ error: 'url and type are required' }, { status: 400 });
    }

    // If selecting this version, deselect all other versions for this photo first
    if (select) {
      await supabase
        .from('animation_versions')
        .update({ is_selected: false })
        .eq('photo_id', photoId);
    }

    // Insert the new version
    const { data: version, error: insertError } = await supabase
      .from('animation_versions')
      .insert({
        photo_id: photoId,
        url,
        type,
        is_selected: select,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting animation version:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // If selected, also update the photo's animated_url for backwards compatibility
    if (select) {
      await supabase
        .from('photos')
        .update({ animated_url: url, animation_type: type })
        .eq('id', photoId);
    }

    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('Add animation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add animation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/photos/[id]/animations
 * Select a specific version
 * Body: { versionId: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;

  try {
    const body = await request.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    // Deselect all versions for this photo
    await supabase
      .from('animation_versions')
      .update({ is_selected: false })
      .eq('photo_id', photoId);

    // Select the specified version
    const { data: version, error: selectError } = await supabase
      .from('animation_versions')
      .update({ is_selected: true })
      .eq('id', versionId)
      .eq('photo_id', photoId)
      .select()
      .single();

    if (selectError) {
      console.error('Error selecting animation version:', selectError);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    // Update the photo's animated_url for backwards compatibility
    if (version) {
      await supabase
        .from('photos')
        .update({ animated_url: version.url, animation_type: version.type })
        .eq('id', photoId);
    }

    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('Select animation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to select animation' },
      { status: 500 }
    );
  }
}
