import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lh/shared';
import { env } from './env';

export type Supabase = SupabaseClient<Database>;

// The SDK (~54 KB gz) is not on the landing page's critical path: it is a lazy chunk, loaded by ensureSupabase().
// Every route except the landing page awaits it inside its lazy() (app/router.tsx), so code on those pages can keep
// using the synchronous getSupabase(). The session provider loads it right away for signed-in visitors, otherwise
// once the landing page is idle.
let client: Supabase | null = null;
let loading: Promise<Supabase | null> | null = null;
const readyListeners = new Set<() => void>();

/** Loads the SDK and creates the singleton client (once); null when VITE_SUPABASE_* are missing. */
export function ensureSupabase(): Promise<Supabase | null> {
  if (!env.isConfigured) return Promise.resolve(null);
  if (client) return Promise.resolve(client);
  loading ??= import('@supabase/supabase-js').then(
    ({ createClient }) => {
      client = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: AUTH_STORAGE_KEY },
      });
      readyListeners.forEach((l) => l());
      readyListeners.clear();
      return client;
    },
    (e: unknown) => {
      loading = null; // a failed chunk download is retried on the next call
      throw e;
    },
  );
  return loading;
}

/** Runs `cb` once the client exists (immediately if it already does). Returns an unsubscribe. */
export function onSupabaseReady(cb: () => void): () => void {
  if (client) {
    cb();
    return () => {};
  }
  readyListeners.add(cb);
  return () => readyListeners.delete(cb);
}

/**
 * Singleton client, or null when VITE_SUPABASE_* are missing (pages then show a "not configured" state).
 * Synchronous: null too until ensureSupabase() has resolved, which every route except the landing page guarantees.
 */
export function getSupabase(): Supabase | null {
  return client;
}

export function requireSupabase(): Supabase {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)');
  return sb;
}

export const AUTH_STORAGE_KEY = 'lh-auth';

/** A stored auth session exists (signed-in or narrator-link visitor): worth loading the SDK immediately. */
export function hasStoredSession(): boolean {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
