import type { Database } from '@lh/shared';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { NARRATOR_ID_KEY } from './urls';

export type Narrator = Database['public']['Tables']['narrators']['Row'];
export type NarratorLink = Database['public']['Tables']['narrator_links']['Row'];

export interface NarratorsState {
  narrators: Narrator[];
  loading: boolean;
  /** Raw Supabase error message, or null. */
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Narrators of one family, ordered by creation time. Pass `useCurrentFamily().current?.id`.
 * With a null/undefined familyId (or Supabase not configured) it returns an empty list, not loading.
 * Readable by every family member (RLS), so viewers get the list too.
 */
export function useNarrators(familyId: string | null | undefined): NarratorsState {
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(familyId));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !familyId) {
      setNarrators([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await sb.from('narrators').select('*').eq('family_id', familyId).order('created_at', { ascending: true });
    setError(err ? err.message : null);
    setNarrators(err ? [] : (data ?? []));
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { narrators, loading, error, reload };
}

export interface MyNarratorState {
  /** The narrator bound to the signed-in (usually anonymous) user, or null. */
  narrator: Narrator | null;
  /** Name of that narrator's family ("Nhà họ Nguyễn"), or null. */
  family_name: string | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * For narrator-link users (signInAnonymously + claim_narrator_link): the narrator row whose
 * `user_id` is the current auth uid, plus its family name. If several rows match, the one stored in
 * localStorage 'lh.narratorId' wins. Returns `narrator: null` for family accounts (they are members, not
 * narrator users) and when signed out.
 */
export function useMyNarrator(): MyNarratorState {
  const { user, loading: sessionLoading } = useSession();
  const [state, setState] = useState<Omit<MyNarratorState, 'reload'>>({ narrator: null, family_name: null, loading: true, error: null });

  const reload = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      setState({ narrator: null, family_name: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const { data, error } = await sb.from('narrators').select('*, families(name)').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (error) {
      setState({ narrator: null, family_name: null, loading: false, error: error.message });
      return;
    }
    const rows = (data ?? []) as unknown as Array<Narrator & { families: { name: string } | null }>;
    let preferred: string | null = null;
    try {
      preferred = localStorage.getItem(NARRATOR_ID_KEY);
    } catch {
      /* storage blocked */
    }
    const row = rows.find((r) => r.id === preferred) ?? rows[0] ?? null;
    if (!row) {
      setState({ narrator: null, family_name: null, loading: false, error: null });
      return;
    }
    const { families, ...narrator } = row;
    setState({ narrator, family_name: families?.name ?? null, loading: false, error: null });
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void reload();
  }, [reload, sessionLoading]);

  return { ...state, loading: state.loading || sessionLoading, reload };
}
