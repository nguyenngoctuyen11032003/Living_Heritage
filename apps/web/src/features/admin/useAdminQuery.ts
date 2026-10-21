import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, type Supabase } from '@/lib/supabase';

export interface AdminQuery<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
  reload: () => void;
  /** Local optimistic update after a successful write. */
  setData: (update: (prev: T) => T) => void;
}

/** Runs `load` on mount and whenever `key` changes; `load` must only read through RLS. */
export function useAdminQuery<T>(key: string, load: (sb: Supabase) => Promise<T>): AdminQuery<T> {
  const [state, setState] = useState<{ key: string; status: AdminQuery<T>['status']; data: T | null }>({ key: '', status: 'loading', data: null });
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    setState((prev) => ({ key, status: 'loading', data: prev.key === key ? prev.data : null }));
    loadRef
      .current(sb)
      .then((data) => alive && setState({ key, status: 'ready', data }))
      .catch(() => alive && setState({ key, status: 'error', data: null }));
    return () => {
      alive = false;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((update: (prev: T) => T) => setState((s) => (s.data === null ? s : { ...s, data: update(s.data) })), []);
  const status = state.key === key ? state.status : 'loading';
  return { status, data: state.key === key ? state.data : null, reload, setData };
}

/** Throw on PostgREST errors so the query lands in the error state. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** id → title for public items referenced by reports / connect requests. */
export async function publicTitles(sb: Supabase, ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (unique.length === 0) return {};
  const rows = must(await sb.from('public_items').select('id, title').in('id', unique));
  return Object.fromEntries(rows.map((r) => [r.id, r.title]));
}
