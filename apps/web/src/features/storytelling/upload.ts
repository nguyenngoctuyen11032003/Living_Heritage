// Upload a take to the private `recordings` bucket and register it, without ever creating duplicates on retry.
import { BUCKET_RECORDINGS, MAX_AUDIO_BYTES } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';
import type { PendingStore, PendingUpload } from './pendingStore';

/** Object path inside the bucket — exactly three segments, no bucket prefix. */
export function buildRecordingPath(familyId: string, narratorId: string, uuid: string, mime = 'audio/webm'): string {
  return `${familyId}/${narratorId}/${uuid}.${recordingExtension(mime)}`;
}

/** File extension for a recorded MIME type (Safari/iOS records mp4/AAC, everything else webm). */
export function recordingExtension(mime: string): string {
  const base = baseMime(mime);
  if (base === 'audio/mp4' || base === 'audio/x-m4a' || base === 'audio/m4a') return 'm4a';
  if (base === 'audio/aac') return 'aac';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mpeg' || base === 'audio/mp3') return 'mp3';
  if (base === 'audio/wav' || base === 'audio/x-wav') return 'wav';
  return 'webm';
}

/** "audio/webm;codecs=opus" -> "audio/webm" (Storage matches its allow-list on the bare type). */
export function baseMime(mime: string): string {
  return mime.split(';')[0]!.trim().toLowerCase();
}

export type UploadErrorCode = 'network' | 'too_large' | 'forbidden' | 'failed';

export class UploadError extends Error {
  constructor(
    public code: UploadErrorCode,
    /** The file reached Storage before the failure (only the database row is missing). */
    public uploaded = false,
  ) {
    super(code);
  }
}

interface StorageErr {
  message: string;
  statusCode?: string | number;
  status?: number;
}
interface DbErr {
  code?: string;
  message: string;
}

/** The minimal backend surface the upload needs (a fake in tests, Supabase in the app). */
export interface UploadBackend {
  uploadObject(path: string, blob: Blob, contentType: string): Promise<{ error: StorageErr | null }>;
  insertRecording(row: {
    family_id: string;
    narrator_id: string;
    session_id: string;
    question_id: string | null;
    question_text: string | null;
    storage_path: string;
    duration_s: number;
    mime: string;
    size_bytes: number;
  }): Promise<{ id: string | null; error: DbErr | null }>;
  findRecordingId(storagePath: string): Promise<string | null>;
}

export function supabaseUploadBackend(sb: Supabase): UploadBackend {
  return {
    async uploadObject(path, blob, contentType) {
      const { error } = await sb.storage.from(BUCKET_RECORDINGS).upload(path, blob, { contentType, upsert: false });
      return { error: error as StorageErr | null };
    },
    async insertRecording(row) {
      const { data, error } = await sb.from('recordings').insert(row).select('id').single();
      return { id: data?.id ?? null, error };
    },
    async findRecordingId(storagePath) {
      const { data } = await sb.from('recordings').select('id').eq('storage_path', storagePath).maybeSingle();
      return data?.id ?? null;
    },
  };
}

const isDuplicateObject = (e: StorageErr) =>
  String(e.statusCode ?? e.status ?? '') === '409' || /already exists|duplicate/i.test(e.message);
const isNetwork = (e: { message: string }) => /fetch|network|timeout|offline|load failed/i.test(e.message);
const isForbidden = (e: StorageErr | DbErr) =>
  ['403', '42501'].includes(String(('statusCode' in e && e.statusCode) || ('code' in e && e.code) || '')) || /row-level security|unauthori[sz]ed|forbidden/i.test(e.message);

/** Clamp the duration to what the DB accepts (0..610 s, two decimals). */
export function clampDuration(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.round(Math.min(seconds, 610) * 100) / 100;
}

/**
 * Upload + insert for a pending take. Idempotent: the same `attemptId` maps to the same object path, an
 * "already exists" object counts as uploaded, and a duplicate row is looked up instead of inserted again.
 * Returns the recording id and clears the take from the pending store once it is safe on the server.
 */
export async function uploadPending(pending: PendingUpload, backend: UploadBackend, store: PendingStore): Promise<string> {
  if (pending.blob.size > MAX_AUDIO_BYTES) throw new UploadError('too_large');
  if (pending.blob.size === 0) throw new UploadError('failed');
  const path = buildRecordingPath(pending.familyId, pending.narratorId, pending.attemptId, pending.mime);
  let current = pending;

  if (!current.uploaded) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new UploadError('network');
    let res: { error: StorageErr | null };
    try {
      res = await backend.uploadObject(path, current.blob, baseMime(current.mime) || 'audio/webm');
    } catch {
      throw new UploadError('network');
    }
    if (res.error && !isDuplicateObject(res.error)) {
      if (String(res.error.statusCode ?? res.error.status ?? '') === '413' || /exceeded the maximum allowed size|too large/i.test(res.error.message)) throw new UploadError('too_large');
      throw new UploadError(isForbidden(res.error) ? 'forbidden' : isNetwork(res.error) ? 'network' : 'failed');
    }
    current = { ...current, uploaded: true };
    // The file is safe on the server; failing to note that locally must not fail the upload.
    await store.put(current).catch(() => {});
  }

  let recordingId = current.recordingId;
  if (!recordingId) {
    let res: { id: string | null; error: DbErr | null };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new UploadError('network', true);
    try {
      res = await backend.insertRecording({
        family_id: current.familyId,
        narrator_id: current.narratorId,
        session_id: current.sessionId,
        question_id: current.questionId,
        question_text: current.questionText ?? null,
        storage_path: path,
        duration_s: clampDuration(current.duration),
        mime: current.mime.slice(0, 100) || 'audio/webm',
        size_bytes: current.blob.size,
      });
    } catch {
      throw new UploadError('network', true);
    }
    if (res.error) {
      if (res.error.code === '23505') recordingId = await backend.findRecordingId(path);
      if (!recordingId) throw new UploadError(isForbidden(res.error) ? 'forbidden' : isNetwork(res.error) ? 'network' : 'failed', true);
    } else {
      recordingId = res.id;
    }
    if (!recordingId) throw new UploadError('failed', true);
  }

  await store.delete(current.key).catch(() => {});
  return recordingId;
}
