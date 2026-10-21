import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lh/shared';
import { env } from './env';

export type Supabase = SupabaseClient<Database>;

let client: Supabase | null = null;

/** Singleton client, or null when VITE_SUPABASE_* are missing (pages then show a "not configured" state). */
export function getSupabase(): Supabase | null {
  if (!env.isConfigured) return null;
  client ??= createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'lh-auth' },
  });
  return client;
}

export function requireSupabase(): Supabase {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)');
  return sb;
}
