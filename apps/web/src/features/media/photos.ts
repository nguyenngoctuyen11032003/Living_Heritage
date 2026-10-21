// Story photos: validation, resize math, storage paths and the data calls (bucket `media`, table `story_photos`).
// Every call runs as the signed-in user; RLS + storage policies decide what is allowed.
import type { Database } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';

export type StoryPhotoRow = Database['public']['Tables']['story_photos']['Row'];

export const MEDIA_BUCKET = 'media';
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_EDGE = 2000;
export const OUTPUT_QUALITY = 0.85;
export const MAX_CAPTION = 300;
export const SIGNED_URL_TTL = 3600;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];

export type PhotoValidationError = 'type' | 'size' | 'empty';
export type PhotoErrorCode = PhotoValidationError | 'upload' | 'save' | 'forbidden' | 'not_configured' | 'network' | 'unknown';

/** Client-side check before anything leaves the device. Returns null when the file is fine. */
export function validatePhotoFile(file: Pick<File, 'type' | 'size'>): PhotoValidationError | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size <= 0) return 'empty';
  if (file.size > MAX_PHOTO_BYTES) return 'size';
  return null;
}

/** Scale (width, height) down so the longest edge is at most `max`; never upscales; whole pixels, at least 1. */
export function fitWithin(width: number, height: number, max = MAX_EDGE): { width: number; height: number; scaled: boolean } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0, scaled: false };
  const longest = Math.max(width, height);
  if (longest <= max) return { width: Math.round(width), height: Math.round(height), scaled: false };
  const k = max / longest;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)), scaled: true };
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export function extensionFor(mime: string): string {
  return EXT[mime] ?? 'jpg';
}

/** `${familyId}/${uuid}.${ext}`: exactly what the story_photos check constraint and media policies expect. */
export function buildPhotoPath(familyId: string, uuid: string, ext = 'jpg'): string {
  if (!/^[0-9a-f-]{36}$/i.test(familyId)) throw new Error('invalid_family');
  const safeId = uuid.replace(/[^A-Za-z0-9-]/g, '');
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  if (!safeId) throw new Error('invalid_uuid');
  return `${familyId}/${safeId}.${safeExt}`;
}

/** Next position at the end of a story's photo list. */
export function nextPosition(rows: ReadonlyArray<Pick<StoryPhotoRow, 'position'>>): number {
  return rows.reduce((m, r) => Math.max(m, r.position), -1) + 1;
}

/** Move the item at `from` by `delta` (−1 earlier, +1 later). Returns the reordered list (positions renumbered 0..n-1). */
export function movePhoto<T extends { id: string; position: number }>(rows: readonly T[], id: string, delta: -1 | 1): T[] {
  const list = [...rows].sort((a, b) => a.position - b.position);
  const i = list.findIndex((r) => r.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list.map((r, k) => ({ ...r, position: k }));
  [list[i], list[j]] = [list[j]!, list[i]!];
  return list.map((r, k) => ({ ...r, position: k }));
}

/** Map a Supabase/storage/fetch error to a short code for t(`errors.${code}`). */
export function photoErrorCode(err: unknown, fallback: PhotoErrorCode = 'unknown'): PhotoErrorCode {
  const e = (err && typeof err === 'object' ? err : { message: String(err ?? '') }) as { message?: unknown; statusCode?: unknown; code?: unknown };
  const msg = typeof e.message === 'string' ? e.message : '';
  if (/row-level security|permission denied|forbidden|unauthorized|403/i.test(msg) || e.statusCode === '403' || e.code === '42501') return 'forbidden';
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) return 'network';
  return fallback;
}

// ---------------------------------------------------------------------------
// Resize (browser only; injected in tests)
// ---------------------------------------------------------------------------

export interface Resized {
  blob: Blob;
  mime: string;
}

/** Downscale to MAX_EDGE and re-encode as JPEG 0.85. Falls back to the original file if the browser cannot decode it. */
export async function resizeImage(file: File, max = MAX_EDGE): Promise<Resized> {
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return { blob: file, mime: file.type };
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const { width, height, scaled } = fitWithin(bitmap.width, bitmap.height, max);
    // Small JPEGs are uploaded as they are; everything else is re-encoded (also strips EXIF/GPS metadata).
    if (!scaled && file.type === 'image/jpeg' && file.size < 1.5 * 1024 * 1024) {
      bitmap.close?.();
      return { blob: file, mime: file.type };
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { blob: file, mime: file.type };
    ctx.fillStyle = '#ffffff'; // PNG transparency → white, since the output is JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', OUTPUT_QUALITY));
    return blob ? { blob, mime: 'image/jpeg' } : { blob: file, mime: file.type };
  } catch {
    return { blob: file, mime: file.type };
  }
}

// ---------------------------------------------------------------------------
// Data calls
// ---------------------------------------------------------------------------

export interface UploadOptions {
  familyId: string;
  storyId: string;
  caption?: string | null;
  position?: number;
}

export interface UploadDeps {
  sb: Supabase;
  resize?: (file: File) => Promise<Resized>;
  uuid?: () => string;
  /** Stage callback for progress UI. */
  onStage?: (stage: 'resizing' | 'uploading' | 'saving') => void;
}

export class PhotoError extends Error {
  constructor(public code: PhotoErrorCode) {
    super(code);
    this.name = 'PhotoError';
  }
}

/** Validate → downscale → upload to media/{family}/{uuid}.jpg → insert story_photos. Removes the object if the insert fails. */
export async function uploadStoryPhoto(file: File, opts: UploadOptions, deps: UploadDeps): Promise<StoryPhotoRow> {
  const invalid = validatePhotoFile(file);
  if (invalid) throw new PhotoError(invalid);
  const { sb } = deps;
  deps.onStage?.('resizing');
  const { blob, mime } = await (deps.resize ?? resizeImage)(file);
  const path = buildPhotoPath(opts.familyId, (deps.uuid ?? (() => crypto.randomUUID()))(), extensionFor(mime));
  deps.onStage?.('uploading');
  const up = await sb.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: mime, upsert: false, cacheControl: '3600' });
  if (up.error) throw new PhotoError(photoErrorCode(up.error, 'upload'));
  deps.onStage?.('saving');
  const caption = opts.caption?.trim().slice(0, MAX_CAPTION) || null;
  const ins = await sb
    .from('story_photos')
    .insert({ story_id: opts.storyId, family_id: opts.familyId, storage_path: path, caption, position: opts.position ?? 0 })
    .select('*')
    .single();
  if (ins.error || !ins.data) {
    await sb.storage.from(MEDIA_BUCKET).remove([path]).catch(() => undefined);
    throw new PhotoError(photoErrorCode(ins.error, 'save'));
  }
  return ins.data;
}

/**
 * Remove the row (story writers), then the object. Storage deletion is limited to owner/manager by policy:
 * for editors the object removal is a silent no-op, and the file is no longer referenced by any row.
 */
export async function deleteStoryPhoto(sb: Supabase, photo: Pick<StoryPhotoRow, 'id' | 'storage_path'>): Promise<void> {
  const del = await sb.from('story_photos').delete().eq('id', photo.id);
  if (del.error) throw new PhotoError(photoErrorCode(del.error, 'save'));
  await sb.storage.from(MEDIA_BUCKET).remove([photo.storage_path]).catch(() => undefined);
}

export async function updateCaption(sb: Supabase, id: string, caption: string): Promise<void> {
  const res = await sb
    .from('story_photos')
    .update({ caption: caption.trim().slice(0, MAX_CAPTION) || null })
    .eq('id', id);
  if (res.error) throw new PhotoError(photoErrorCode(res.error, 'save'));
}

/** Persist positions for rows whose position changed. */
export async function savePositions(sb: Supabase, before: ReadonlyArray<Pick<StoryPhotoRow, 'id' | 'position'>>, after: ReadonlyArray<Pick<StoryPhotoRow, 'id' | 'position'>>): Promise<void> {
  const old = new Map(before.map((r) => [r.id, r.position]));
  const changed = after.filter((r) => old.get(r.id) !== r.position);
  const results = await Promise.all(changed.map((r) => sb.from('story_photos').update({ position: r.position }).eq('id', r.id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new PhotoError(photoErrorCode(failed.error, 'save'));
}

/** Signed URLs for many paths in one request (chunks of 100). Missing/failed paths are simply absent. */
export async function signPhotoUrls(sb: Supabase, paths: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths)];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const res = await sb.storage.from(MEDIA_BUCKET).createSignedUrls(chunk, SIGNED_URL_TTL);
    if (res.error) continue;
    for (const item of res.data ?? []) if (item.signedUrl && item.path) out.set(item.path, item.signedUrl);
  }
  return out;
}
