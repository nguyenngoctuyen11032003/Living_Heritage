// "Câu hỏi gợi ý tiếp theo": after a recording is processed, up to three next questions —
// AI suggestions (labelled "Gợi ý từ AI") or, when AI is unavailable, the seeded questions not yet used.
import type { VoiceLang } from './tts';

export const MAX_FOLLOW_UPS = 3;
const MAX_CHARS = 300;

export interface FollowUp {
  text: string;
  /** Seeded question id; null for an AI suggestion (not a row in `questions`). */
  questionId: string | null;
}

export type FollowUpState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; source: 'ai' | 'seeded'; items: FollowUp[] };

export interface SeededQuestion {
  id: string;
  sort: number;
  prompt_vi: string;
  prompt_en: string;
}

export const promptIn = (q: Pick<SeededQuestion, 'prompt_vi' | 'prompt_en'>, lang: VoiceLang) => (lang === 'en' ? q.prompt_en : q.prompt_vi);

/** Cleaned, de-duplicated AI questions (at most three). */
export function aiFollowUps(questions: readonly string[], max = MAX_FOLLOW_UPS): FollowUp[] {
  const seen = new Set<string>();
  const out: FollowUp[] = [];
  for (const raw of questions) {
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
    const k = text.toLowerCase();
    if (!text || seen.has(k)) continue;
    seen.add(k);
    out.push({ text, questionId: null });
    if (out.length >= max) break;
  }
  return out;
}

/** Seeded questions not yet answered or skipped, in sort order (at most three). */
export function seededFollowUps(
  questions: readonly SeededQuestion[],
  currentId: string | null,
  used: ReadonlySet<string>,
  lang: VoiceLang,
  max = MAX_FOLLOW_UPS,
): FollowUp[] {
  return [...questions]
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
    .filter((q) => q.id !== currentId && !used.has(q.id))
    .slice(0, max)
    .map((q) => ({ text: promptIn(q, lang), questionId: q.id }));
}

/** `ai` is null when the AI call failed (or was not possible): fall back silently to the seeded list. */
export function resolveFollowUps(ai: readonly string[] | null, seeded: FollowUp[]): Extract<FollowUpState, { status: 'ready' }> {
  const fromAi = ai ? aiFollowUps(ai) : [];
  return fromAi.length > 0 ? { status: 'ready', source: 'ai', items: fromAi } : { status: 'ready', source: 'seeded', items: seeded };
}

/** Stable short id for a free-text question, so a pending take for it gets its own device-storage key. */
export function textKey(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `ai-${(h >>> 0).toString(36)}`;
}
