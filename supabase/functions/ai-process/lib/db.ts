// Every table / column / RPC name used by ai-process lives in this file (spec 1 §7), so a schema
// change is adapted here only. The handler sees the two narrow interfaces below, which the tests fake.
import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET_RECORDINGS, type JobStatus } from '../../_shared/constants.ts';

export class DbError extends Error {
  constructor(op: string, message: string) {
    super(`db ${op}: ${message}`);
    this.name = 'DbError';
  }
}

export interface Localized {
  vi: string;
  en: string;
}

/** A recording plus the session / narrator / topic context needed to draft from it. */
export interface RecordingCtx {
  id: string;
  storage_path: string;
  mime: string | null;
  family_id: string;
  narrator_id: string;
  topic_id: string | null;
  topic: Localized | null;
  question: Localized | null;
}

export interface NarratorCtx {
  id: string;
  family_id: string;
}

export interface JobRow {
  id: string;
  status: JobStatus;
  error: string | null;
  story_ids: string[];
  updated_at: string;
}

export interface TranscriptRow {
  id: string;
  version: number;
  text: string;
}

export interface StoryInsert {
  family_id: string;
  narrator_id: string;
  recording_id: string;
  kind: 'story' | 'experience';
  title: string;
  summary: string | null;
  body: string;
  fields: Record<string, unknown>;
  topic_id: string | null;
  lang: string;
  created_by: string;
}

/** ai_usage: metadata only, never audio, transcript or output content. */
export interface UsageRow {
  user_id: string;
  job_id: string | null;
  action: string;
  model: string;
  /** 'ok' or the failure kind (e.g. 'timeout', 'unavailable', 'invalid_output'). */
  status: string;
  latency_ms: number;
  input_bytes: number;
}

/** Reads made as the caller (anon key + JWT): RLS decides what is visible. */
export interface UserDb {
  /** Validates the JWT; the user id, or null when invalid / expired. */
  getUserId(): Promise<string | null>;
  getRecording(id: string): Promise<RecordingCtx | null>;
  /** Same rule as the transcripts insert policy: a family editor or the narrator's own user. */
  canContribute(familyId: string, narratorId: string): Promise<boolean>;
  getNarrator(id: string): Promise<NarratorCtx | null>;
  getTopic(id: string): Promise<Localized | null>;
  recentApprovedTitles(narratorId: string, limit: number): Promise<string[]>;
}

/** service_role operations, used only after access was proven through UserDb. */
export interface AdminDb {
  /** Inserts a `queued` job unless one exists for (recording_id, kind); returns the row either way. */
  getOrCreateJob(recordingId: string, kind: string, userId: string): Promise<{ job: JobRow; created: boolean }>;
  /** Compare-and-set back to `queued` (only if status / updated_at are still those of `job`). */
  restartJob(job: JobRow, nowIso: string): Promise<boolean>;
  updateJob(id: string, patch: { status: JobStatus; error?: string | null; story_ids?: string[] }, nowIso: string): Promise<void>;
  quotaConsume(userId: string, limit: number): Promise<boolean>;
  quotaRefund(userId: string): Promise<void>;
  downloadAudio(path: string, maxBytes: number): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: 'missing' | 'too_large' }>;
  latestTranscript(recordingId: string): Promise<TranscriptRow | null>;
  insertTranscript(recordingId: string, text: string, uncertain: string[], userId: string): Promise<TranscriptRow>;
  setTranscriptUncertain(id: string, uncertain: string[]): Promise<void>;
  /** Inserts drafts (edit_status 'draft', visibility 'private'); ids in the order of `rows`. */
  insertStories(rows: StoryInsert[]): Promise<string[]>;
  logUsage(row: UsageRow): Promise<void>;
}

// ---------------------------------------------------------------------------
// supabase-js implementations
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
type Client = SupabaseClient<any, any, any>;
type Row = Record<string, unknown>;

function check(op: string, error: { message: string } | null): void {
  if (error) throw new DbError(op, error.message);
}

function localized(v: unknown, vi: string, en: string): Localized | null {
  const r = (Array.isArray(v) ? v[0] : v) as Row | null | undefined;
  if (!r || typeof r[vi] !== 'string') return null;
  return { vi: r[vi] as string, en: typeof r[en] === 'string' ? (r[en] as string) : (r[vi] as string) };
}

function one(v: unknown): Row | null {
  return ((Array.isArray(v) ? v[0] : v) as Row | null | undefined) ?? null;
}

const JOB_COLS = 'id, status, error, story_ids, updated_at';

function toJob(r: Row): JobRow {
  return {
    id: String(r.id),
    status: r.status as JobStatus,
    error: (r.error as string | null) ?? null,
    story_ids: Array.isArray(r.story_ids) ? (r.story_ids as string[]) : [],
    updated_at: String(r.updated_at ?? ''),
  };
}

export function createUserDb(client: Client, jwt: string): UserDb {
  return {
    async getUserId() {
      const { data, error } = await client.auth.getUser(jwt);
      return error || !data.user ? null : data.user.id;
    },

    async getRecording(id) {
      const { data, error } = await client
        .from('recordings')
        .select(
          'id, family_id, narrator_id, storage_path, mime, ' +
            'session:sessions(topic_id, topic:topics(title_vi, title_en)), question:questions(prompt_vi, prompt_en)',
        )
        .eq('id', id)
        .maybeSingle();
      check('getRecording', error);
      if (!data) return null;
      const r = data as unknown as Row;
      const session = one(r.session);
      return {
        id: String(r.id),
        storage_path: String(r.storage_path),
        mime: (r.mime as string | null) ?? null,
        family_id: String(r.family_id),
        narrator_id: String(r.narrator_id),
        topic_id: (session?.topic_id as string | null) ?? null,
        topic: localized(session?.topic, 'title_vi', 'title_en'),
        question: localized(r.question, 'prompt_vi', 'prompt_en'),
      };
    },

    async canContribute(familyId, narratorId) {
      const [editor, narratorUser] = await Promise.all([
        client.rpc('is_family_editor', { fid: familyId }),
        client.rpc('is_narrator_user', { nid: narratorId }),
      ]);
      check('canContribute.is_family_editor', editor.error);
      check('canContribute.is_narrator_user', narratorUser.error);
      return editor.data === true || narratorUser.data === true;
    },

    async getNarrator(id) {
      const { data, error } = await client.from('narrators').select('id, family_id').eq('id', id).maybeSingle();
      check('getNarrator', error);
      return data ? { id: String((data as Row).id), family_id: String((data as Row).family_id) } : null;
    },

    async getTopic(id) {
      const { data, error } = await client.from('topics').select('title_vi, title_en').eq('id', id).maybeSingle();
      check('getTopic', error);
      return localized(data, 'title_vi', 'title_en');
    },

    async recentApprovedTitles(narratorId, limit) {
      const { data, error } = await client
        .from('stories')
        .select('title')
        .eq('narrator_id', narratorId)
        .eq('edit_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit);
      check('recentApprovedTitles', error);
      return ((data ?? []) as Row[]).map((r) => String(r.title ?? '')).filter((t) => t.trim() !== '');
    },
  };
}

export function createAdminDb(client: Client): AdminDb {
  return {
    async getOrCreateJob(recordingId, kind, userId) {
      const ins = await client
        .from('ai_jobs')
        .upsert({ recording_id: recordingId, kind, status: 'queued', created_by: userId }, {
          onConflict: 'recording_id,kind',
          ignoreDuplicates: true,
        })
        .select(JOB_COLS);
      check('getOrCreateJob.insert', ins.error);
      const created = ((ins.data ?? []) as Row[])[0];
      if (created) return { job: toJob(created), created: true };
      const { data, error } = await client.from('ai_jobs').select(JOB_COLS).eq('recording_id', recordingId).eq('kind', kind).single();
      check('getOrCreateJob.select', error);
      return { job: toJob(data as Row), created: false };
    },

    async restartJob(job, nowIso) {
      const { data, error } = await client
        .from('ai_jobs')
        .update({ status: 'queued', error: null, story_ids: [], updated_at: nowIso })
        .eq('id', job.id)
        .eq('status', job.status)
        .eq('updated_at', job.updated_at)
        .select('id');
      check('restartJob', error);
      return ((data ?? []) as Row[]).length > 0;
    },

    async updateJob(id, patch, nowIso) {
      const { error } = await client.from('ai_jobs').update({ ...patch, updated_at: nowIso }).eq('id', id);
      check('updateJob', error);
    },

    async quotaConsume(userId, limit) {
      const { data, error } = await client.rpc('ai_quota_consume', { p_user: userId, p_limit: limit });
      check('quotaConsume', error);
      return data === true;
    },

    async quotaRefund(userId) {
      const { error } = await client.rpc('ai_quota_refund', { p_user: userId });
      check('quotaRefund', error);
    },

    async downloadAudio(path, maxBytes) {
      const { data, error } = await client.storage.from(BUCKET_RECORDINGS).download(path);
      if (error || !data) return { ok: false, reason: 'missing' };
      if (data.size > maxBytes) return { ok: false, reason: 'too_large' };
      return { ok: true, bytes: new Uint8Array(await data.arrayBuffer()) };
    },

    async latestTranscript(recordingId) {
      const { data, error } = await client
        .from('transcripts')
        .select('id, version, text')
        .eq('recording_id', recordingId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      check('latestTranscript', error);
      if (!data) return null;
      const r = data as Row;
      return { id: String(r.id), version: Number(r.version), text: String(r.text ?? '') };
    },

    async insertTranscript(recordingId, text, uncertain, userId) {
      const { data, error } = await client
        .from('transcripts')
        .insert({ recording_id: recordingId, version: 1, text, uncertain_spans: uncertain, created_by: userId })
        .select('id, version, text')
        .single();
      check('insertTranscript', error);
      const r = data as Row;
      return { id: String(r.id), version: Number(r.version), text: String(r.text ?? '') };
    },

    async setTranscriptUncertain(id, uncertain) {
      const { error } = await client.from('transcripts').update({ uncertain_spans: uncertain }).eq('id', id);
      check('setTranscriptUncertain', error);
    },

    async insertStories(rows) {
      const payload = rows.map((r) => ({ ...r, edit_status: 'draft', visibility: 'private' }));
      const { data, error } = await client.from('stories').insert(payload).select('id, kind');
      check('insertStories', error);
      const out = (data ?? []) as Row[];
      // Map back by kind (at most one row per kind), independent of the order PostgREST returns.
      return rows.map((r) => {
        const hit = out.find((o) => o.kind === r.kind);
        if (!hit) throw new DbError('insertStories', `missing ${r.kind} row`);
        return String(hit.id);
      });
    },

    async logUsage(row) {
      // Best effort: a logging failure never fails the request.
      try {
        await client.from('ai_usage').insert(row);
      } catch {
        // ignore
      }
    },
  };
}
