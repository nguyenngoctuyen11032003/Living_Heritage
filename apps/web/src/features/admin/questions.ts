// Question library (B4) rules for the admin "Câu hỏi" tab: validation, ordering and the next sort value.
// The DB (migration 20261022000600) lets admins insert / update topics and questions; nothing is ever deleted,
// a question is retired by setting active = false.

export const PROMPT_MIN = 5;
export const PROMPT_MAX = 300;

export type PromptError = 'required' | 'tooShort' | 'tooLong';

export function promptError(text: string): PromptError | null {
  const n = text.trim().length;
  if (n === 0) return 'required';
  if (n < PROMPT_MIN) return 'tooShort';
  if (n > PROMPT_MAX) return 'tooLong';
  return null;
}

/** Both languages are required (the narrator UI shows the prompt in the reader's language). */
export function validateQuestion(q: { vi: string; en: string }): { vi: PromptError | null; en: PromptError | null; ok: boolean } {
  const vi = promptError(q.vi);
  const en = promptError(q.en);
  return { vi, en, ok: vi === null && en === null };
}

export interface SortableQuestion {
  id: string;
  topic_id: string;
  sort: number;
}

/** Questions of one topic in display order (sort, then id for a stable tie-break). */
export function topicQuestions<Q extends SortableQuestion>(all: Q[], topicId: string): Q[] {
  return all.filter((q) => q.topic_id === topicId).sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
}

/** A new question goes last in its topic. */
export function nextSort(all: SortableQuestion[], topicId: string, step = 10): number {
  const sorts = all.filter((q) => q.topic_id === topicId).map((q) => q.sort);
  return sorts.length ? Math.max(...sorts) + step : step;
}

/** PostgREST caps a response at 1000 rows: read every page with .range() so no question (or sort value) is missed. */
export const PAGE_SIZE = 1000;
export async function fetchAllPages<T>(page: (from: number, to: number) => Promise<T[]>, size = PAGE_SIZE, maxPages = 50): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const rows = await page(i * size, (i + 1) * size - 1);
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}
