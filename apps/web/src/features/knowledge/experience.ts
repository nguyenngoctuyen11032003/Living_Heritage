// Experience card ("thẻ kinh nghiệm") sections. Missing fields are shown as a placeholder and are NEVER
// filled in by AI (DỰ ÁN B10): the builder only reorganises what the narrator actually provided.

export interface ExperienceFieldsView {
  skill: string | null;
  context: string | null;
  conditions: string[];
  steps: string[];
  cautions: string[];
  limits: string | null;
}

export type ExperienceSectionKey = 'problem' | 'steps' | 'conditions' | 'cautions' | 'limits';

export interface ExperienceSection {
  key: ExperienceSectionKey;
  /** 'steps' renders as a numbered list, 'list' as bullets, 'text' as paragraphs. */
  variant: 'text' | 'list' | 'steps';
  /** Narrator-provided content (empty when missing). */
  items: string[];
  missing: boolean;
  /** What to render: the items, or [placeholder] when missing. */
  display: string[];
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s : null;
}

function list(v: unknown): string[] {
  if (typeof v === 'string') return str(v) ? [v.trim()] : [];
  if (!Array.isArray(v)) return [];
  return v.map(str).filter((s): s is string => s !== null);
}

/** Defensive read of the jsonb `fields` column ({skill, context, conditions[], steps[], cautions[], limits}). */
export function readExperienceFields(fields: unknown): ExperienceFieldsView {
  const f = fields && typeof fields === 'object' && !Array.isArray(fields) ? (fields as Record<string, unknown>) : {};
  return {
    skill: str(f.skill),
    context: str(f.context),
    conditions: list(f.conditions),
    steps: list(f.steps),
    cautions: list(f.cautions),
    limits: str(f.limits),
  };
}

/** Ordered sections for the detail page: Vấn đề áp dụng, Kinh nghiệm, Điều kiện, Lưu ý, Giới hạn áp dụng. */
export function buildExperienceSections(fields: unknown, placeholder: string): ExperienceSection[] {
  const f = readExperienceFields(fields);
  const make = (key: ExperienceSectionKey, variant: ExperienceSection['variant'], items: string[]): ExperienceSection => ({
    key,
    variant,
    items,
    missing: items.length === 0,
    display: items.length === 0 ? [placeholder] : items,
  });
  return [
    make('problem', 'text', f.context ? [f.context] : []),
    make('steps', 'steps', f.steps),
    make('conditions', 'list', f.conditions),
    make('cautions', 'list', f.cautions),
    make('limits', 'text', f.limits ? [f.limits] : []),
  ];
}

/** Split a body into paragraphs (blank lines or single newlines). */
export function paragraphs(body: string | null | undefined): string[] {
  return (body ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
