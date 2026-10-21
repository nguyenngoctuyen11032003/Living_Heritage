import { describe, expect, it } from 'vitest';
import { NARRATIONS } from './data';
import { clock, explorePath, lineAt } from './helpers';

describe('demo helpers', () => {
  it('formats the simulated clock', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(46.9)).toBe('0:46');
    expect(clock(125)).toBe('2:05');
    expect(clock(-3)).toBe('0:00');
  });

  it('finds the line being said', () => {
    const lines = NARRATIONS.memory.lines;
    expect(lineAt(lines, 0)).toBe(0);
    expect(lineAt(lines, 16.9)).toBe(1);
    expect(lineAt(lines, 17)).toBe(2);
    expect(lineAt(lines, 999)).toBe(lines.length - 1);
    expect(lineAt([], 5)).toBe(-1);
  });

  it('links to the know-how cards of a topic on /kham-pha', () => {
    expect(explorePath('lam-vuon')).toBe('/kham-pha?chu-de=lam-vuon&loai=kinh-nghiem');
  });
});
