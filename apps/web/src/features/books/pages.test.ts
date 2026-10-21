import { describe, expect, it } from 'vitest';
import { buildBookPages, chapterParagraphs, paginateParagraphs, splitAt, splitLongParagraph, splitParagraphs, type ChapterInput, type PaginateOptions } from './pages';

const labels = { skill: 'Kỹ năng', context: 'Bối cảnh', conditions: 'Điều kiện', steps: 'Các bước', cautions: 'Lưu ý', limits: 'Giới hạn' };

describe('splitParagraphs', () => {
  it('splits on newlines and drops blanks', () => {
    expect(splitParagraphs('Một.\n\n  Hai  ba.\r\nBốn')).toEqual(['Một.', 'Hai ba.', 'Bốn']);
    expect(splitParagraphs(null)).toEqual([]);
  });
});

describe('splitLongParagraph', () => {
  it('prefers sentence boundaries', () => {
    expect(splitLongParagraph('Câu một. Câu hai. Câu ba.', 18)).toEqual(['Câu một. Câu hai.', 'Câu ba.']);
  });
  it('falls back to words and never exceeds the budget', () => {
    const parts = splitLongParagraph('a'.repeat(5) + ' ' + 'b'.repeat(5) + ' ' + 'c'.repeat(5), 11);
    expect(parts).toEqual(['aaaaa bbbbb', 'ccccc']);
    parts.forEach((p) => expect(p.length).toBeLessThanOrEqual(11));
  });
});

describe('splitAt', () => {
  it('keeps a sentence that ends exactly at the budget', () => {
    expect(splitAt('Một hai. Ba bốn.', 8)).toEqual(['Một hai.', 'Ba bốn.']);
  });
  it('hard-cuts a word longer than the budget and never returns an empty head', () => {
    expect(splitAt('abcdefgh', 3)).toEqual(['abc', 'defgh']);
  });
});

describe('paginateParagraphs', () => {
  it('counts lines, not characters, and never returns zero pages', () => {
    expect(paginateParagraphs([], 3, 5, 10)).toEqual([[]]);
    // Three 2-char paragraphs take a line each: 3 fit the first page, the 4th goes to the next.
    expect(paginateParagraphs(['aa', 'bb', 'cc', 'dd'], 3, 5, 10)).toEqual([['aa', 'bb', 'cc'], ['dd']]);
  });
  it('charges the gap after each paragraph', () => {
    expect(paginateParagraphs(['aa', 'bb', 'cc'], 3, 5, 10, 0.5)).toEqual([['aa', 'bb'], ['cc']]);
  });
  it('splits a paragraph to fill the rest of the page and continues on the next', () => {
    const words = Array.from({ length: 12 }, (_, i) => `w${String(i).padStart(2, '0')}`).join(' '); // 47 chars
    const pages = paginateParagraphs(['intro', words], 3, 3, 10);
    // 'intro' takes a line; 2 lines (20 chars) of the words fill page 1, the remaining 27 chars fit page 2.
    expect(pages.map((p) => p.length)).toEqual([2, 1]);
    expect(pages[0]![0]).toBe('intro');
    expect(pages.flat().join(' ')).toBe(`intro ${words}`);
    for (const page of pages) expect(page.reduce((n, p) => n + Math.ceil(p.length / 10), 0)).toBeLessThanOrEqual(3);
  });
});

describe('buildBookPages', () => {
  const ch = (id: string, paragraphs: string[], durationS: number | null = null, title = `T ${id}`): ChapterInput => ({ storyId: id, title, narrator: 'Bà', paragraphs, durationS });
  // 10 chars a line, 6 lines a page; the heading takes 2 + 1 title line, leaving 3 lines on a chapter's first page.
  const opts: PaginateOptions = {
    charsPerLine: 10,
    linesPerPage: 6,
    paragraphGap: 0,
    headerLines: 2,
    titleCharsPerLine: 10,
    titleLineHeight: 1,
    qrLines: 3,
    tocLinesPerPage: 4,
    tocHeadingLines: 2,
    tocCharsPerLine: 10,
    tocGap: 0,
  };

  it('lays out cover, TOC with correct page numbers, then chapters', () => {
    const pages = buildBookPages([ch('a', ['a1', 'a2', 'a3', 'a4']), ch('b', ['cc'])], opts);
    expect(pages.map((p) => p.kind)).toEqual(['cover', 'toc', 'chapter', 'chapter', 'chapter']);
    const toc = pages[1];
    expect(toc?.kind === 'toc' && toc.entries.map((e) => e.page)).toEqual([2, 4]);
    const chapterPages = pages.filter((p) => p.kind === 'chapter');
    expect(chapterPages.map((p) => p.kind === 'chapter' && [p.chapter, p.first, p.last, p.number])).toEqual([
      [0, true, false, 2],
      [0, false, true, 3],
      [1, true, true, 4],
    ]);
  });

  it('gives a long title fewer body lines on the first page', () => {
    const short = buildBookPages([ch('a', ['x1', 'x2', 'x3'])], opts).filter((p) => p.kind === 'chapter');
    const long = buildBookPages([ch('a', ['x1', 'x2', 'x3'], null, 'Một tiêu đề rất dài')], opts).filter((p) => p.kind === 'chapter');
    expect(short).toHaveLength(1);
    expect(long).toHaveLength(2);
  });

  it('splits a long TOC by wrapped height and shifts chapter numbers', () => {
    const pages = buildBookPages([ch('a', ['x']), ch('b', ['y']), ch('c', ['z'])], opts);
    expect(pages.filter((p) => p.kind === 'toc')).toHaveLength(2);
    const first = pages.find((p) => p.kind === 'chapter');
    expect(first?.kind === 'chapter' && first.number).toBe(3);
    const wrapped = buildBookPages([ch('a', ['x'], null, 'x'.repeat(25))], opts);
    expect(wrapped.filter((p) => p.kind === 'toc')).toHaveLength(1);
  });

  it('carries the last paragraph over with the QR block, or gives the block its own page', () => {
    // First page holds 3 lines; with the QR block (3 lines) only 0 remain → 'b' moves next to the QR.
    const carried = buildBookPages([ch('a', ['aa', 'bb'], 72)], opts).filter((p) => p.kind === 'chapter');
    expect(carried.map((p) => p.kind === 'chapter' && p.paragraphs)).toEqual([['aa'], ['bb']]);
    const alone = buildBookPages([ch('a', ['aa'], 72)], opts).filter((p) => p.kind === 'chapter');
    expect(alone.map((p) => p.kind === 'chapter' && p.paragraphs)).toEqual([['aa'], []]);
    const fits = buildBookPages([ch('a', ['aa'], 72)], { ...opts, linesPerPage: 9 }).filter((p) => p.kind === 'chapter');
    expect(fits).toHaveLength(1);
  });
});

describe('chapterParagraphs', () => {
  it('uses the body for stories, falling back to the summary', () => {
    expect(chapterParagraphs({ kind: 'story', body: 'A\nB', summary: null, fields: {} }, labels)).toEqual(['A', 'B']);
    expect(chapterParagraphs({ kind: 'story', body: '', summary: 'S', fields: {} }, labels)).toEqual(['S']);
  });
  it('labels experience fields and numbers the steps', () => {
    expect(
      chapterParagraphs({ kind: 'experience', body: '', summary: null, fields: { skill: 'Ủ tương', steps: ['Ngâm', 'Nấu'], cautions: ['Nóng'] } }, labels),
    ).toEqual(['Kỹ năng: Ủ tương', 'Các bước: 1. Ngâm', '2. Nấu', 'Lưu ý: Nóng']);
  });
});
