// supabase-js client factories for Edge Functions (no session persistence in an isolate).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

const env = (k: string): string => Deno.env.get(k) ?? '';

/** Anon key + the caller's JWT: every query runs as the user, under RLS. */
export function createUserClient(jwt: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: NO_SESSION,
  });
}

/** service_role (auto-injected secret): bypasses RLS. Use only after access was proven with the user client. */
export function createAdminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: NO_SESSION });
}
