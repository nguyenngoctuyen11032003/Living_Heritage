import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins classes and skips falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
    expect(cn('  px-4   py-2 ', '')).toBe('px-4 py-2');
    expect(cn()).toBe('');
  });

  it('lets a later display utility replace an earlier one (QA P0 #1)', () => {
    expect(cn('inline-flex items-center', 'hidden sm:inline-flex')).toBe('items-center hidden sm:inline-flex');
    expect(cn('flex flex-col', 'grid')).toBe('flex-col grid');
    const off = false as boolean;
    expect(cn('block', off && 'hidden')).toBe('block');
  });

  it('leaves variants, important utilities and look-alikes alone', () => {
    expect(cn('flex', 'md:hidden group-hover:block')).toBe('flex md:hidden group-hover:block');
    expect(cn('flex', '!hidden')).toBe('flex !hidden');
    expect(cn('flex flex-1 grid-cols-2 overflow-hidden inline-size')).toBe('flex flex-1 grid-cols-2 overflow-hidden inline-size');
  });
});
