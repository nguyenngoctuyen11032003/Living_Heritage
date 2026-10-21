// Transcript rendering: the AI writes its best guess followed by `[?]` ("ao sau nhà [?]"), or `[?]` alone for
// an unintelligible passage. We turn the marker into an "uncertain" segment holding the guessed word.

export const UNCERTAIN_MARKER = '[?]';

export type TranscriptSegment = { kind: 'text'; text: string } | { kind: 'uncertain'; text: string };

/** Last word before the marker (letters/digits, may contain ' ’ -). Punctuation right before the marker means "unclear passage". */
const TRAILING_WORD = /([\p{L}\p{N}][\p{L}\p{N}'’-]*)\s*$/u;

export function parseTranscript(text: string): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  const pushText = (s: string) => {
    if (!s) return;
    const last = out[out.length - 1];
    if (last && last.kind === 'text') last.text += s;
    else out.push({ kind: 'text', text: s });
  };

  let cursor = 0;
  let idx = text.indexOf(UNCERTAIN_MARKER, cursor);
  while (idx !== -1) {
    const before = text.slice(cursor, idx);
    const m = TRAILING_WORD.exec(before);
    if (m) {
      pushText(before.slice(0, m.index));
      out.push({ kind: 'uncertain', text: m[1]! });
    } else {
      // A lone marker (after punctuation or at the start): an unintelligible passage with no guess.
      pushText(before);
      out.push({ kind: 'uncertain', text: '' });
    }
    cursor = idx + UNCERTAIN_MARKER.length;
    idx = text.indexOf(UNCERTAIN_MARKER, cursor);
  }
  pushText(text.slice(cursor));
  return out;
}

export function countUncertain(segments: TranscriptSegment[]): number {
  return segments.filter((s) => s.kind === 'uncertain').length;
}
