import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { signPhotoUrls, type StoryPhotoRow } from './photos';

export interface PhotoWithUrl extends StoryPhotoRow {
  /** Signed URL (1 h), or null when it could not be created (e.g. no storage access on this device). */
  url: string | null;
}

export type LoadState = 'loading' | 'ready' | 'error' | 'not_configured';

export interface StoryPhotosState {
  photos: PhotoWithUrl[];
  state: LoadState;
  refresh: () => Promise<void>;
  /** Local update after a reorder/caption edit, without a round trip. */
  setPhotos: (next: PhotoWithUrl[]) => void;
}

async function withUrls(sb: Supabase, rows: StoryPhotoRow[]): Promise<PhotoWithUrl[]> {
  const urls = await signPhotoUrls(sb, rows.map((r) => r.storage_path)).catch(() => new Map<string, string>());
  return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
}

/** Photos of one story, ordered by position, with signed URLs. */
export function useStoryPhotos(storyId: string | null | undefined): StoryPhotosState {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setState('not_configured');
      return;
    }
    if (!storyId) {
      setPhotos([]);
      setState('ready');
      return;
    }
    const my = ++seq.current;
    const res = await sb.from('story_photos').select('*').eq('story_id', storyId).order('position').order('created_at');
    if (my !== seq.current) return;
    if (res.error) {
      setState('error');
      return;
    }
    const list = await withUrls(sb, res.data ?? []);
    if (my !== seq.current) return;
    setPhotos(list);
    setState('ready');
    invalidateCover(storyId);
  }, [storyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { photos, state, refresh, setPhotos };
}

export interface AlbumPhoto extends PhotoWithUrl {
  story_title: string;
  narrator_id: string | null;
}

export interface FamilyPhotosState {
  photos: AlbumPhoto[];
  state: LoadState;
  refresh: () => Promise<void>;
}

export const ALBUM_LIMIT = 500;

/** Every photo of a family the user may read (RLS: can_read_story), newest first, with story title + narrator. */
export function useFamilyPhotos(familyId: string | null | undefined): FamilyPhotosState {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setState('not_configured');
      return;
    }
    if (!familyId) {
      setPhotos([]);
      setState('ready');
      return;
    }
    const my = ++seq.current;
    setState('loading');
    const res = await sb
      .from('story_photos')
      .select('*, stories(title, narrator_id)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(ALBUM_LIMIT);
    if (my !== seq.current) return;
    if (res.error) {
      setState('error');
      return;
    }
    const rows = (res.data ?? []) as unknown as Array<StoryPhotoRow & { stories: { title: string; narrator_id: string } | null }>;
    const signed = await withUrls(sb, rows);
    if (my !== seq.current) return;
    setPhotos(
      signed.map((p, i) => ({
        ...p,
        story_title: rows[i]?.stories?.title ?? '',
        narrator_id: rows[i]?.stories?.narrator_id ?? null,
      })),
    );
    setState('ready');
  }, [familyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { photos, state, refresh };
}

// ---------------------------------------------------------------------------
// Story card covers: one batched query + one createSignedUrls for every card that scrolls into view together.
// ---------------------------------------------------------------------------

type CoverEntry = { url: string | null; at: number };
const coverCache = new Map<string, CoverEntry>();
const coverListeners = new Map<string, Set<(url: string | null) => void>>();
let pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
const COVER_TTL_MS = 50 * 60 * 1000; // signed URLs live 60 min

function emit(storyId: string, url: string | null) {
  coverCache.set(storyId, { url, at: Date.now() });
  for (const fn of coverListeners.get(storyId) ?? []) fn(url);
}

async function flushCovers() {
  timer = null;
  const ids = [...pending];
  pending = new Set();
  const sb = getSupabase();
  if (!sb || ids.length === 0) return;
  const res = await sb.from('story_photos').select('story_id, storage_path, position').in('story_id', ids).order('position').order('created_at');
  if (res.error) return; // keep the illustration; try again next mount
  const first = new Map<string, string>();
  for (const r of res.data ?? []) if (!first.has(r.story_id)) first.set(r.story_id, r.storage_path);
  const urls = await signPhotoUrls(sb, [...first.values()]).catch(() => new Map<string, string>());
  for (const id of ids) {
    const path = first.get(id);
    emit(id, path ? (urls.get(path) ?? null) : null);
  }
}

function requestCover(storyId: string) {
  const hit = coverCache.get(storyId);
  if (hit && Date.now() - hit.at < COVER_TTL_MS) return;
  pending.add(storyId);
  timer ??= setTimeout(() => void flushCovers(), 40);
}

/** Forget a story's cover (after photos change) so the next card mount fetches it again. */
export function invalidateCover(storyId: string) {
  coverCache.delete(storyId);
}

/**
 * Cover photo URL of a story (its first photo), or null. Fetches only once the returned ref's element is near the
 * viewport, batching every visible card into a single request.
 */
export function useStoryCover<E extends Element>(storyId: string) {
  const ref = useRef<E | null>(null);
  const [url, setUrl] = useState<string | null>(() => coverCache.get(storyId)?.url ?? null);

  useEffect(() => {
    const set = coverListeners.get(storyId) ?? new Set();
    set.add(setUrl);
    coverListeners.set(storyId, set);
    setUrl(coverCache.get(storyId)?.url ?? null);
    const el = ref.current;
    let io: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            requestCover(storyId);
            io?.disconnect();
          }
        },
        { rootMargin: '200px' },
      );
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      set.delete(setUrl);
    };
  }, [storyId]);

  return { ref, url };
}
