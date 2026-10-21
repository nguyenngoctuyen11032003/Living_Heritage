import { getSupabase } from './supabase';

/**
 * Best-effort call to the `public-audio-sync` Edge Function: copies audio of newly approved public items into the
 * `public-audio` bucket and removes copies that are no longer published. Never throws (the function is idempotent
 * and can simply be called again later).
 */
export async function syncPublicAudio(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const { error } = await sb.functions.invoke('public-audio-sync', { body: {} });
    return !error;
  } catch {
    return false;
  }
}
