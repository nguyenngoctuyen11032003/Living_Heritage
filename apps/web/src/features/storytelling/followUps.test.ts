import { describe, expect, it } from 'vitest';
import { aiFollowUps, MAX_FOLLOW_UPS, promptIn, resolveFollowUps, seededFollowUps, textKey } from './followUps';

const seeded = [
  { id: 'q3', sort: 3, prompt_vi: 'Ba?', prompt_en: 'Three?' },
  { id: 'q1', sort: 1, prompt_vi: 'Một?', prompt_en: 'One?' },
  { id: 'q2', sort: 2, prompt_vi: 'Hai?', prompt_en: 'Two?' },
  { id: 'q4', sort: 4, prompt_vi: 'Bốn?', prompt_en: 'Four?' },
  { id: 'q5', sort: 5, prompt_vi: 'Năm?', prompt_en: 'Five?' },
];

describe('follow-up questions', () => {
  it('cleans and caps AI suggestions at three', () => {
    const out = aiFollowUps(['  Ai nấu cùng bà?  ', 'ai nấu cùng bà?', '', 'Món gì?', 'Ở đâu?', 'Khi nào?']);
    expect(out.map((f) => f.text)).toEqual(['Ai nấu cùng bà?', 'Món gì?', 'Ở đâu?']);
    expect(out.every((f) => f.questionId === null)).toBe(true);
    expect(out).toHaveLength(MAX_FOLLOW_UPS);
  });

  it('seeded fallback skips the current and used questions, in order, in the narrator language', () => {
    const out = seededFollowUps(seeded, 'q1', new Set(['q2']), 'en');
    expect(out).toEqual([
      { text: 'Three?', questionId: 'q3' },
      { text: 'Four?', questionId: 'q4' },
      { text: 'Five?', questionId: 'q5' },
    ]);
    expect(promptIn(seeded[0]!, 'vi')).toBe('Ba?');
  });

  it('uses AI when it answered, falls back silently to seeded otherwise', () => {
    const fallback = seededFollowUps(seeded, null, new Set(), 'vi');
    expect(resolveFollowUps(['Món gì?'], fallback)).toEqual({ status: 'ready', source: 'ai', items: [{ text: 'Món gì?', questionId: null }] });
    expect(resolveFollowUps(null, fallback)).toMatchObject({ source: 'seeded', items: fallback });
    expect(resolveFollowUps(['  '], fallback)).toMatchObject({ source: 'seeded' });
    expect(resolveFollowUps(null, [])).toEqual({ status: 'ready', source: 'seeded', items: [] });
  });

  it('textKey is stable and distinct per text', () => {
    expect(textKey('Món gì?')).toBe(textKey('Món gì?'));
    expect(textKey('Món gì?')).not.toBe(textKey('Ở đâu?'));
    expect(textKey('x')).toMatch(/^ai-[0-9a-z]+$/);
  });
});
