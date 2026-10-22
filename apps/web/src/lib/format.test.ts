import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, stripDiacritics } from './format';

describe('format', () => {
  it('formatDuration handles bad input', () => {
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration(-5)).toBe('0:00');
  });
  it('formatDate does not throw on invalid dates', () => {
    expect(formatDate('not-a-date', 'vi')).toBe('');
    expect(formatDate('2026-10-22T00:00:00Z', 'en')).toContain('2026');
  });
  it('stripDiacritics', () => {
    expect(stripDiacritics('Đà Nẵng')).toBe('Da Nang');
  });
});
