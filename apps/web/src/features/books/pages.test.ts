import { describe, expect, it } from 'vitest';
import { buildBookPages, chapterParagraphs, paginateParagraphs, splitLongParagraph, splitParagraphs, type ChapterInput } from './pages';

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

describe('paginateParagraphs', () => {
  it('uses a smaller budget on the first page and never returns zero pages', () => {
    expect(paginateParagraphs([], 10, 20)).toEqual([[]]);
    const pages = paginateParagraphs(['aaaaaaaa', 'bbbbbbbb', 'cccccccc'], 10, 20);
    expect(pages).toEqual([['aaaaaaaa'], ['bbbbbbbb', 'cccccccc']]);
  });
});

describe('buildBookPages', () => {
  const ch = (id: string, paragraphs: string[], durationS: number | null = null): ChapterInput => ({ storyId: id, title: `T ${id}`, narrator: 'Bà', paragraphs, durationS });
  const opts = { charsPerPage: 20, firstPageChars: 10, qrReserve: 5, tocEntriesPerPage: 2 };

  it('lays out cover, TOC with correct page numbers, then chapters', () => {
    const pages = buildBookPages([ch('a', ['aaaaaaaa', 'bbbbbbbb']), ch('b', ['cc'])], opts);
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

  it('splits a long TOC across pages and shifts chapter numbers', () => {
    const pages = buildBookPages([ch('a', ['x']), ch('b', ['y']), ch('c', ['z'])], opts);
    expect(pages.filter((p) => p.kind === 'toc')).toHaveLength(2);
    const first = pages.find((p) => p.kind === 'chapter');
    expect(first?.kind === 'chapter' && first.number).toBe(3);
  });

  it('moves the last paragraph to a new page to leave room for the QR block', () => {
    const pages = buildBookPages([ch('a', ['aaaa', 'bbbb'], 72)], opts);
    expect(pages.filter((p) => p.kind === 'chapter')).toHaveLength(2);
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
