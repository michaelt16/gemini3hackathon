import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/albums/[id]/members
 * Fetch all family members for an album
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Album ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: members, error } = await supabase
      .from('album_members')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get members error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/albums/[id]/members
 * Add a family member to an album
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Album ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, relationship, avatar_color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Default avatar colors
    const colors = ['#f472b6', '#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { data: member, error } = await supabase
      .from('album_members')
      .insert({
        event_id: eventId,
        name,
        relationship: relationship || null,
        avatar_color: avatar_color || randomColor,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding member:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Add member error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
