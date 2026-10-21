// Pure helpers for choosing which question to show.

export interface QuestionLike {
  id: string;
  sort: number;
}

const bySort = <Q extends QuestionLike>(a: Q, b: Q) => a.sort - b.sort || a.id.localeCompare(b.id);

/**
 * Next question after `currentId` in sort order, preferring ones not yet answered or skipped (`used`).
 * Wraps around; when every question is used it simply moves to the next one. Returns null for an empty list.
 */
export function nextQuestion<Q extends QuestionLike>(questions: readonly Q[], currentId: string | null, used: ReadonlySet<string> = new Set()): Q | null {
  const list = [...questions].sort(bySort);
  if (list.length === 0) return null;
  const start = currentId ? list.findIndex((q) => q.id === currentId) : -1;
  for (let step = 1; step <= list.length; step++) {
    const q = list[(start + step + list.length) % list.length]!;
    if (q.id !== currentId && !used.has(q.id)) return q;
  }
  // Everything used: plain rotation (or the only question there is).
  return list[(start + 1 + list.length) % list.length]!;
}

/** "Bỏ qua câu này": the next question not yet answered or skipped, or null when none is left (free telling). */
export function nextUnusedQuestion<Q extends QuestionLike>(questions: readonly Q[], currentId: string | null, used: ReadonlySet<string> = new Set()): Q | null {
  const q = nextQuestion(questions, currentId, used);
  return q && q.id !== currentId && !used.has(q.id) ? q : null;
}

/** The question to open a session with: the requested one when it belongs to the list, else the first unused. */
export function initialQuestion<Q extends QuestionLike>(questions: readonly Q[], requestedId: string | null, used: ReadonlySet<string> = new Set()): Q | null {
  const found = requestedId ? questions.find((q) => q.id === requestedId) : undefined;
  return found ?? nextQuestion(questions, null, used);
}

/** "Chưa biết kể gì": a random easy opener — the first questions (lowest sort) of each topic. */
export function pickEasyQuestion<Q extends QuestionLike & { topic_id: string }>(questions: readonly Q[], random: () => number = Math.random, perTopic = 2): Q | null {
  const byTopic = new Map<string, Q[]>();
  for (const q of questions) byTopic.set(q.topic_id, [...(byTopic.get(q.topic_id) ?? []), q]);
  const pool = [...byTopic.values()].flatMap((qs) => qs.sort(bySort).slice(0, perTopic));
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
}

const HONORIFICS = /^(ông|bà|cụ|bác|cô|chú|dì|thím|mợ|o|anh|chị|mr|mrs|ms|grandma|grandpa)(?=[\s.,]|$)/iu;

/** True when the display name already starts with a form of address ("Bà Lan"), so we do not prepend "ông/bà". */
export function hasHonorific(displayName: string): boolean {
  return HONORIFICS.test(displayName.trim().normalize('NFC'));
}
