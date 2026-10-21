import { describe, expect, it } from 'vitest';
import { buildExcerpt, truncateWords } from './excerpt';

describe('truncateWords', () => {
  it('keeps short text and cuts long text at a word boundary', () => {
    expect(truncateWords('ngắn thôi', 20)).toBe('ngắn thôi');
    expect(truncateWords('Một hai ba bốn năm sáu bảy', 14)).toBe('Một hai ba bốn…');
  });
  it('drops trailing punctuation before the ellipsis', () => {
    expect(truncateWords('Ngày xưa, bà kể, chuyện dài lắm', 17)).toBe('Ngày xưa, bà kể…');
  });
});

describe('buildExcerpt', () => {
  it('prefers the summary, then the body', () => {
    expect(buildExcerpt({ summary: 'Tóm tắt', body: 'Thân bài' })).toBe('Tóm tắt');
    expect(buildExcerpt({ summary: '  ', body: '# Tiêu đề\n\n"Ngày ấy   mẹ còn trẻ."' })).toBe('Tiêu đề Ngày ấy mẹ còn trẻ.');
  });
  it('falls back to experience fields', () => {
    expect(buildExcerpt({ body: '', fields: { skill: 'Ủ tương', steps: ['Ngâm đậu'] } })).toBe('Ủ tương');
    expect(buildExcerpt({ body: '', fields: { steps: ['Ngâm đậu qua đêm'] } })).toBe('Ngâm đậu qua đêm');
  });
  it('returns empty string when there is no text', () => {
    expect(buildExcerpt({ body: '', fields: [] })).toBe('');
  });
  it('respects the max length', () => {
    const long = 'chữ '.repeat(100);
    expect(buildExcerpt({ body: long }, 40).length).toBeLessThanOrEqual(41);
  });
});
