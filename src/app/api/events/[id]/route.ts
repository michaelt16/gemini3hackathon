import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * PATCH /api/events/[id]
 * Update event fields: title, date_start, date_end, location, summary.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title.trim()
    if (body.date_start !== undefined) updates.date_start = body.date_start || null
    if (body.date_end !== undefined) updates.date_end = body.date_end || null
    if (typeof body.location === 'string') updates.location = body.location.trim() || null
    if (typeof body.summary === 'string') updates.summary = body.summary.trim() || null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event and its photos (storage cleanup best-effort).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !event) {
      return NextResponse.json(
        { error: fetchError?.message ?? 'Event not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 502 })
    }

    return NextResponse.json({ success: true, id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/events/[id]
 * Fetch a single event by ID with photo count and cover URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, album_type, date_start, date_end, location, summary, cover_photo_id, created_at, video_url')
      .eq('id', id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: eventError?.message ?? 'Event not found' },
        { status: eventError?.code === 'PGRST116' ? 404 : 502 }
      )
    }

    const { data: photos } = await supabase
      .from('photos')
      .select('id, thumbnail_url, original_url, order_in_album')
      .eq('event_id', id)
      .order('order_in_album', { ascending: true })

    const photoCount = photos?.length ?? 0
    const coverPhoto = event.cover_photo_id
      ? photos?.find((p) => p.id === event.cover_photo_id)
      : photos?.[0]
    const coverUrl = coverPhoto?.thumbnail_url || coverPhoto?.original_url || null

    // Return with no-cache headers to ensure fresh data after video export
    return NextResponse.json({
      ...event,
      photo_count: photoCount,
      cover_url: coverUrl,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
