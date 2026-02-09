import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * PATCH /api/events/reorder
 * Persist album display order.
 * Body: { orderedIds: string[] }  — array of event UUIDs in desired display order
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderedIds } = body

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Update each event's display_order based on its position in the array
    const updates = orderedIds.map((id: string, index: number) =>
      supabase
        .from('events')
        .update({ display_order: index })
        .eq('id', id)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true, count: orderedIds.length })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
