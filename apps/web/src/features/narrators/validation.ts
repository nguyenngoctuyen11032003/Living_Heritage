import type { Region } from '@lh/shared';

export interface NarratorDraft {
  display_name: string;
  pen_name: string;
  birth_year: string;
  region: Region | '';
}

export type NarratorDraftErrors = Partial<Record<'display_name' | 'pen_name' | 'birth_year', 'required' | 'tooLong' | 'invalidYear'>>;

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
  return e;
}

export function toNarratorRow(d: NarratorDraft) {
  return {
    display_name: d.display_name.trim(),
    pen_name: d.pen_name.trim() || null,
    birth_year: d.birth_year.trim() ? Number(d.birth_year) : null,
    region: d.region || null,
  };
}
