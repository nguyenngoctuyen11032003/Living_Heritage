/**
 * Book pagination (pure). The flip-book preview and the A5 print layout both render the same
 * page list, so what the family previews is what they print.
 */
import { readExperienceFields } from '@/features/vault/types';

export interface ChapterInput {
  storyId: string;
  title: string;
  narrator: string;
  paragraphs: string[];
  /** Duration of the original recording, null when there is none. */
  durationS: number | null;
}

export type BookPage =
  | { kind: 'cover' }
  | { kind: 'toc'; number: number; entries: Array<{ chapter: number; title: string; page: number }> }
  | { kind: 'chapter'; number: number; chapter: number; paragraphs: string[]; first: boolean; last: boolean };

export interface PaginateOptions {
  /** Character budget of a full page. */
  charsPerPage: number;
  /** Budget of a chapter's first page (it also holds the chapter heading). */
  firstPageChars: number;
  /** Budget of a chapter's last page (it also holds the QR block). Applied when the chapter has audio. */
  qrReserve: number;
  tocEntriesPerPage: number;
}

export const DEFAULT_PAGINATION: PaginateOptions = { charsPerPage: 1500, firstPageChars: 950, qrReserve: 350, tocEntriesPerPage: 12 };

/** Split text into trimmed, non-empty paragraphs (blank-line or single-newline separated). */
export function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Break one paragraph into pieces of at most `max` chars, preferring sentence then word boundaries. */
export function splitLongParagraph(paragraph: string, max: number): string[] {
  if (paragraph.length <= max) return [paragraph];
  const sentences = paragraph.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) ?? [paragraph];
  const out: string[] = [];
  let buf = '';
  const flush = () => {
    if (buf.trim()) out.push(buf.trim());
    buf = '';
  };
  for (const s of sentences) {
    if ((buf + s).length <= max) {
      buf += s;
      continue;
    }
    flush();
    if (s.length <= max) {
      buf = s;
      continue;
    }
    // A single sentence longer than a page: cut at word boundaries.
    for (const word of s.split(/\s+/)) {
      if (!word) continue;
      if ((buf ? buf.length + 1 : 0) + word.length > max) flush();
      buf = buf ? `${buf} ${word}` : word.slice(0, max);
    }
  }
  flush();
  return out;
}

/** Greedily pack paragraphs into pages: page 0 gets `first` chars, the rest `rest` chars. Never returns zero pages. */
export function paginateParagraphs(paragraphs: string[], first: number, rest: number): string[][] {
  const pages: string[][] = [[]];
  let used = 0;
  const budget = () => (pages.length === 1 ? first : rest);
  for (const para of paragraphs) {
    const pieces = splitLongParagraph(para, Math.min(first, rest));
    for (const piece of pieces) {
      const current = pages[pages.length - 1]!;
      if (current.length > 0 && used + piece.length > budget()) {
        pages.push([piece]);
        used = piece.length;
      } else {
        current.push(piece);
        used += piece.length;
      }
    }
  }
  return pages;
}

/** Cover, table of contents (with page numbers) and each chapter's pages. Page numbers start at 1 after the cover. */
export function buildBookPages(chapters: ChapterInput[], opts: PaginateOptions = DEFAULT_PAGINATION): BookPage[] {
  const tocPageCount = Math.max(1, Math.ceil(chapters.length / opts.tocEntriesPerPage));
  const chapterPages = chapters.map((c) => {
    const pages = paginateParagraphs(c.paragraphs, opts.firstPageChars, opts.charsPerPage);
    // Leave room for the QR block on the last page; overflow moves to a fresh page.
    if (c.durationS !== null) {
      const last = pages[pages.length - 1]!;
      const limit = (pages.length === 1 ? opts.firstPageChars : opts.charsPerPage) - opts.qrReserve;
      const size = last.reduce((n, p) => n + p.length, 0);
      if (size > limit && last.length > 1) pages.push([last.pop()!]);
    }
    return pages;
  });

  const out: BookPage[] = [{ kind: 'cover' }];
  let pageNo = tocPageCount + 1;
  const entries = chapters.map((c, i) => {
    const entry = { chapter: i + 1, title: c.title, page: pageNo };
    pageNo += chapterPages[i]!.length;
    return entry;
  });
  for (let p = 0; p < tocPageCount; p++) {
    out.push({ kind: 'toc', number: p + 1, entries: entries.slice(p * opts.tocEntriesPerPage, (p + 1) * opts.tocEntriesPerPage) });
  }
  let n = tocPageCount + 1;
  chapterPages.forEach((pages, ci) => {
    pages.forEach((paragraphs, pi) => {
      out.push({ kind: 'chapter', number: n++, chapter: ci, paragraphs, first: pi === 0, last: pi === pages.length - 1 });
    });
  });
  return out;
}

export interface ExperienceLabels {
  skill: string;
  context: string;
  conditions: string;
  steps: string;
  cautions: string;
  limits: string;
}

/** Reading text of a chapter: the story body, or the experience fields as labelled paragraphs. */
export function chapterParagraphs(
  story: { kind: string; body: string; summary: string | null; fields: unknown },
  labels: ExperienceLabels,
): string[] {
  if (story.kind !== 'experience') {
    const body = splitParagraphs(story.body);
    return body.length ? body : splitParagraphs(story.summary);
  }
  const f = readExperienceFields(story.fields);
  const out: string[] = [];
  if (f.skill) out.push(`${labels.skill}: ${f.skill}`);
  if (f.context) out.push(`${labels.context}: ${f.context}`);
  if (f.conditions) out.push(`${labels.conditions}: ${f.conditions.join('; ')}`);
  if (f.steps) f.steps.forEach((s, i) => out.push(`${i === 0 ? `${labels.steps}: ` : ''}${i + 1}. ${s}`));
  if (f.cautions) out.push(`${labels.cautions}: ${f.cautions.join('; ')}`);
  if (f.limits) out.push(`${labels.limits}: ${f.limits}`);
  if (out.length === 0) return splitParagraphs(story.body || story.summary);
  return out;
}
