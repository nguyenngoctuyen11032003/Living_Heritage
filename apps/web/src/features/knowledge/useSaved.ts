// One hook for "Lưu để xem sau": device storage when signed out, the account's saved_items when signed in.
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSession } from '@/lib/session';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { addSavedItems, listSavedItems, removeSavedItem } from './api';
import { removeSaved, toggleSaved, toSavedEntry, useSavedList, type SavedEntry } from './saved';
import { SavedAccountStore, type AccountSnapshot } from './saved-account';
import { isUuid, type KnowledgeItem } from './types';

export interface SavedState {
  /** 'account' = saved_items is the source of truth (signed in); 'device' = this browser only. */
  mode: 'device' | 'account';
  status: 'loading' | 'ready' | 'error';
  list: SavedEntry[];
  mergeFailed: boolean;
  isSaved: (id: string) => boolean;
  /** Resolves to the new state (true = saved); rejects when the account could not be updated. */
  toggle: (item: KnowledgeItem) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  retry: () => void;
}

let store: SavedAccountStore | null = null;

function accountStore(sb: Supabase, userId: string): SavedAccountStore {
  if (!store || store.userId !== userId) {
    store = new SavedAccountStore(
      {
        list: () => listSavedItems(sb),
        add: (ids) => addSavedItems(sb, userId, ids),
        remove: (id) => removeSavedItem(sb, id),
      },
      userId,
    );
  }
  return store;
}

const IDLE: AccountSnapshot = { status: 'ready', entries: [], mergeFailed: false };
const noopSubscribe = () => () => {};

export function useSaved(): SavedState {
  const { user, loading, isAnonymous } = useSession();
  const sb = getSupabase();
  const device = useSavedList();
  // Anonymous narrator-link sessions are not visitor accounts: they keep the device list.
  const s = sb && user && !isAnonymous ? accountStore(sb, user.id) : null;
  const snap = useSyncExternalStore(s ? s.subscribe : noopSubscribe, s ? s.getSnapshot : () => IDLE);

  useEffect(() => {
    void s?.ensureLoaded();
  }, [s]);

  // Signed out: drop the cached account list so the next sign-in (same or another user) merges and loads afresh.
  const signedOut = !loading && !s;
  useEffect(() => {
    if (signedOut) store = null;
  }, [signedOut]);

  const list = useMemo(() => {
    if (!s) return device;
    // Samples are never public items, so they stay on the device even when signed in.
    const samples = device.filter((e) => !isUuid(e.id));
    return [...snap.entries, ...samples].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }, [s, snap.entries, device]);

  const isSaved = useCallback((id: string) => list.some((e) => e.id === id), [list]);

  const toggle = useCallback(
    async (item: KnowledgeItem) => {
      if (!s || !isUuid(item.id)) return toggleSaved(item);
      return s.toggle(item, toSavedEntry(item));
    },
    [s],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!s || !isUuid(id)) removeSaved(id);
      else await s.remove(id);
    },
    [s],
  );

  const retry = useCallback(() => void s?.reload(), [s]);

  return {
    mode: s ? 'account' : 'device',
    status: loading && sb ? 'loading' : s ? snap.status : 'ready',
    list,
    mergeFailed: s ? snap.mergeFailed : false,
    isSaved,
    toggle,
    remove,
    retry,
  };
}
