// Draft form model shared by the story and experience editors, and its conversion to save_story_draft args.
import type { Json, StoryKind } from '@lh/shared';

export interface DraftForm {
  title: string;
  /** Experience: the summary shown publicly. Story: kept as loaded (not edited here). */
  summary: string;
  /** Story text. For experience drafts the body mirrors the summary when saved. */
  body: string;
  skill: string;
  context: string;
  conditions: string[];
  steps: string[];
  cautions: string[];
  limits: string;
  /** Free text input; validated with parseDecade. */
  decade: string;
}

export type JsonObject = { [key: string]: Json | undefined };

export function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string')
    return value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

export interface ExperienceFieldsForm {
  skill: string;
  context: string;
  conditions: string[];
  steps: string[];
  cautions: string[];
  limits: string;
  decade: string;
}

/** Tolerant read of stories.fields: missing keys, nulls, wrong types and newline-joined lists all become form values. */
export function normalizeExperienceFields(fields: unknown): ExperienceFieldsForm {
  const f = asObject(fields);
  return {
    skill: asText(f.skill),
    context: asText(f.context),
    conditions: asList(f.conditions),
    steps: asList(f.steps),
    cautions: asList(f.cautions),
    limits: asText(f.limits),
    decade: asText(f.decade),
  };
}

export type DecadeResult = { ok: true; value: number | null } | { ok: false };

/** '' → null; '1975' → 1975 (public_items rounds to the decade); anything else outside 1900–2090 is invalid. */
export function parseDecade(input: string): DecadeResult {
  const s = input.trim();
  if (s === '') return { ok: true, value: null };
  if (!/^\d{4}$/.test(s)) return { ok: false };
  const n = Number(s);
  return n >= 1900 && n <= 2090 ? { ok: true, value: n } : { ok: false };
}

export interface StorySource {
  kind: StoryKind;
  title: string;
  summary: string | null;
  body: string;
  fields: unknown;
}

export function formFromStory(s: StorySource): DraftForm {
  const x = normalizeExperienceFields(s.fields);
  return { title: s.title, summary: s.summary ?? '', body: s.body, ...x };
}

export function formsEqual(a: DraftForm, b: DraftForm): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const cleanList = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
const orNull = (s: string) => (s.trim() === '' ? null : s.trim());

export interface SaveArgs {
  p_title: string;
  p_summary: string;
  p_body: string;
  p_fields: Json;
}

/**
 * Build save_story_draft arguments. Unknown keys in the original fields (e.g. AI `topics`) are preserved.
 * Throws 'invalid_decade' if the decade does not parse (the UI validates first).
 */
export function toSaveArgs(kind: StoryKind, form: DraftForm, originalFields: unknown): SaveArgs {
  const decade = parseDecade(form.decade);
  if (!decade.ok) throw new Error('invalid_decade');
  const fields: JsonObject = { ...asObject(originalFields) };
  if (kind === 'experience') {
    fields.skill = form.skill.trim();
    fields.context = orNull(form.context);
    fields.conditions = cleanList(form.conditions);
    fields.steps = cleanList(form.steps);
    fields.cautions = cleanList(form.cautions);
    fields.limits = orNull(form.limits);
  }
  if (decade.value === null) delete fields.decade;
  else fields.decade = decade.value;
  const summary = form.summary.trim();
  return {
    p_title: form.title.trim(),
    p_summary: summary,
    p_body: kind === 'experience' ? summary : form.body,
    p_fields: fields as Json,
  };
}
