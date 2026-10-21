// Prompt-injection hardening: user-supplied text (transcripts, questions, titles, published sources) is put
// between tags like <transcript>…</transcript> and declared as data. Angle brackets inside that text are
// swapped for look-alike characters so it can never close the wrapping tag or open a fake one.

/** `<` → `‹`, `>` → `›` (only the copy sent to the model changes; stored content is untouched). */
export function asData(text: string): string {
  return text.replace(/</g, '‹').replace(/>/g, '›');
}
