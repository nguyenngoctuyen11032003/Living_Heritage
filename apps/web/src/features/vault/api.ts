// Data access for the family vault. Every query runs as the signed-in user; RLS decides which rows come back.
import type { Supabase } from '@/lib/supabase';
import { filterStories, ilikeOrFilter, mergeById, type VaultFilters } from './filter';
import { STORY_COLUMNS, type NarratorLite, type RecordingLite, type TopicLite, type VaultStory } from './types';

export const PAGE_SIZE = 24;
/** Upper bound of rows scanned for the diacritic-insensitive client-side search. */
export const SEARCH_SCAN_LIMIT = 500;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function fetchNarrators(sb: Supabase, familyId: string): Promise<NarratorLite[]> {
  return check(await sb.from('narrators').select('id, display_name, pen_name').eq('family_id', familyId).order('created_at'));
}

export async function fetchTopics(sb: Supabase): Promise<TopicLite[]> {
  return check(await sb.from('topics').select('id, slug, title_vi, title_en').order('sort'));
}

export async function fetchRecordings(sb: Supabase, ids: string[]): Promise<RecordingLite[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  return check(await sb.from('recordings').select('id, duration_s, created_at, storage_path').in('id', unique));
}

/* eslint-disable @typescript-eslint/no-explicit-any -- the postgrest builder type differs per call; we only chain filters. */
function applyServerFilters(query: any, familyId: string, f: VaultFilters): any {
  let q = query.eq('family_id', familyId);
  if (f.narratorId) q = q.eq('narrator_id', f.narratorId);
  if (f.topicId === 'none') q = q.is('topic_id', null);
  else if (f.topicId) q = q.eq('topic_id', f.topicId);
  if (f.status) q = q.eq('edit_status', f.status);
  if (f.kind) q = q.eq('kind', f.kind);
  return q;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** One page of stories, newest first, server-side filters only (no text query). */
export async function fetchStoriesPage(sb: Supabase, familyId: string, f: VaultFilters, offset: number, limit = PAGE_SIZE): Promise<VaultStory[]> {
  const query = applyServerFilters(sb.from('stories').select(STORY_COLUMNS), familyId, f)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return check(await query) as VaultStory[];
}

/**
 * Text search: a server ilike (exact accents) merged with a client-side, diacritic-insensitive pass over
 * the most recent SEARCH_SCAN_LIMIT stories, so "banh chung" also finds "Bánh chưng".
 */
export async function searchStories(sb: Supabase, familyId: string, f: VaultFilters, topics: readonly TopicLite[] = []): Promise<VaultStory[]> {
  const or = ilikeOrFilter(f.q);
  const scan = applyServerFilters(sb.from('stories').select(STORY_COLUMNS), familyId, f)
    .order('created_at', { ascending: false })
    .limit(SEARCH_SCAN_LIMIT);
  const server = or
    ? applyServerFilters(sb.from('stories').select(STORY_COLUMNS), familyId, f).or(or).order('created_at', { ascending: false }).limit(200)
    : null;
  const [scanned, matched] = await Promise.all([scan, server ?? Promise.resolve({ data: [], error: null })]);
  const topicText = new Map(topics.map((tp) => [tp.id, `${tp.title_vi} ${tp.title_en}`]));
  const local = filterStories(check(scanned) as VaultStory[], f, (id) => topicText.get(id) ?? '');
  return mergeById(check(matched) as VaultStory[], local);
}

export interface VaultStats {
  approved: number;
  pending: number;
  audioSeconds: number;
}

export async function fetchStats(sb: Supabase, familyId: string): Promise<VaultStats> {
  const [approved, pending, audio] = await Promise.all([
    sb.from('stories').select('id', { count: 'exact', head: true }).eq('family_id', familyId).eq('edit_status', 'approved'),
    sb.from('stories').select('id', { count: 'exact', head: true }).eq('family_id', familyId).eq('edit_status', 'pending_review'),
    sb.from('recordings').select('duration_s').eq('family_id', familyId).limit(5000),
  ]);
  if (approved.error) throw new Error(approved.error.message);
  if (pending.error) throw new Error(pending.error.message);
  const rows = check(audio) as Array<{ duration_s: number | null }>;
  return {
    approved: approved.count ?? 0,
    pending: pending.count ?? 0,
    audioSeconds: rows.reduce((sum, r) => sum + (Number(r.duration_s) || 0), 0),
  };
}

/** Stories that still need someone: drafts and those waiting for the storyteller. */
export async function fetchReviewQueue(sb: Supabase, familyId: string, limit = 6): Promise<{ items: VaultStory[]; total: number }> {
  const res = await sb
    .from('stories')
    .select(STORY_COLUMNS, { count: 'exact' })
    .eq('family_id', familyId)
    .in('edit_status', ['draft', 'pending_review'])
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (res.error) throw new Error(res.error.message);
  return { items: (res.data ?? []) as VaultStory[], total: res.count ?? 0 };
}

/** A single story the caller may read, or null (not found and forbidden look the same on purpose). */
export async function fetchStory(sb: Supabase, id: string): Promise<VaultStory | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const res = await sb.from('stories').select(STORY_COLUMNS).eq('id', id).maybeSingle();
  if (res.error) {
    // Malformed ids or RLS denials surface as "not available", never as content.
    if (/invalid input|permission|forbidden/i.test(res.error.message)) return null;
    throw new Error(res.error.message);
  }
  return (res.data as VaultStory | null) ?? null;
}

export async function canWriteStory(sb: Supabase, id: string): Promise<boolean> {
  const res = await sb.rpc('can_write_story', { sid: id });
  return !res.error && res.data === true;
}

export async function fetchProfileName(sb: Supabase, userId: string): Promise<string | null> {
  const res = await sb.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  return res.data?.display_name ?? null;
}

export async function signedAudioUrl(sb: Supabase, path: string): Promise<string> {
  const res = await sb.storage.from('recordings').createSignedUrl(path, 3600);
  if (res.error || !res.data) throw new Error(res.error?.message ?? 'no_url');
  return res.data.signedUrl;
}
