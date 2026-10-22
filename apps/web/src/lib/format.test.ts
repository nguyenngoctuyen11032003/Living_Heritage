import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, formatVnd, stripDiacritics } from './format';

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
  it('formatVnd and stripDiacritics', () => {
    expect(formatVnd(NaN, 'vi')).toBe('');
    expect(formatVnd(50000, 'vi')).toContain('50.000');
    expect(stripDiacritics('Đà Nẵng')).toBe('Da Nang');
  });
});
