/**
 * Book pagination (pure). The page preview and the A5 print layout both render the same
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

/**
 * Layout model of an A5 page, in body-text lines. Counting characters alone under-estimated pages made of
 * many short paragraphs (each ends on a partial line and adds a gap), so text overflowed the sheet: clipped
 * in the preview and spilling onto an extra sheet in print. The numbers follow the `cqw` sizes in
 * BookPageView and are deliberately conservative (fewer characters per line than measured in Noto Serif).
 */
export interface PaginateOptions {
  /** Body characters per line. */
  charsPerLine: number;
  /** Body lines on a chapter page (between the top padding and the page number). */
  linesPerPage: number;
  /** Lines taken by the gap after each paragraph. */
  paragraphGap: number;
  /** Chapter heading block on a chapter's first page, excluding the title lines. */
  headerLines: number;
  /** Title characters per line, and the height of one title line in body lines. */
  titleCharsPerLine: number;
  titleLineHeight: number;
  /** The QR block on a chapter's last page (only when the chapter has audio). */
  qrLines: number;
  /** Table of contents: lines per page, its heading (first page), characters per entry line, gap between entries. */
  tocLinesPerPage: number;
  tocHeadingLines: number;
  tocCharsPerLine: number;
  tocGap: number;
}

export const DEFAULT_PAGINATION: PaginateOptions = {
  charsPerLine: 55,
  linesPerPage: 26,
  paragraphGap: 0.6,
  headerLines: 4.5,
  titleCharsPerLine: 22,
  titleLineHeight: 1.65,
  qrLines: 7,
  tocLinesPerPage: 25,
  tocHeadingLines: 4,
  tocCharsPerLine: 38,
  tocGap: 0.6,
};

/** Lines a text of `length` characters wraps to (at least one). */
export function lineCount(length: number, charsPerLine: number): number {
  return Math.max(1, Math.ceil(length / Math.max(1, charsPerLine)));
}

/** Split text into trimmed, non-empty paragraphs (blank-line or single-newline separated). */
export function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Cut `text` into a head of at most `max` chars and the rest: at the last sentence end that keeps at least
 * half the budget, else at the last space, else a hard cut. The head is never empty.
 */
export function splitAt(text: string, max: number): [string, string] {
  const limit = Math.max(1, Math.floor(max));
  if (text.length <= limit) return [text, ''];
  let cut = -1;
  const sentenceEnd = /[.!?…]+["”’)]*\s+/g;
  for (let m = sentenceEnd.exec(text); m; m = sentenceEnd.exec(text)) {
    // The trailing whitespace is dropped, so a sentence ending exactly at the limit still fits.
    if (m.index + m[0].trimEnd().length > limit) break;
    if (m.index + m[0].length >= limit / 2) cut = m.index + m[0].length;
  }
  if (cut < 0) {
    const space = text.lastIndexOf(' ', limit);
    cut = space > 0 ? space : limit;
  }
  const head = text.slice(0, cut).trim();
  if (!head) return [text.slice(0, limit), text.slice(limit).trim()];
  return [head, text.slice(cut).trim()];
}

/** Break one paragraph into pieces of at most `max` chars, preferring sentence then word boundaries. */
export function splitLongParagraph(paragraph: string, max: number): string[] {
  const out: string[] = [];
  let rest = paragraph.trim();
  while (rest.length > max) {
    const [head, tail] = splitAt(rest, max);
    out.push(head);
    rest = tail;
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * Greedily pack paragraphs into pages measured in lines: page 0 holds `firstLines`, later pages `restLines`.
 * A paragraph that does not fit is split to fill the page (when at least two lines are free) and continues
 * on the next page. Never returns zero pages.
 */
export function paginateParagraphs(paragraphs: string[], firstLines: number, restLines: number, charsPerLine: number, gap = 0): string[][] {
  const pages: string[][] = [[]];
  let used = 0;
  const capacity = () => (pages.length === 1 ? firstLines : restLines);
  for (const para of paragraphs) {
    let text = para;
    while (text) {
      const current = pages[pages.length - 1]!;
      const free = capacity() - used;
      const need = lineCount(text.length, charsPerLine) + gap;
      if (need <= free) {
        current.push(text);
        used += need;
        break;
      }
      // Fill what is left of this page; on an empty later page always place a piece so the loop progresses.
      const fit = Math.floor(free - gap);
      if (fit >= 2 || (current.length === 0 && pages.length > 1)) {
        const [head, tail] = splitAt(text, Math.max(1, fit) * charsPerLine);
        current.push(head);
        text = tail;
      }
      pages.push([]);
      used = 0;
    }
  }
  if (pages.length > 1 && pages[pages.length - 1]!.length === 0) pages.pop();
  return pages;
}

/** Split TOC entries into pages by their wrapped height. Always at least one page. */
function paginateToc<T extends { title: string }>(entries: T[], opts: PaginateOptions): T[][] {
  const pages: T[][] = [[]];
  let used = opts.tocHeadingLines;
  for (const e of entries) {
    const need = lineCount(e.title.length, opts.tocCharsPerLine) + opts.tocGap;
    const current = pages[pages.length - 1]!;
    if (current.length > 0 && used + need > opts.tocLinesPerPage) {
      pages.push([e]);
      used = need;
    } else {
      current.push(e);
      used += need;
    }
  }
  return pages;
}

/** Cover, table of contents (with page numbers) and each chapter's pages. Page numbers start at 1 after the cover. */
export function buildBookPages(chapters: ChapterInput[], opts: PaginateOptions = DEFAULT_PAGINATION): BookPage[] {
  const cost = (list: string[]) => list.reduce((n, p) => n + lineCount(p.length, opts.charsPerLine) + opts.paragraphGap, 0);
  const chapterPages = chapters.map((c) => {
    const firstLines = opts.linesPerPage - opts.headerLines - lineCount(c.title.length, opts.titleCharsPerLine) * opts.titleLineHeight;
    const pages = paginateParagraphs(c.paragraphs, firstLines, opts.linesPerPage, opts.charsPerLine, opts.paragraphGap);
    // The QR block goes on the last page. When it does not fit, carry the last paragraph over with it
    // (if that fits beside the block), otherwise the block gets a page of its own.
    if (c.durationS !== null) {
      const last = pages[pages.length - 1]!;
      const capacity = pages.length === 1 ? firstLines : opts.linesPerPage;
      if (cost(last) + opts.qrLines > capacity) {
        const piece = last[last.length - 1];
        if (last.length > 1 && piece !== undefined && cost([piece]) + opts.qrLines <= opts.linesPerPage) pages.push([last.pop()!]);
        else pages.push([]);
      }
    }
    return pages;
  });

  const tocPages = paginateToc(
    chapters.map((c, i) => ({ chapter: i + 1, title: c.title, page: 0 })),
    opts,
  );
  let pageNo = tocPages.length + 1;
  tocPages.flat().forEach((entry, i) => {
    entry.page = pageNo;
    pageNo += chapterPages[i]!.length;
  });

  const out: BookPage[] = [{ kind: 'cover' }];
  tocPages.forEach((entries, p) => out.push({ kind: 'toc', number: p + 1, entries }));
  let n = tocPages.length + 1;
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
