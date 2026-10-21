// Small Supabase queries and hooks for storytelling mode (kept local on purpose: no dependency on features/narrators).
import type { EditStatus, MemberRole, StoryKind } from '@lh/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useCurrentFamily } from '@/features/families/current';
import { useSession } from '@/lib/session';
import { getSupabase, type Supabase } from '@/lib/supabase';

export const NARRATOR_STORAGE_KEY = 'lh.narratorId';

export interface NarratorInfo {
  id: string;
  family_id: string;
  display_name: string;
  pen_name: string | null;
  user_id: string | null;
  family_name: string | null;
}

export interface Topic {
  id: string;
  slug: string;
  title_vi: string;
  title_en: string;
  icon: string | null;
  sort: number;
}

export interface Question {
  id: string;
  topic_id: string;
  prompt_vi: string;
  prompt_en: string;
  kind_hint: StoryKind | null;
  sort: number;
}

export interface SessionRow {
  id: string;
  family_id: string;
  narrator_id: string;
  topic_id: string | null;
  ended_at: string | null;
}

export interface MyStory {
  id: string;
  title: string;
  kind: StoryKind;
  edit_status: EditStatus;
  created_at: string;
}

const NARRATOR_COLUMNS = 'id, family_id, display_name, pen_name, user_id, families(name)';

type NarratorRow = Omit<NarratorInfo, 'family_name'> & { families: { name: string } | { name: string }[] | null };

function toNarrator(row: NarratorRow): NarratorInfo {
  const fam = Array.isArray(row.families) ? row.families[0] : row.families;
  return { id: row.id, family_id: row.family_id, display_name: row.display_name, pen_name: row.pen_name, user_id: row.user_id, family_name: fam?.name ?? null };
}

export async function fetchNarratorById(sb: Supabase, id: string): Promise<NarratorInfo | null> {
  const { data, error } = await sb.from('narrators').select(NARRATOR_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toNarrator(data as unknown as NarratorRow) : null;
}

/** The narrator(s) bound to this signed-in (usually anonymous) user; prefers `preferredId` when several. */
export async function fetchNarratorForUser(sb: Supabase, userId: string, preferredId: string | null): Promise<NarratorInfo | null> {
  const { data, error } = await sb.from('narrators').select(NARRATOR_COLUMNS).eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as NarratorRow[];
  const row = rows.find((r) => r.id === preferredId) ?? rows[0];
  return row ? toNarrator(row) : null;
}

export async function fetchTopics(sb: Supabase): Promise<Topic[]> {
  const { data, error } = await sb.from('topics').select('id, slug, title_vi, title_en, icon, sort').order('sort', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Topic[];
}

const QUESTION_COLUMNS = 'id, topic_id, prompt_vi, prompt_en, kind_hint, sort';

export async function fetchQuestions(sb: Supabase, topicId: string): Promise<Question[]> {
  const { data, error } = await sb.from('questions').select(QUESTION_COLUMNS).eq('topic_id', topicId).order('sort', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Question[];
}

export async function fetchAllQuestions(sb: Supabase): Promise<Question[]> {
  const { data, error } = await sb.from('questions').select(QUESTION_COLUMNS).order('sort', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Question[];
}

export async function createSession(sb: Supabase, input: { family_id: string; narrator_id: string; topic_id: string | null }): Promise<string> {
  const { data, error } = await sb.from('sessions').insert(input).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function fetchSession(sb: Supabase, id: string): Promise<SessionRow | null> {
  const { data, error } = await sb.from('sessions').select('id, family_id, narrator_id, topic_id, ended_at').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as SessionRow | null;
}

export async function endSession(sb: Supabase, id: string): Promise<void> {
  await sb.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', id);
}

/** Question ids already answered in this session (recordings with a question). */
export async function fetchAnsweredQuestionIds(sb: Supabase, sessionId: string): Promise<string[]> {
  const { data } = await sb.from('recordings').select('question_id').eq('session_id', sessionId);
  return (data ?? []).map((r) => r.question_id).filter((id): id is string => !!id);
}

export async function fetchMyStories(sb: Supabase, narratorId: string): Promise<MyStory[]> {
  const { data, error } = await sb
    .from('stories')
    .select('id, title, kind, edit_status, created_at')
    .eq('narrator_id', narratorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyStory[];
}

/** Latest AI job status for a recording (for the "Đang chép lời… / Đang viết bản nháp…" text); null if unreadable. */
export async function fetchJobStatus(sb: Supabase, recordingId: string): Promise<string | null> {
  const { data } = await sb.from('ai_jobs').select('status').eq('recording_id', recordingId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data?.status ?? null;
}

export function readStoredNarratorId(): string | null {
  try {
    return localStorage.getItem(NARRATOR_STORAGE_KEY);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T };

/** Run an async loader; `reload()` re-runs it. Stale results from an earlier run are dropped. */
export function useAsync<T>(load: () => Promise<T>, deps: React.DependencyList): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    load().then(
      (data) => alive && setState({ status: 'ready', data }),
      (error: unknown) => alive && setState({ status: 'error', error }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return useMemo(() => ({ ...state, reload }), [state, reload]);
}

const EDITOR_ROLES: readonly MemberRole[] = ['owner', 'manager', 'editor'];

export type StorytellerContext =
  | { status: 'loading' }
  | { status: 'not-configured' }
  | { status: 'error'; retry: () => void }
  /** Signed in, but no narrator is bound to this device and none was asked for. */
  | { status: 'no-narrator'; isAnonymous: boolean }
  /** Asked for a narrator the user may not record for. */
  | { status: 'forbidden' }
  | { status: 'ready'; narrator: NarratorInfo; assisted: boolean; /** `?narrator=…` to carry along links (assisted mode only) */ query: string };

/**
 * Who is telling? (a) the narrator user bound to this device by /k/:token, or (b) a family editor
 * recording for `?narrator=<id>` (assisted mode: the narrator approves later).
 */
export function useStoryteller(): StorytellerContext {
  const sb = getSupabase();
  const [params] = useSearchParams();
  const assistedId = params.get('narrator');
  const { user, isAnonymous } = useSession();
  const family = useCurrentFamily();
  const userId = user?.id ?? null;

  const result = useAsync<NarratorInfo | null>(async () => {
    if (!sb || !userId) return null;
    if (assistedId) return fetchNarratorById(sb, assistedId);
    const stored = readStoredNarratorId();
    const own = await fetchNarratorForUser(sb, userId, stored);
    if (own) return own;
    // A family editor who opened storytelling mode from a narrator page earlier on this device.
    if (stored && !isAnonymous) return fetchNarratorById(sb, stored);
    return null;
  }, [sb, userId, assistedId, isAnonymous]);

  if (!sb) return { status: 'not-configured' };
  if (result.status === 'loading' || (!isAnonymous && family.loading)) return { status: 'loading' };
  if (result.status === 'error') return { status: 'error', retry: result.reload };
  const narrator = result.data;
  if (!narrator) return assistedId ? { status: 'forbidden' } : { status: 'no-narrator', isAnonymous };
  if (narrator.user_id && narrator.user_id === userId) return { status: 'ready', narrator, assisted: false, query: '' };
  const role = family.families.find((f) => f.id === narrator.family_id)?.role;
  if (!role || !EDITOR_ROLES.includes(role)) return { status: 'forbidden' };
  return { status: 'ready', narrator, assisted: true, query: `?narrator=${encodeURIComponent(narrator.id)}` };
}

/** Same rules for a session page: the narrator comes from the session row. */
export function useIsNarratorOrEditor(narrator: NarratorInfo | null): { allowed: boolean; assisted: boolean; loading: boolean } {
  const { user } = useSession();
  const family = useCurrentFamily();
  if (!narrator) return { allowed: false, assisted: false, loading: false };
  if (narrator.user_id && narrator.user_id === user?.id) return { allowed: true, assisted: false, loading: false };
  if (family.loading) return { allowed: false, assisted: true, loading: true };
  const role = family.families.find((f) => f.id === narrator.family_id)?.role;
  return { allowed: !!role && EDITOR_ROLES.includes(role), assisted: true, loading: false };
}
