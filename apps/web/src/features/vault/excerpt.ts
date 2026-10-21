import { readExperienceFields } from './types';

export interface ExcerptSource {
  summary?: string | null;
  body?: string | null;
  fields?: unknown;
}

function clean(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(#{1,6}|>|[-*•])\s+/, '')
        .replace(/[*_`]{1,3}/g, '')
        .trim()
        .replace(/^["“”«»]+|["“”«»]+$/g, '')
        .trim(),
    )
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Shorten at a word boundary and add an ellipsis. */
export function truncateWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = /\s/.test(text.charAt(max)) ? max : cut.lastIndexOf(' ');
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return base.replace(/[\s,;:.!?…–—-]+$/u, '') + '…';
}

/**
 * Card quote: the story summary, else the opening of the body, else the experience fields
 * (skill → context → first step). Returns '' when the story has no text yet.
 */
export function buildExcerpt(source: ExcerptSource, max = 160): string {
  const exp = readExperienceFields(source.fields);
  const candidates: Array<string | null | undefined> = [source.summary, source.body, exp.skill, exp.context, exp.steps?.[0]];
  for (const c of candidates) {
    if (!c) continue;
    const text = clean(c);
    if (text) return truncateWords(text, max);
  }
  return '';
}
