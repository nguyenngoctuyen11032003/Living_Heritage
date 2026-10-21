import type { EditStatus, Json, StoryKind, Visibility } from '@lh/shared';

/** Columns the vault reads from `stories` (RLS limits rows to the reader's scope). */
export const STORY_COLUMNS =
  'id, family_id, narrator_id, recording_id, kind, title, summary, body, fields, topic_id, edit_status, visibility, created_at, approved_at, approved_by, current_version';

export interface VaultStory {
  id: string;
  family_id: string;
  narrator_id: string;
  recording_id: string | null;
  kind: StoryKind;
  title: string;
  summary: string | null;
  body: string;
  fields: Json;
  topic_id: string | null;
  edit_status: EditStatus;
  visibility: Visibility;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  current_version: number;
}

export interface NarratorLite {
  id: string;
  display_name: string;
  pen_name: string | null;
}

export interface TopicLite {
  id: string;
  slug: string;
  title_vi: string;
  title_en: string;
}

export interface RecordingLite {
  id: string;
  duration_s: number | null;
  created_at: string;
  storage_path: string;
}

/** Experience fields (stories.fields when kind = 'experience'). Every entry is optional. */
export interface ExperienceFields {
  skill: string | null;
  context: string | null;
  conditions: string[] | null;
  steps: string[] | null;
  cautions: string[] | null;
  limits: string | null;
}

export function readExperienceFields(fields: unknown): ExperienceFields {
  const empty: ExperienceFields = { skill: null, context: null, conditions: null, steps: null, cautions: null, limits: null };
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return empty;
  const f = fields as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const list = (v: unknown) => {
    if (!Array.isArray(v)) return null;
    const items = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
    return items.length ? items : null;
  };
  return {
    skill: str(f.skill),
    context: str(f.context),
    conditions: list(f.conditions),
    steps: list(f.steps),
    cautions: list(f.cautions),
    limits: str(f.limits),
  };
}
