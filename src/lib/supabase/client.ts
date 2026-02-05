import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client for use in the browser (client components, client-side code).
 * Uses the anon key; RLS policies apply.
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local'
    )
  }

  return createSupabaseClient(url, anonKey)
}
