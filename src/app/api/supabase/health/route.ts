import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/supabase/health
 * Verifies Supabase connection. Call this after setting .env.local to confirm setup.
 */
export async function GET() {
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from('events').select('id').limit(1)
    // Table might not exist yet; connection error is what we care about
    // 42P01 = PostgreSQL "table doesn't exist", PGRST205 = PostgREST "table not in schema cache"
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, message: 'Supabase connected' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
