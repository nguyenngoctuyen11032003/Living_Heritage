import type { Region } from '@lh/shared';

export type NarratorLang = 'vi' | 'en';
export const NARRATOR_LANGS: readonly NarratorLang[] = ['vi', 'en'];
export const GENERATION_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export const MAX_RELATION = 60;
export const MAX_ASSISTED_BY = 120;
export const MAX_CONSENT_METHOD = 200;

/** Suggestions for the relation field (free text is allowed). */
export const RELATION_SUGGESTIONS = {
  vi: ['Cụ ông', 'Cụ bà', 'Ông nội', 'Bà nội', 'Ông ngoại', 'Bà ngoại', 'Bố', 'Mẹ', 'Bác', 'Chú', 'Thím', 'Cô', 'Dì', 'Cậu', 'Mợ', 'Anh', 'Chị', 'Em'],
  en: ['Great-grandfather', 'Great-grandmother', 'Paternal grandfather', 'Paternal grandmother', 'Maternal grandfather', 'Maternal grandmother', 'Father', 'Mother', 'Uncle', 'Aunt', 'Brother', 'Sister', 'Cousin'],
} as const;

export interface NarratorDraft {
  display_name: string;
  pen_name: string;
  birth_year: string;
  region: Region | '';
  relation: string;
  lang: NarratorLang;
  /** '' (not placed in the tree) or '1'..'6' */
  generation: string;
  assisted_by: string;
  consent_method: string;
}

export type NarratorDraftErrors = Partial<
  Record<'display_name' | 'pen_name' | 'birth_year' | 'relation' | 'lang' | 'generation' | 'assisted_by' | 'consent_method', 'required' | 'tooLong' | 'invalidYear' | 'relationTooLong' | 'invalidLang' | 'invalidGeneration' | 'helperTooLong'>
>;

export function isNarratorLang(v: unknown): v is NarratorLang {
  return v === 'vi' || v === 'en';
}

/** Pure validation, shared with tests. */
export function validateNarrator(d: NarratorDraft, currentYear = new Date().getFullYear()): NarratorDraftErrors {
  const e: NarratorDraftErrors = {};
  if (!d.display_name.trim()) e.display_name = 'required';
  else if (d.display_name.trim().length > 80) e.display_name = 'tooLong';
  if (d.pen_name.trim().length > 80) e.pen_name = 'tooLong';
  if (d.birth_year.trim()) {
    const y = Number(d.birth_year);
    if (!Number.isInteger(y) || y < 1900 || y > currentYear) e.birth_year = 'invalidYear';
  }
  if (d.relation.trim().length > MAX_RELATION) e.relation = 'relationTooLong';
  if (d.assisted_by.trim().length > MAX_ASSISTED_BY) e.assisted_by = 'helperTooLong';
  if (d.consent_method.trim().length > MAX_CONSENT_METHOD) e.consent_method = 'helperTooLong';
  if (!isNarratorLang(d.lang)) e.lang = 'invalidLang';
  if (d.generation !== '') {
    const g = Number(d.generation);
    if (!(GENERATION_LEVELS as readonly number[]).includes(g)) e.generation = 'invalidGeneration';
  }
  return e;
}

export function toNarratorRow(d: NarratorDraft) {
  return {
    display_name: d.display_name.trim(),
    pen_name: d.pen_name.trim() || null,
    birth_year: d.birth_year.trim() ? Number(d.birth_year) : null,
    region: d.region || null,
    relation: d.relation.trim().replace(/\s+/g, ' ') || null,
    lang: d.lang,
    generation: d.generation ? Number(d.generation) : null,
  };
}

/**
 * Helper fields are only sent when filled in (or when clearing a stored value), so a database that has not
 * received the assisted_by / consent_method columns yet keeps working for every narrator that does not use them.
 */
export function helperColumns(d: Pick<NarratorDraft, 'assisted_by' | 'consent_method'>, previous?: { assisted_by?: string | null; consent_method?: string | null } | null) {
  const out: { assisted_by?: string | null; consent_method?: string | null } = {};
  const helper = d.assisted_by.trim();
  const method = d.consent_method.trim();
  if (helper || previous?.assisted_by) out.assisted_by = helper || null;
  if (method || previous?.consent_method) out.consent_method = method || null;
  return out;
}
