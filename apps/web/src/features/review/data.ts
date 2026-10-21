// Data access for /ban-nhap/:id. Everything goes through RLS with the signed-in (or anonymous narrator) user.
import { BUCKET_RECORDINGS, type Database } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';
import { check, ReviewError } from './errors';
import type { SaveArgs } from './fields';
import type { ConsentMethod } from './approval';

type Tables = Database['public']['Tables'];
export type StoryRow = Tables['stories']['Row'];
export type RecordingRow = Pick<Tables['recordings']['Row'], 'id' | 'storage_path' | 'duration_s' | 'created_at' | 'mime' | 'family_id' | 'narrator_id'>;
export type TranscriptRow = Pick<Tables['transcripts']['Row'], 'id' | 'version' | 'text' | 'created_at'>;
export type AiJobRow = Pick<Tables['ai_jobs']['Row'], 'id' | 'status' | 'error' | 'story_ids' | 'updated_at'>;
export type TopicRow = Pick<Tables['topics']['Row'], 'id' | 'slug' | 'title_vi' | 'title_en'>;
export type NarratorRow = Pick<Tables['narrators']['Row'], 'id' | 'display_name' | 'pen_name' | 'user_id'>;
export type VersionRow = Pick<Tables['story_versions']['Row'], 'id' | 'version' | 'created_at' | 'edit_status' | 'note' | 'title' | 'summary' | 'body' | 'fields'>;
export type SiblingRow = Pick<StoryRow, 'id' | 'kind'>;

export interface ReviewBundle {
  story: StoryRow;
  narrator: NarratorRow | null;
  topic: TopicRow | null;
  recording: RecordingRow | null;
  transcript: TranscriptRow | null;
  job: AiJobRow | null;
  siblings: SiblingRow[];
  isNarratorUser: boolean;
  /** A publish request is waiting for the admin: saving an edit withdraws it (save_story_draft), so warn first. */
  pendingPublish: boolean;
  /** Active topics for the topic select (empty when unreadable: the topic then stays read-only). */
  topics: TopicRow[];
}

export type ReviewLoad =
  | { type: 'story'; bundle: ReviewBundle }
  /** The id is a recording that has no story yet (processing, failed or never started). */
  | { type: 'recording'; recording: RecordingRow; job: AiJobRow | null }
  /** The id is a recording whose stories already exist. */
  | { type: 'redirect'; storyId: string }
  | { type: 'not_found' };

const RECORDING_COLS = 'id, storage_path, duration_s, created_at, mime, family_id, narrator_id';
const JOB_COLS = 'id, status, error, story_ids, updated_at';

export const ACTIVE_JOB_STATUSES = ['queued', 'transcribing', 'drafting'] as const;
export function isJobActive(job: Pick<AiJobRow, 'status'> | null): boolean {
  return !!job && (ACTIVE_JOB_STATUSES as readonly string[]).includes(job.status);
}

/** Mirrors ai-process STALE_JOB_MS: an in-progress job untouched this long died; a new call restarts it. */
export const STALE_JOB_MS = 15 * 60_000;

/** In progress but not updated for STALE_JOB_MS (the function was killed): offer a retry instead of waiting forever. */
export function isJobStale(job: Pick<AiJobRow, 'status' | 'updated_at'> | null, now: number = Date.now()): boolean {
  if (!job || !isJobActive(job)) return false;
  const at = Date.parse(job.updated_at);
  return Number.isFinite(at) && now - at > STALE_JOB_MS;
}

/** Still worth waiting for: active and not stale. */
export function isJobRunning(job: Pick<AiJobRow, 'status' | 'updated_at'> | null, now: number = Date.now()): boolean {
  return isJobActive(job) && !isJobStale(job, now);
}

/** The ai-process response as a job row, so the page follows the job the server is actually running. */
export function jobFromResponse(
  res: { job_id: string; status: AiJobRow['status']; story_ids: string[]; error: string | null },
  nowIso: string = new Date().toISOString(),
): AiJobRow {
  return { id: res.job_id, status: res.status, error: res.error, story_ids: res.story_ids, updated_at: nowIso };
}

export async function latestJob(sb: Supabase, recordingId: string): Promise<AiJobRow | null> {
  const { data, error } = await sb.from('ai_jobs').select(JOB_COLS).eq('recording_id', recordingId).order('created_at', { ascending: false }).limit(1);
  check(error);
  return data?.[0] ?? null;
}

/** Prefer the 'story' kind when a recording produced both a story and an experience. */
export function preferredStoryId(rows: SiblingRow[]): string | null {
  return (rows.find((r) => r.kind === 'story') ?? rows[0])?.id ?? null;
}

async function loadRecordingMode(sb: Supabase, id: string): Promise<ReviewLoad> {
  const { data: rec, error } = await sb.from('recordings').select(RECORDING_COLS).eq('id', id).maybeSingle();
  check(error);
  if (!rec) return { type: 'not_found' };
  const { data: stories, error: sErr } = await sb.from('stories').select('id, kind').eq('recording_id', id).order('created_at');
  check(sErr);
  const target = preferredStoryId(stories ?? []);
  if (target) return { type: 'redirect', storyId: target };
  return { type: 'recording', recording: rec, job: await latestJob(sb, id) };
}

export async function loadReview(sb: Supabase, id: string, userId: string): Promise<ReviewLoad> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { type: 'not_found' };
  const { data: story, error } = await sb.from('stories').select('*').eq('id', id).maybeSingle();
  check(error);
  if (!story) return loadRecordingMode(sb, id);

  const [narratorRes, topicRes, recordingRes, transcriptRes, siblingsRes, jobRes, narratorUserRes, pendingRes, topicsRes] = await Promise.all([
    sb.from('narrators').select('id, display_name, pen_name, user_id').eq('id', story.narrator_id).maybeSingle(),
    story.topic_id ? sb.from('topics').select('id, slug, title_vi, title_en').eq('id', story.topic_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    story.recording_id ? sb.from('recordings').select(RECORDING_COLS).eq('id', story.recording_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    story.recording_id
      ? sb.from('transcripts').select('id, version, text, created_at').eq('recording_id', story.recording_id).order('version', { ascending: false }).limit(1)
      : Promise.resolve({ data: [] as TranscriptRow[], error: null }),
    story.recording_id ? sb.from('stories').select('id, kind').eq('recording_id', story.recording_id).neq('id', story.id) : Promise.resolve({ data: [] as SiblingRow[], error: null }),
    story.recording_id
      ? sb.from('ai_jobs').select(JOB_COLS).eq('recording_id', story.recording_id).order('created_at', { ascending: false }).limit(1)
      : Promise.resolve({ data: [] as AiJobRow[], error: null }),
    sb.rpc('is_narrator_user', { nid: story.narrator_id }),
    sb.from('publish_requests').select('id').eq('story_id', story.id).eq('status', 'pending').limit(1),
    sb.from('topics').select('id, slug, title_vi, title_en').eq('active', true).order('sort'),
  ]);
  // Secondary rows are best-effort: the draft stays usable if one of them is unreadable.
  const narrator = narratorRes.error ? null : narratorRes.data;
  const isNarratorUser = (narrator?.user_id != null && narrator.user_id === userId) || narratorUserRes.data === true;
  return {
    type: 'story',
    bundle: {
      story,
      narrator,
      topic: topicRes.error ? null : topicRes.data,
      recording: recordingRes.error ? null : recordingRes.data,
      transcript: transcriptRes.error ? null : (transcriptRes.data?.[0] ?? null),
      job: jobRes.error ? null : (jobRes.data?.[0] ?? null),
      siblings: siblingsRes.error ? [] : (siblingsRes.data ?? []),
      isNarratorUser,
      pendingPublish: !pendingRes.error && (pendingRes.data?.length ?? 0) > 0,
      topics: topicsRes.error ? [] : (topicsRes.data ?? []),
    },
  };
}

export async function loadVersions(sb: Supabase, storyId: string): Promise<VersionRow[]> {
  const { data, error } = await sb
    .from('story_versions')
    .select('id, version, created_at, edit_status, note, title, summary, body, fields')
    .eq('story_id', storyId)
    .order('version', { ascending: false });
  check(error);
  return data ?? [];
}

/**
 * Save a corrected transcript as a NEW version: the original rows are never changed (DỰ ÁN.md B8). The table's
 * unique(recording_id, version) makes this optimistic: if someone saved version n+1 first, the insert fails
 * with 23505, reported as 'stale_version'.
 */
export async function saveTranscript(sb: Supabase, recordingId: string, currentVersion: number, text: string): Promise<TranscriptRow> {
  const { data, error } = await sb
    .from('transcripts')
    .insert({ recording_id: recordingId, version: currentVersion + 1, text })
    .select('id, version, text, created_at')
    .single();
  if (error && (error as { code?: string }).code === '23505') throw new ReviewError('stale_version');
  check(error);
  if (!data) throw new ReviewError('generic');
  return data;
}

/** The first (original, AI) transcript of a recording, for "show the original" next to a corrected version. */
export async function loadOriginalTranscript(sb: Supabase, recordingId: string): Promise<TranscriptRow | null> {
  const { data, error } = await sb.from('transcripts').select('id, version, text, created_at').eq('recording_id', recordingId).order('version').limit(1);
  check(error);
  return data?.[0] ?? null;
}

export async function signedAudioUrl(sb: Supabase, storagePath: string): Promise<string | null> {
  const { data, error } = await sb.storage.from(BUCKET_RECORDINGS).createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Best-effort: remove public-audio copies after a withdrawal (the reconcile function is idempotent). */
export async function syncPublicAudio(sb: Supabase): Promise<void> {
  try {
    await sb.functions.invoke('public-audio-sync', { body: {} });
  } catch {
    /* the admin job reconciles later */
  }
}

// save_story_draft / approve_story take p_expected_version (migration 20261022000700): the version check and the
// write happen atomically on the server, which raises 'stale_version' when someone saved or confirmed meanwhile.

/** save_story_draft arguments: optimistic lock on the version on screen, and a topic change only when there is one. */
export function saveDraftArgs(storyId: string, args: SaveArgs, expectedVersion: number) {
  const { p_topic_id, ...rest } = args;
  return { p_story: storyId, ...rest, p_expected_version: expectedVersion, ...(p_topic_id ? { p_topic_id } : {}) };
}

/** save_story_draft → new version number. Puts the story back to pending_review and auto-withdraws a public copy. */
export async function saveDraft(sb: Supabase, storyId: string, args: SaveArgs, wasPublic: boolean, expectedVersion: number): Promise<number> {
  const { data, error } = await sb.rpc('save_story_draft', saveDraftArgs(storyId, args, expectedVersion));
  check(error);
  if (typeof data !== 'number') throw new ReviewError('generic');
  if (wasPublic) await syncPublicAudio(sb);
  return data;
}

/** approve_story arguments. `assisted` (owner/manager on the narrator's behalf) also records how the narrator agreed and who helped (B11). */
export function approveArgs(storyId: string, assisted: { method: ConsentMethod; relation: string } | null, expectedVersion: number) {
  return assisted
    ? { p_story: storyId, p_assisted_consent: true, p_consent_method: assisted.method, p_helper_relation: assisted.relation.trim(), p_expected_version: expectedVersion }
    : { p_story: storyId, p_assisted_consent: false, p_expected_version: expectedVersion };
}

/** approve_story → approved version number. Refuses ('stale_version') to approve text the narrator has not seen. */
export async function approve(sb: Supabase, storyId: string, assisted: { method: ConsentMethod; relation: string } | null, expectedVersion: number): Promise<number> {
  const { data, error } = await sb.rpc('approve_story', approveArgs(storyId, assisted, expectedVersion));
  check(error);
  if (typeof data !== 'number') throw new ReviewError('generic');
  return data;
}

/** stories.current_version now (after a conflict, to overwrite the newest version deliberately). */
export async function currentVersion(sb: Supabase, storyId: string): Promise<number> {
  const { data, error } = await sb.from('stories').select('current_version').eq('id', storyId).maybeSingle();
  check(error);
  if (!data) throw new ReviewError('not_found');
  return data.current_version;
}
