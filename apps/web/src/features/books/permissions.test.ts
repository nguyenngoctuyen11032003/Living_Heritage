import { describe, expect, it } from 'vitest';
import { canEditBook } from './permissions';

describe('canEditBook', () => {
  const families = [
    { id: 'a', role: 'owner' as const },
    { id: 'b', role: 'editor' as const },
    { id: 'c', role: 'viewer' as const },
    { id: 'd', role: 'manager' as const },
  ];
  it('lets owners, managers and editors of the book family edit and print', () => {
    expect(canEditBook(families, 'a')).toBe(true);
    expect(canEditBook(families, 'b')).toBe(true);
    expect(canEditBook(families, 'd')).toBe(true);
  });
  it('refuses viewers and people outside the family', () => {
    expect(canEditBook(families, 'c')).toBe(false);
    expect(canEditBook(families, 'zzz')).toBe(false);
    expect(canEditBook([], 'a')).toBe(false);
  });
});
