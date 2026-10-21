import { describe, expect, it } from 'vitest';
import { hasHonorific, initialQuestion, nextQuestion, pickEasyQuestion } from './questions';

const qs = [
  { id: 'c', sort: 3, topic_id: 't1' },
  { id: 'a', sort: 1, topic_id: 't1' },
  { id: 'b', sort: 2, topic_id: 't1' },
];

describe('nextQuestion', () => {
  it('moves forward in sort order and wraps around', () => {
    expect(nextQuestion(qs, 'a')?.id).toBe('b');
    expect(nextQuestion(qs, 'b')?.id).toBe('c');
    expect(nextQuestion(qs, 'c')?.id).toBe('a');
  });

  it('starts at the first question when nothing is shown yet', () => {
    expect(nextQuestion(qs, null)?.id).toBe('a');
  });

  it('skips questions already answered or skipped', () => {
    expect(nextQuestion(qs, 'a', new Set(['b']))?.id).toBe('c');
    expect(nextQuestion(qs, 'c', new Set(['a']))?.id).toBe('b');
  });

  it('keeps rotating when every question was used', () => {
    expect(nextQuestion(qs, 'a', new Set(['a', 'b', 'c']))?.id).toBe('b');
  });

  it('handles empty and single lists', () => {
    expect(nextQuestion([], null)).toBeNull();
    expect(nextQuestion([{ id: 'x', sort: 1 }], 'x')?.id).toBe('x');
  });
});

describe('initialQuestion', () => {
  it('uses the requested question when it belongs to the topic', () => {
    expect(initialQuestion(qs, 'c')?.id).toBe('c');
  });
  it('falls back to the first unused question', () => {
    expect(initialQuestion(qs, 'zzz', new Set(['a']))?.id).toBe('b');
    expect(initialQuestion(qs, null)?.id).toBe('a');
  });
});

describe('pickEasyQuestion', () => {
  const all = [...qs, { id: 'd', sort: 1, topic_id: 't2' }, { id: 'e', sort: 9, topic_id: 't2' }, { id: 'f', sort: 2, topic_id: 't2' }];
  it('only picks among the first two questions of each topic', () => {
    const picked = new Set(Array.from({ length: 40 }, (_, i) => pickEasyQuestion(all, () => i / 40)?.id));
    expect(picked).toEqual(new Set(['a', 'b', 'd', 'f']));
  });
  it('returns null for no questions', () => {
    expect(pickEasyQuestion([])).toBeNull();
  });
  it('never indexes past the end when random() returns 1', () => {
    expect(pickEasyQuestion(all, () => 1)).not.toBeNull();
  });
});

describe('hasHonorific', () => {
  it('detects a form of address', () => {
    expect(hasHonorific('Bà Lan')).toBe(true);
    expect(hasHonorific('ông Tư')).toBe(true);
    expect(hasHonorific('Nguyễn Văn Ba')).toBe(false);
    expect(hasHonorific('Bảo')).toBe(false);
  });
});
