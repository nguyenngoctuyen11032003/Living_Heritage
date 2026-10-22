// Data access for /ban-nhap/:id. Everything goes through RLS with the signed-in (or anonymous narrator) user.
import { BUCKET_RECORDINGS, type Database } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';
import { check, ReviewError } from './errors';
import type { SaveArgs } from './fields';

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

/** A job that has not moved for this long is treated as stuck: the user can retry instead of waiting forever. */
export const JOB_STALE_MS = 5 * 60 * 1000;
export function isJobStale(job: Pick<AiJobRow, 'status' | 'updated_at'> | null, now: number = Date.now()): boolean {
  if (!job || !isJobActive(job)) return false;
  const t = Date.parse(job.updated_at);
  return Number.isFinite(t) && now - t > JOB_STALE_MS;
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

  const [narratorRes, topicRes, recordingRes, transcriptRes, siblingsRes, jobRes, narratorUserRes] = await Promise.all([
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

/** save_story_draft → new version number. Puts the story back to pending_review and auto-withdraws a public copy. */
export async function saveDraft(sb: Supabase, storyId: string, args: SaveArgs, wasPublic: boolean): Promise<number> {
  const { data, error } = await sb.rpc('save_story_draft', { p_story: storyId, ...args });
  check(error);
  if (typeof data !== 'number') throw new ReviewError('generic');
  if (wasPublic) await syncPublicAudio(sb);
  return data;
}

export async function loadTopics(sb: Supabase): Promise<TopicRow[]> {
  const { data, error } = await sb.from('topics').select('id, slug, title_vi, title_en').order('sort');
  check(error);
  return data ?? [];
}

/**
 * save_story_draft, then (only if the topic changed) stories.topic_id. The topic is not an argument of the RPC;
 * the table grants update (topic_id). If the topic write fails the draft is already saved: throws ReviewError('topic_failed').
 */
export async function saveDraftWithTopic(sb: Supabase, storyId: string, args: SaveArgs, wasPublic: boolean, topicId: string | null | undefined): Promise<number> {
  const v = await saveDraft(sb, storyId, args, wasPublic);
  if (topicId === undefined) return v;
  const { data, error } = await sb.from('stories').update({ topic_id: topicId }).eq('id', storyId).select('id');
  if (error || !data || data.length === 0) throw new ReviewError('topic_failed');
  return v;
}

/** approve_story → approved version number. `assisted` records an owner/manager approval with the narrator's consent. */
export async function approve(sb: Supabase, storyId: string, assisted: boolean): Promise<number> {
  const { data, error } = await sb.rpc('approve_story', { p_story: storyId, p_assisted_consent: assisted });
  check(error);
  if (typeof data !== 'number') throw new ReviewError('generic');
  return data;
}

/** Corrections to the transcript are stored as a new version (earlier text stays in history). Returns the saved row. */
export async function saveTranscript(sb: Supabase, recordingId: string, text: string): Promise<TranscriptRow> {
  const { data: latest, error: lErr } = await sb.from('transcripts').select('version').eq('recording_id', recordingId).order('version', { ascending: false }).limit(1);
  check(lErr);
  const version = (latest?.[0]?.version ?? 0) + 1;
  const { data, error } = await sb.from('transcripts').insert({ recording_id: recordingId, version, text }).select('id, version, text, created_at').single();
  check(error);
  if (!data) throw new ReviewError('generic');
  return data;
}
