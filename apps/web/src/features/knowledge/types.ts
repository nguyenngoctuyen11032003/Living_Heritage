// View model shared by the hub, the detail page, the saved list and the admin preview.
import { REGIONS, type Database, type Region, type StoryKind } from '@lh/shared';
import type { Locale } from '@/i18n';
import type { SampleItem } from './sample-items';

export type PublicItemRow = Omit<Database['public']['Tables']['public_items']['Row'], 'search_tsv'>;

/** Columns selected from public_items (never select search_tsv). */
export const PUBLIC_ITEM_COLUMNS =
  'id, story_id, kind, title, summary, body, fields, topic_id, topic_slug, lang, region, decade, narrator_label, audio_allowed, audio_path, published_at, updated_at';

export interface KnowledgeItem {
  id: string;
  kind: StoryKind;
  title: string;
  summary: string | null;
  body: string;
  /** Raw experience fields (jsonb) — read with readExperienceFields(). */
  fields: unknown;
  topicSlug: string | null;
  region: Region | null;
  decade: number | null;
  narratorLabel: string;
  audioAllowed: boolean;
  /** Path in the public-audio bucket, set only once the audio copy job is configured. */
  audioPath: string | null;
  durationS: number | null;
  publishedAt: string | null;
  /** Illustrative sample (never a real narration). */
  sample: boolean;
}

function asRegion(v: unknown): Region | null {
  return typeof v === 'string' && (REGIONS as readonly string[]).includes(v) ? (v as Region) : null;
}

function durationFrom(fields: unknown): number | null {
  if (!fields || typeof fields !== 'object') return null;
  const d = (fields as Record<string, unknown>).duration_s;
  return typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : null;
}

/** Accepts a public_items row, a search_public row or a preview_public_item snapshot. */
export function fromPublicRow(row: Partial<PublicItemRow> & { title?: string | null }, id = row.id ?? ''): KnowledgeItem {
  const kind: StoryKind = row.kind === 'experience' ? 'experience' : 'story';
  return {
    id,
    kind,
    title: row.title ?? '',
    summary: row.summary ?? null,
    body: row.body ?? '',
    fields: row.fields ?? {},
    topicSlug: row.topic_slug ?? null,
    region: asRegion(row.region),
    decade: typeof row.decade === 'number' ? row.decade : null,
    narratorLabel: row.narrator_label ?? '',
    audioAllowed: Boolean(row.audio_allowed),
    audioPath: row.audio_path ?? null,
    durationS: durationFrom(row.fields),
    publishedAt: row.published_at ?? null,
    sample: false,
  };
}

export function sampleToItem(s: SampleItem, locale: Locale): KnowledgeItem {
  const e = s.experience;
  const fields = e
    ? {
        skill: e.skill[locale],
        context: e.context?.[locale] ?? null,
        conditions: e.conditions.map((x) => x[locale]),
        steps: e.steps.map((x) => x[locale]),
        cautions: e.cautions.map((x) => x[locale]),
        limits: e.limits?.[locale] ?? null,
      }
    : {};
  return {
    id: s.id,
    kind: s.kind,
    title: s.title[locale],
    summary: s.summary[locale],
    body: s.body[locale],
    fields,
    topicSlug: s.topicSlug,
    region: s.region,
    decade: s.decade,
    narratorLabel: s.narratorLabel[locale],
    audioAllowed: s.audioAllowed,
    audioPath: null,
    durationS: s.durationS,
    publishedAt: s.publishedAt,
    sample: true,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string | undefined | null): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** Strip wrapping quotes the narrator/AI may have typed so the card can add its own typographic quotes. */
export function bareQuote(title: string): string {
  return title.trim().replace(/^["“”'‘’«»]+|["“”'‘’«»]+$/g, '').trim();
}
