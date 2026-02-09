import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/events
 * List all events with photo count and cover URL.
 */
export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, album_type, date_start, date_end, location, summary, cover_photo_id, created_at, video_url, display_order')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 502 })
    }

    if (!events?.length) {
      return NextResponse.json(events ?? [])
    }

    const eventIds = events.map((e) => e.id)

    const { data: photos } = await supabase
      .from('photos')
      .select('id, event_id, thumbnail_url, original_url, order_in_album, summary')
      .in('event_id', eventIds)
      .order('order_in_album', { ascending: true })

    // Get photo IDs that have stories (from photo_stories.conversation_summary)
    const photoIds = (photos ?? []).map((p) => p.id)
    const { data: photoStories } = photoIds.length > 0
      ? await supabase
          .from('photo_stories')
          .select('photo_id')
          .in('photo_id', photoIds)
      : { data: [] }

    const photosWithStory = new Set(
      (photoStories ?? []).map((s) => s.photo_id)
    )

    const photoCountByEvent: Record<string, number> = {}
    const storiesCountByEvent: Record<string, number> = {}
    const coverByEvent: Record<string, string> = {}
    for (const e of events) {
      photoCountByEvent[e.id] = 0
      storiesCountByEvent[e.id] = 0
    }
    for (const p of photos ?? []) {
      photoCountByEvent[p.event_id] = (photoCountByEvent[p.event_id] ?? 0) + 1
      if (p.summary || photosWithStory.has(p.id)) {
        storiesCountByEvent[p.event_id] = (storiesCountByEvent[p.event_id] ?? 0) + 1
      }
      if (!coverByEvent[p.event_id]) {
        coverByEvent[p.event_id] = p.thumbnail_url || p.original_url || ''
      }
    }
    for (const e of events) {
      if (e.cover_photo_id) {
        const coverPhoto = photos?.find((p) => p.id === e.cover_photo_id)
        if (coverPhoto) {
          coverByEvent[e.id] = coverPhoto.thumbnail_url || coverPhoto.original_url || coverByEvent[e.id]
        }
      }
    }

    // Fetch album members for all events
    const { data: albumMembers } = await supabase
      .from('album_members')
      .select('event_id, member_id, name, avatar_color, relationship')
      .in('event_id', eventIds)

    const membersByEvent: Record<string, Array<{ id: string; name: string; avatar_color: string; relationship?: string }>> = {}
    for (const m of albumMembers ?? []) {
      if (!membersByEvent[m.event_id]) membersByEvent[m.event_id] = []
      const idx = membersByEvent[m.event_id].length;
      membersByEvent[m.event_id].push({
        id: m.member_id || `${m.name}-${m.event_id}-${idx}`,
        name: m.name,
        avatar_color: m.avatar_color,
        relationship: m.relationship,
      })
    }

    const withMeta = events.map((e) => ({
      ...e,
      photo_count: photoCountByEvent[e.id] ?? 0,
      stories_count: storiesCountByEvent[e.id] ?? 0,
      cover_url: coverByEvent[e.id] || null,
      members: membersByEvent[e.id] || [],
    }))

    return NextResponse.json(withMeta)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/events
 * Create a new event. Body: { title, album_type?, date_start?, date_end?, location? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, album_type = 'event', date_start, date_end, location } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('events')
      .insert({
        title: title.trim(),
        album_type: album_type === 'person' || album_type === 'theme' ? album_type : 'event',
        date_start: date_start || null,
        date_end: date_end || null,
        location: location?.trim() || null,
      })
      .select('id, title, album_type, date_start, date_end, location, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    return NextResponse.json({
      ...data,
      photo_count: 0,
      cover_url: null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
