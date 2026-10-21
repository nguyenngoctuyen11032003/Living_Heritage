// Profile photo: validation (pure, tested) and upload/remove against the 'avatars' bucket
// (supabase/migrations/20261022000500_profile_avatars.sql: public bucket, writes only to '{user_id}/…').
import { AVATAR_BUCKET } from '@/lib/myProfile';
import type { Supabase } from '@/lib/supabase';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** Must match the bucket's allowed_mime_types. */
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export type AvatarFileError = 'type' | 'size';

export function validateAvatarFile(file: Pick<File, 'type' | 'size'>): AvatarFileError | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > AVATAR_MAX_BYTES) return 'size';
  return null;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/** A fresh object name per upload, so the public URL changes and no cache shows the old photo. */
export function avatarObjectPath(userId: string, type: string, id: string = crypto.randomUUID()): string {
  return `${userId}/${id}.${EXT[type] ?? 'img'}`;
}

/** Uploads the file and points profiles.avatar_path at it; removes the previous object. Returns the new path. */
export async function uploadAvatar(sb: Supabase, userId: string, file: File, previous: string | null): Promise<string> {
  const path = avatarObjectPath(userId, file.type);
  const up = await sb.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (up.error) throw up.error;
  const { error } = await sb.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (error) {
    await sb.storage.from(AVATAR_BUCKET).remove([path]).catch(() => undefined);
    throw error;
  }
  if (previous && previous !== path) await sb.storage.from(AVATAR_BUCKET).remove([previous]).catch(() => undefined);
  return path;
}

/** Clears profiles.avatar_path, then removes the object (best effort). */
export async function removeAvatar(sb: Supabase, userId: string, previous: string | null): Promise<void> {
  const { error } = await sb.from('profiles').update({ avatar_path: null }).eq('id', userId);
  if (error) throw error;
  if (previous) await sb.storage.from(AVATAR_BUCKET).remove([previous]).catch(() => undefined);
}
