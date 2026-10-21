import { describe, expect, it } from 'vitest';
import { AVATAR_PALETTES, avatarInitial, avatarPalette } from './avatar';

describe('avatarInitial', () => {
  it('uses the given name (last word) for Vietnamese names', () => {
    expect(avatarInitial('Nguyễn Thị Lan')).toBe('L');
    expect(avatarInitial('Nguyễn Văn Hùng')).toBe('H');
  });
  it('keeps Vietnamese diacritics and uppercases them', () => {
    expect(avatarInitial('bà út')).toBe('Ú');
    expect(avatarInitial('Ông Đức')).toBe('Đ');
  });
  it('skips punctuation and handles blanks', () => {
    expect(avatarInitial('  "Lan"  ')).toBe('L');
    expect(avatarInitial('')).toBe('?');
    expect(avatarInitial(null)).toBe('?');
  });
});

describe('avatarPalette', () => {
  it('is stable for a seed and always from the palette', () => {
    expect(avatarPalette('abc')).toEqual(avatarPalette('abc'));
    for (const seed of ['a', 'b', 'narrator-1', '9f1c2b7e-0000-4000-8000-000000000000']) {
      expect(AVATAR_PALETTES).toContainEqual(avatarPalette(seed));
    }
  });
  it('spreads different seeds over more than one colour', () => {
    const colours = new Set(Array.from({ length: 30 }, (_, i) => avatarPalette(`seed-${i}`).bg));
    expect(colours.size).toBeGreaterThan(2);
  });
});
