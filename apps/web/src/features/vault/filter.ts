import type { EditStatus, StoryKind } from '@lh/shared';
import { EDIT_STATUSES, STORY_KINDS } from '@lh/shared';
import { stripDiacritics } from '@/lib/format';
import { readExperienceFields } from './types';

export interface VaultFilters {
  q: string;
  narratorId: string;
  /** topic id, or 'none' for stories without a topic */
  topicId: string;
  status: '' | EditStatus;
  kind: '' | StoryKind;
}

export const EMPTY_FILTERS: VaultFilters = { q: '', narratorId: '', topicId: '', status: '', kind: '' };

export interface SearchableStory {
  title: string;
  summary: string | null;
  body: string;
  /** Experience fields (skill, context, steps…): part of the reading text. */
  fields?: unknown;
  narrator_id: string;
  topic_id: string | null;
  edit_status: EditStatus;
  kind: StoryKind;
}

/** Lower-case, no Vietnamese diacritics, single spaces: "Bánh  Chưng" → "banh chung". */
export function normalizeForSearch(text: string): string {
  return stripDiacritics(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Topic names (vi + en) by topic id, so a search also matches the topic (DỰ ÁN.md B9). */
export type TopicNames = ReadonlyMap<string, string>;

export function topicNames(topics: ReadonlyArray<{ id: string; title_vi: string; title_en: string }>): TopicNames {
  return new Map(topics.map((tp) => [tp.id, `${tp.title_vi} ${tp.title_en}`]));
}

/** The reading text of a story: title, summary, body and the experience fields. Never file names. */
function searchText(story: SearchableText): string {
  const f = readExperienceFields(story.fields);
  return [story.title, story.summary, story.body, f.skill, f.context, f.limits, ...(f.conditions ?? []), ...(f.steps ?? []), ...(f.cautions ?? [])]
    .filter(Boolean)
    .join(' ');
}

type SearchableText = Pick<SearchableStory, 'title' | 'summary' | 'body'> & { fields?: unknown; topic_id?: string | null };

/** Every word of the query must appear in the title, the topic name or the reading text (diacritic-insensitive). */
export function matchesQuery(story: SearchableText, q: string, topics?: TopicNames): boolean {
  const tokens = normalizeForSearch(q).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const topic = story.topic_id ? (topics?.get(story.topic_id) ?? '') : '';
  const hay = normalizeForSearch(`${searchText(story)} ${topic}`);
  return tokens.every((tok) => hay.includes(tok));
}

export function matchesFilters(story: SearchableStory, f: VaultFilters, topics?: TopicNames): boolean {
  if (f.narratorId && story.narrator_id !== f.narratorId) return false;
  if (f.topicId === 'none') {
    if (story.topic_id !== null) return false;
  } else if (f.topicId && story.topic_id !== f.topicId) return false;
  if (f.status && story.edit_status !== f.status) return false;
  if (f.kind && story.kind !== f.kind) return false;
  return matchesQuery(story, f.q, topics);
}

export function filterStories<T extends SearchableStory>(stories: readonly T[], f: VaultFilters, topics?: TopicNames): T[] {
  return stories.filter((s) => matchesFilters(s, f, topics));
}

/** Ids of the topics whose name contains every word of the query (diacritic-insensitive). */
export function matchingTopicIds(topics: TopicNames, q: string): string[] {
  const tokens = normalizeForSearch(q).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];
  return [...topics].filter(([, name]) => tokens.every((tok) => normalizeForSearch(name).includes(tok))).map(([id]) => id);
}

export function hasActiveFilters(f: VaultFilters): boolean {
  return Boolean(f.q.trim() || f.narratorId || f.topicId || f.status || f.kind);
}

/**
 * PostgREST `or=` expression for a server-side ilike over title/summary/body, plus the topics whose name
 * matches. Characters with meaning in the filter grammar are dropped; returns null for an empty query.
 */
export function ilikeOrFilter(q: string, topicIds: readonly string[] = []): string | null {
  const safe = q.replace(/[,()*%_\\":.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe) return null;
  const pattern = `*${safe}*`;
  const parts = ['title', 'summary', 'body'].map((col) => `${col}.ilike.${pattern}`);
  const ids = topicIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length > 0) parts.push(`topic_id.in.(${ids.join(',')})`);
  return parts.join(',');
}

/** Merge lists by id (first occurrence wins), newest first. */
export function mergeById<T extends { id: string; created_at: string }>(...lists: T[][]): T[] {
  const seen = new Map<string, T>();
  for (const list of lists) for (const item of list) if (!seen.has(item.id)) seen.set(item.id, item);
  return [...seen.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const isStatus = (v: string | null): v is EditStatus => !!v && (EDIT_STATUSES as readonly string[]).includes(v);
const isKind = (v: string | null): v is StoryKind => !!v && (STORY_KINDS as readonly string[]).includes(v);

export function filtersFromParams(params: URLSearchParams): VaultFilters {
  const status = params.get('trang-thai');
  const kind = params.get('loai');
  return {
    q: params.get('q') ?? '',
    narratorId: params.get('nguoi-ke') ?? '',
    topicId: params.get('chu-de') ?? '',
    status: isStatus(status) ? status : '',
    kind: isKind(kind) ? kind : '',
  };
}

export function filtersToParams(f: VaultFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.narratorId) p.set('nguoi-ke', f.narratorId);
  if (f.topicId) p.set('chu-de', f.topicId);
  if (f.status) p.set('trang-thai', f.status);
  if (f.kind) p.set('loai', f.kind);
  return p;
}

/** Seconds of audio → whole hours and remaining minutes. */
export function splitHours(totalSeconds: number): { hours: number; minutes: number } {
  const mins = Math.round(Math.max(0, totalSeconds) / 60);
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
}
