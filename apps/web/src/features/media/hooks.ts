import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { SIGNED_URL_TTL, signPhotoUrls, type StoryPhotoRow } from './photos';

export interface PhotoWithUrl extends StoryPhotoRow {
  /** Signed URL (1 h), or null when it could not be created (e.g. no storage access on this device). */
  url: string | null;
}

export type LoadState = 'loading' | 'ready' | 'error' | 'not_configured';

/** Signed URLs live SIGNED_URL_TTL (1 h); lists re-sign 10 minutes before that so open pages keep their images. */
export const URL_REFRESH_MS = (SIGNED_URL_TTL - 10 * 60) * 1000;
/** An image that fails to load triggers a re-sign at most this often (expired URL after sleep, clock skew…). */
export const RESIGN_MIN_GAP_MS = 60 * 1000;

/** Milliseconds until the next scheduled re-sign of URLs signed at `signedAt` (0 = due now). */
export function msUntilResign(signedAt: number, now = Date.now()): number {
  return Math.max(0, signedAt + URL_REFRESH_MS - now);
}

/** Whether a failed image may trigger a re-sign now (throttled, so a broken file cannot loop). */
export function mayResign(lastResignAt: number, now = Date.now()): boolean {
  return now - lastResignAt >= RESIGN_MIN_GAP_MS;
}

/**
 * Keeps signed URLs fresh: re-runs `reload` before they expire, and exposes `onImageError` for <img onError>,
 * which re-signs at most once a minute.
 */
function useFreshUrls(signedAt: number | null, reload: () => Promise<void>): () => void {
  const lastResign = useRef(0);
  useEffect(() => {
    if (signedAt === null) return;
    const id = setTimeout(() => void reload(), msUntilResign(signedAt));
    return () => clearTimeout(id);
  }, [signedAt, reload]);
  return useCallback(() => {
    const now = Date.now();
    if (!mayResign(lastResign.current, now)) return;
    lastResign.current = now;
    void reload();
  }, [reload]);
}

export interface StoryPhotosState {
  photos: PhotoWithUrl[];
  state: LoadState;
  refresh: () => Promise<void>;
  /** Local update after a reorder/caption edit, without a round trip. */
  setPhotos: (next: PhotoWithUrl[]) => void;
  /** For <img onError>: re-sign the URLs (throttled). */
  onImageError: () => void;
}

async function withUrls(sb: Supabase, rows: StoryPhotoRow[]): Promise<PhotoWithUrl[]> {
  const urls = await signPhotoUrls(sb, rows.map((r) => r.storage_path)).catch(() => new Map<string, string>());
  return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
}

/** Photos of one story, ordered by position, with signed URLs (re-signed before they expire). */
export function useStoryPhotos(storyId: string | null | undefined): StoryPhotosState {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [signedAt, setSignedAt] = useState<number | null>(null);
  const seq = useRef(0);
  const loaded = useRef(false);

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
      // A failed background re-sign (or reload after an edit) keeps the photos on screen; the next try fixes it.
      if (!loaded.current) setState('error');
      return;
    }
    const at = Date.now();
    const list = await withUrls(sb, res.data ?? []);
    if (my !== seq.current) return;
    setPhotos(list);
    loaded.current = true;
    setSignedAt(at);
    setState('ready');
    invalidateCover(storyId);
  }, [storyId]);

  useEffect(() => {
    loaded.current = false;
    // New story: never show the previous story's photos while loading.
    setPhotos([]);
    setState('loading');
    void refresh();
  }, [refresh]);

  const onImageError = useFreshUrls(signedAt, refresh);
  return { photos, state, refresh, setPhotos, onImageError };
}

export interface AlbumPhoto extends PhotoWithUrl {
  story_title: string;
  narrator_id: string | null;
}

export interface FamilyPhotosState {
  photos: AlbumPhoto[];
  state: LoadState;
  refresh: () => Promise<void>;
  /** For <img onError>: re-sign the URLs (throttled). */
  onImageError: () => void;
}

export const ALBUM_LIMIT = 500;

/** Every photo of a family the user may read (RLS: can_read_story), newest first, with story title + narrator. */
export function useFamilyPhotos(familyId: string | null | undefined): FamilyPhotosState {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [signedAt, setSignedAt] = useState<number | null>(null);
  const seq = useRef(0);
  const loaded = useRef(false);

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
    // A re-sign of an album already on screen happens in place, without flashing the skeleton.
    if (!loaded.current) setState('loading');
    const res = await sb
      .from('story_photos')
      .select('*, stories(title, narrator_id)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(ALBUM_LIMIT);
    if (my !== seq.current) return;
    if (res.error) {
      // A failed background re-sign keeps the album on screen; the next image error or timer tries again.
      if (!loaded.current) setState('error');
      return;
    }
    const rows = (res.data ?? []) as unknown as Array<StoryPhotoRow & { stories: { title: string; narrator_id: string } | null }>;
    const at = Date.now();
    const signed = await withUrls(sb, rows);
    if (my !== seq.current) return;
    setPhotos(
      signed.map((p, i) => ({
        ...p,
        story_title: rows[i]?.stories?.title ?? '',
        narrator_id: rows[i]?.stories?.narrator_id ?? null,
      })),
    );
    loaded.current = true;
    setSignedAt(at);
    setState('ready');
  }, [familyId]);

  useEffect(() => {
    loaded.current = false;
    void refresh();
  }, [refresh]);

  const onImageError = useFreshUrls(signedAt, refresh);
  return { photos, state, refresh, onImageError };
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
