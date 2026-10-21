import { describe, expect, it } from 'vitest';
import { fetchAllPages, nextSort, PROMPT_MAX, promptError, topicQuestions, validateQuestion } from './questions';

describe('question validation', () => {
  it('requires both languages within the length limits', () => {
    expect(promptError('   ')).toBe('required');
    expect(promptError('Ăn?')).toBe('tooShort');
    expect(promptError('x'.repeat(PROMPT_MAX + 1))).toBe('tooLong');
    expect(promptError('  Món ăn ngày Tết của nhà mình?  ')).toBeNull();
    expect(validateQuestion({ vi: 'Món ăn ngày Tết?', en: '' })).toEqual({ vi: null, en: 'required', ok: false });
    expect(validateQuestion({ vi: 'Món ăn ngày Tết?', en: 'A Tet dish?' }).ok).toBe(true);
  });
});

describe('question ordering', () => {
  const qs = [
    { id: 'b', topic_id: 't1', sort: 20 },
    { id: 'a', topic_id: 't1', sort: 10 },
    { id: 'c', topic_id: 't2', sort: 5 },
    { id: 'd', topic_id: 't1', sort: 10 },
  ];
  it('lists one topic by sort, then id', () => {
    expect(topicQuestions(qs, 't1').map((q) => q.id)).toEqual(['a', 'd', 'b']);
  });
  it('puts a new question last', () => {
    expect(nextSort(qs, 't1')).toBe(30);
    expect(nextSort(qs, 'empty')).toBe(10);
  });
});

describe('fetchAllPages', () => {
  it('keeps reading full pages and stops at the first short one', async () => {
    const data = Array.from({ length: 7 }, (_, i) => i);
    const calls: [number, number][] = [];
    const rows = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return data.slice(from, to + 1);
    }, 3);
    expect(rows).toEqual(data);
    expect(calls).toEqual([
      [0, 2],
      [3, 5],
      [6, 8],
    ]);
  });

  it('makes one extra call when the total is an exact multiple of the page size', async () => {
    let n = 0;
    const rows = await fetchAllPages(async (from, to) => {
      n++;
      return [0, 1, 2, 3].slice(from, to + 1);
    }, 2);
    expect(rows).toEqual([0, 1, 2, 3]);
    expect(n).toBe(3);
  });
});
