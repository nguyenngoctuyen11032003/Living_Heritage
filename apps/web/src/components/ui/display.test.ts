import { describe, expect, it } from 'vitest';
import { baseDisplay, hasDisplayOverride } from './display';

describe('baseDisplay', () => {
  it('keeps the base display when the caller sets none', () => {
    expect(baseDisplay('inline-flex', 'mt-4 gap-2')).toBe('inline-flex');
    expect(baseDisplay('inline-flex', undefined)).toBe('inline-flex');
  });

  it('drops the base display when the caller sets an unprefixed one', () => {
    expect(baseDisplay('inline-flex', 'hidden sm:inline-flex')).toBe('');
    expect(baseDisplay('inline-flex', 'mb-4 flex w-full')).toBe('');
    expect(hasDisplayOverride('!hidden')).toBe(true);
  });

  it('ignores responsive variants and look-alike utilities', () => {
    expect(hasDisplayOverride('sm:hidden md:flex')).toBe(false);
    expect(hasDisplayOverride('flex-1 flex-col grid-cols-2 overflow-hidden')).toBe(false);
  });
});
