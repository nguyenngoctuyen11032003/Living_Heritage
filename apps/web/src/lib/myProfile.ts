import { useEffect, useSyncExternalStore } from 'react';
import { useSession } from './session';
import { getSupabase } from './supabase';

// The signed-in user's own profile (display name + avatar), shared by the settings profile form and the app
// sidebar so a saved name/photo shows up everywhere at once without a reload.

export const AVATAR_BUCKET = 'avatars';

export interface MyProfile {
  userId: string;
  displayName: string | null;
  avatarPath: string | null;
}

let state: MyProfile | null = null;
let inflight: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Public URL of an avatar object, or null. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const sb = getSupabase();
  return sb ? sb.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

/** Loads (or reloads) the profile row. Resolves with an error flag so callers can show a retry. */
export async function loadMyProfile(userId: string): Promise<{ error: boolean; profile: MyProfile | null }> {
  const sb = getSupabase();
  if (!sb) return { error: true, profile: null };
  inflight = userId;
  const { data, error } = await sb.from('profiles').select('display_name, avatar_path').eq('id', userId).maybeSingle();
  if (inflight === userId) inflight = null;
  if (error) return { error: true, profile: null };
  const profile: MyProfile = { userId, displayName: data?.display_name ?? null, avatarPath: data?.avatar_path ?? null };
  state = profile;
  emit();
  return { error: false, profile };
}

/** Local update after a successful save. */
export function patchMyProfile(patch: Partial<Omit<MyProfile, 'userId'>>): void {
  if (!state) return;
  state = { ...state, ...patch };
  emit();
}

/** The current user's profile, loading it once per user. null until loaded. */
export function useMyProfile(): MyProfile | null {
  const { user } = useSession();
  const profile = useSyncExternalStore(subscribe, () => state, () => null);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (userId && state?.userId !== userId && inflight !== userId) void loadMyProfile(userId);
  }, [userId]);
  return profile && profile.userId === userId ? profile : null;
}
