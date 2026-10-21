// Knowledge hub filters <-> URL query params (?q=&chu-de=&loai=&vung=&thap-nien=) and search_public args.
import { REGIONS, type Region, type StoryKind } from '@lh/shared';

export interface KnowledgeFilters {
  q: string;
  /** topics.slug */
  topic: string | null;
  kind: StoryKind | null;
  region: Region | null;
  /** First year of the decade, e.g. 1970. */
  decade: number | null;
}

export const EMPTY_FILTERS: KnowledgeFilters = { q: '', topic: null, kind: null, region: null, decade: null };

export const PARAMS = { q: 'q', topic: 'chu-de', kind: 'loai', region: 'vung', decade: 'thap-nien' } as const;

/** Vietnamese URL slugs for the content type. */
export const KIND_SLUGS: Record<StoryKind, string> = { story: 'cau-chuyen', experience: 'kinh-nghiem' };

/** Decades offered in the filter (newest last). */
export const DECADES = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010] as const;

const SLUG_RE = /^[a-z0-9-]{1,48}$/;

function parseKind(raw: string | null): StoryKind | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === KIND_SLUGS.story || v === 'story') return 'story';
  if (v === KIND_SLUGS.experience || v === 'experience') return 'experience';
  return null;
}

function parseRegion(raw: string | null): Region | null {
  const v = raw?.trim().toLowerCase() ?? '';
  return (REGIONS as readonly string[]).includes(v) ? (v as Region) : null;
}

function parseDecade(raw: string | null): number | null {
  if (!raw || !/^\d{4}s?$/.test(raw.trim())) return null;
  const n = Number.parseInt(raw, 10);
  return n >= 1900 && n <= 2090 && n % 10 === 0 ? n : null;
}

function parseTopic(raw: string | null): string | null {
  const v = raw?.trim().toLowerCase() ?? '';
  return SLUG_RE.test(v) ? v : null;
}

/** Read filters from the URL. Unknown or malformed values are ignored. `topic` is accepted as an alias of `chu-de`. */
export function filtersFromParams(params: URLSearchParams): KnowledgeFilters {
  return {
    q: (params.get(PARAMS.q) ?? '').slice(0, 120),
    topic: parseTopic(params.get(PARAMS.topic) ?? params.get('topic')),
    kind: parseKind(params.get(PARAMS.kind)),
    region: parseRegion(params.get(PARAMS.region)),
    decade: parseDecade(params.get(PARAMS.decade)),
  };
}

/** Write filters to URL params; empty values are omitted so the URL stays short. */
export function filtersToParams(f: KnowledgeFilters): URLSearchParams {
  const p = new URLSearchParams();
  const q = f.q.trim();
  if (q) p.set(PARAMS.q, q);
  if (f.topic) p.set(PARAMS.topic, f.topic);
  if (f.kind) p.set(PARAMS.kind, KIND_SLUGS[f.kind]);
  if (f.region) p.set(PARAMS.region, f.region);
  if (f.decade) p.set(PARAMS.decade, String(f.decade));
  return p;
}

/** Number of active narrowing filters (the query counts too). */
export function activeFilterCount(f: KnowledgeFilters): number {
  return [f.q.trim(), f.topic, f.kind, f.region, f.decade].filter(Boolean).length;
}

export function sameFilters(a: KnowledgeFilters, b: KnowledgeFilters): boolean {
  return a.q.trim() === b.q.trim() && a.topic === b.topic && a.kind === b.kind && a.region === b.region && a.decade === b.decade;
}

export function filtersKey(f: KnowledgeFilters): string {
  return filtersToParams(f).toString();
}

export interface SearchArgs {
  q?: string;
  p_topic?: string;
  p_kind?: StoryKind;
  p_region?: string;
  p_decade?: number;
  lim: number;
  off: number;
}

/** Arguments for rpc('search_public'); null filters are left out so the SQL defaults apply. */
export function toSearchArgs(f: KnowledgeFilters, offset: number, limit: number): SearchArgs {
  const args: SearchArgs = { lim: limit, off: offset };
  const q = f.q.trim();
  if (q) args.q = q;
  if (f.topic) args.p_topic = f.topic;
  if (f.kind) args.p_kind = f.kind;
  if (f.region) args.p_region = f.region;
  if (f.decade) args.p_decade = f.decade;
  return args;
}
