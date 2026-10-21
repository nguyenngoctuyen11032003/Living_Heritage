// "Lưu để xem sau": a per-device list in localStorage (never sent to the server).
import { useEffect, useState } from 'react';
import type { StoryKind } from '@lh/shared';
import { getSupabase } from '@/lib/supabase';
import { stillPublicIds } from './api';
import { isUuid, type KnowledgeItem } from './types';

export const SAVED_STORAGE_KEY = 'lh-knowledge-saved';
const EVENT = 'lh-knowledge-saved-change';
const MAX = 200;

export interface SavedEntry {
  id: string;
  title: string;
  kind: StoryKind;
  topicSlug: string | null;
  narratorLabel: string;
  region: string | null;
  savedAt: string;
}

function isEntry(v: unknown): v is SavedEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return typeof e.id === 'string' && typeof e.title === 'string' && (e.kind === 'story' || e.kind === 'experience') && typeof e.savedAt === 'string';
}

export function readSaved(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(SAVED_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

export function writeSaved(list: SavedEntry[]) {
  try {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Storage full or blocked: the list simply isn't persisted.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function toSavedEntry(item: KnowledgeItem, now = new Date()): SavedEntry {
  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    topicSlug: item.topicSlug,
    narratorLabel: item.narratorLabel,
    region: item.region,
    savedAt: now.toISOString(),
  };
}

/** Toggle membership; returns the new state (true = saved). Newest first. */
export function toggleSaved(item: KnowledgeItem): boolean {
  const list = readSaved();
  if (list.some((e) => e.id === item.id)) {
    writeSaved(list.filter((e) => e.id !== item.id));
    return false;
  }
  writeSaved([toSavedEntry(item), ...list]);
  return true;
}

export function removeSaved(id: string) {
  writeSaved(readSaved().filter((e) => e.id !== id));
}

/** Reactive saved list (syncs across components and tabs). */
export function useSavedList(): SavedEntry[] {
  const [list, setList] = useState<SavedEntry[]>(() => readSaved());
  useEffect(() => {
    const sync = () => setList(readSaved());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return list;
}

/** Saved real items that are no longer public (samples and unchecked ids are never listed). */
export function withdrawnIds(list: readonly SavedEntry[], live: ReadonlySet<string>): Set<string> {
  return new Set(list.filter((e) => isUuid(e.id) && !live.has(e.id)).map((e) => e.id));
}

/**
 * Ids in the saved list that the narrator has withdrawn (NT09): their stored title must not be shown again.
 * Best effort: on a network error nothing is marked, the detail page still shows the not-found state.
 */
export function useWithdrawnSaved(list: readonly SavedEntry[]): ReadonlySet<string> {
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
  const key = list
    .map((e) => e.id)
    .filter(isUuid)
    .sort()
    .join(',');
  useEffect(() => {
    const sb = getSupabase();
    const ids = key ? key.split(',') : [];
    if (!sb || ids.length === 0) return;
    let alive = true;
    stillPublicIds(sb, ids)
      .then((live) => {
        if (!alive) return;
        const now = withdrawnIds(
          ids.map((id) => ({ id }) as SavedEntry),
          live,
        );
        setGone((prev) => (prev.size === now.size && [...now].every((id) => prev.has(id)) ? prev : now));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  return gone;
}
