import { describe, expect, it } from 'vitest';
import { composeConnectMessage, validateConnect } from './connect';
import { getSampleItem } from './sample-items';
import { readSaved, removeSaved, SAVED_STORAGE_KEY, toggleSaved } from './saved';
import { sampleToItem } from './types';

describe('saved list (localStorage)', () => {
  const item = sampleToItem(getSampleItem('mau-ca-kho-to')!, 'vi');

  it('toggles an item in and out, newest first', () => {
    expect(readSaved()).toEqual([]);
    expect(toggleSaved(item)).toBe(true);
    const other = sampleToItem(getSampleItem('mau-tet-ao-moi')!, 'vi');
    toggleSaved(other);
    expect(readSaved().map((e) => e.id)).toEqual(['mau-tet-ao-moi', 'mau-ca-kho-to']);
    expect(toggleSaved(item)).toBe(false);
    removeSaved('mau-tet-ao-moi');
    expect(readSaved()).toEqual([]);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem(SAVED_STORAGE_KEY, '{not json');
    expect(readSaved()).toEqual([]);
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify([{ id: 1 }, { id: 'x', title: 't', kind: 'story', savedAt: 'now' }]));
    expect(readSaved().map((e) => e.id)).toEqual(['x']);
  });
});

describe('connect form validation', () => {
  const ok = { name: 'An', contact: 'an@example.com', format: 'question' as const, message: 'Xin hỏi thêm', consent: true };
  it('accepts a complete form', () => {
    expect(validateConnect(ok)).toEqual({});
  });
  it('requires name, contact (≥3), message and consent', () => {
    expect(validateConnect({ ...ok, name: ' ', contact: 'ab', message: '', consent: false })).toEqual({
      name: 'required',
      contact: 'contactInvalid',
      message: 'required',
      consent: 'consentRequired',
    });
  });
  it('prefixes the chosen format', () => {
    expect(composeConnectMessage('Hỏi thêm', '  Chào bà ')).toBe('[Hỏi thêm] Chào bà');
  });
});
