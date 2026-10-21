import type { Region } from '@lh/shared';

export type NarratorLang = 'vi' | 'en';
export const NARRATOR_LANGS: readonly NarratorLang[] = ['vi', 'en'];
export const GENERATION_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export const MAX_RELATION = 60;
export const MAX_HELPER_NOTE = 120;

/** How the narrator confirms their stories (B11/B13): on their own device, or with a helper and how. */
export const CONSENT_METHODS = ['self_device', 'assisted_in_person', 'assisted_phone', 'assisted_video'] as const;
export type ConsentMethod = (typeof CONSENT_METHODS)[number];

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
  /** '' (not recorded) or a ConsentMethod */
  consent_method: ConsentMethod | '';
  helper_note: string;
}

export type NarratorDraftErrors = Partial<
  Record<
    'display_name' | 'pen_name' | 'birth_year' | 'relation' | 'lang' | 'generation' | 'consent_method' | 'helper_note',
    'required' | 'tooLong' | 'invalidYear' | 'relationTooLong' | 'invalidLang' | 'invalidGeneration' | 'invalidConsentMethod' | 'helperRequired' | 'helperTooLong'
  >
>;

export function isNarratorLang(v: unknown): v is NarratorLang {
  return v === 'vi' || v === 'en';
}

export function isConsentMethod(v: unknown): v is ConsentMethod {
  return typeof v === 'string' && (CONSENT_METHODS as readonly string[]).includes(v);
}

/** Assisted methods need a named helper (B11: record who helped and how consent was confirmed). */
export function isAssisted(m: ConsentMethod | ''): boolean {
  return m !== '' && m !== 'self_device';
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
  if (!isNarratorLang(d.lang)) e.lang = 'invalidLang';
  if (d.generation !== '') {
    const g = Number(d.generation);
    if (!(GENERATION_LEVELS as readonly number[]).includes(g)) e.generation = 'invalidGeneration';
  }
  if (d.consent_method !== '' && !isConsentMethod(d.consent_method)) e.consent_method = 'invalidConsentMethod';
  const helper = d.helper_note.trim();
  if (helper.length > MAX_HELPER_NOTE) e.helper_note = 'helperTooLong';
  else if (!helper && isConsentMethod(d.consent_method) && isAssisted(d.consent_method)) e.helper_note = 'helperRequired';
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

/** narrators.consent_method / helper_note. */
export function toConsentColumns(d: NarratorDraft): { consent_method: ConsentMethod | null; helper_note: string | null } {
  const method = d.consent_method || null;
  return {
    consent_method: method,
    // A helper note only makes sense with a recorded method; "self_device" keeps an optional note.
    helper_note: method ? d.helper_note.trim().replace(/\s+/g, ' ') || null : null,
  };
}
