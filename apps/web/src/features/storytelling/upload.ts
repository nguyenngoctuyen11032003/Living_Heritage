// Upload a take to the private `recordings` bucket and register it, without ever creating duplicates on retry.
import { BUCKET_RECORDINGS, MAX_AUDIO_BYTES } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';
import type { PendingStore, PendingUpload } from './pendingStore';

/** Object path inside the bucket — exactly three segments, no bucket prefix. */
export function buildRecordingPath(familyId: string, narratorId: string, uuid: string): string {
  return `${familyId}/${narratorId}/${uuid}.webm`;
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
  const path = buildRecordingPath(pending.familyId, pending.narratorId, pending.attemptId);
  let current = pending;

  if (!current.uploaded) {
    let res: { error: StorageErr | null };
    try {
      res = await backend.uploadObject(path, current.blob, current.mime);
    } catch {
      throw new UploadError('network');
    }
    if (res.error && !isDuplicateObject(res.error)) {
      throw new UploadError(isForbidden(res.error) ? 'forbidden' : isNetwork(res.error) ? 'network' : 'failed');
    }
    current = { ...current, uploaded: true };
    await store.put(current);
  }

  let recordingId = current.recordingId;
  if (!recordingId) {
    let res: { id: string | null; error: DbErr | null };
    try {
      res = await backend.insertRecording({
        family_id: current.familyId,
        narrator_id: current.narratorId,
        session_id: current.sessionId,
        question_id: current.questionId,
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

  await store.delete(current.key);
  return recordingId;
}
