import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client for use in server code (API routes, Server Components, server actions).
 * Uses the service role key when set; bypasses RLS. Use only where you need admin access.
 */
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL must be set in .env.local')
  }

  // Prefer service role for server-side admin operations; fall back to anon for RLS
  const key = serviceRoleKey ?? anonKey
  if (!key) {
    throw new Error(
      'Missing Supabase key: set either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
