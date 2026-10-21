import { describe, expect, it } from 'vitest';
import { composeConnectMessage, isPlausibleContact, validateConnect } from './connect';
import { getSampleItem } from './sample-items';
import { readSaved, removeSaved, SAVED_STORAGE_KEY, toggleSaved, withdrawnIds, type SavedEntry } from './saved';
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
  it('rejects contact details that are neither an email nor a phone number', () => {
    expect(validateConnect({ ...ok, contact: 'abc' }).contact).toBe('contactInvalid');
    expect(validateConnect({ ...ok, contact: '12345' }).contact).toBe('contactInvalid');
    expect(validateConnect({ ...ok, contact: '0912 345 678' })).toEqual({});
  });
  it('recognises plausible emails and phone numbers', () => {
    for (const v of ['an@example.com', ' an.nguyen@mail.vn ', '+84 912 345 678', '(028) 3822-1234', '0912.345.678']) expect(isPlausibleContact(v)).toBe(true);
    for (const v of ['an@', 'an@example', 'hello world', '0912', '09123456789012345', 'zalo: 0912345678']) expect(isPlausibleContact(v)).toBe(false);
  });
  it('prefixes the chosen format', () => {
    expect(composeConnectMessage('Hỏi thêm', '  Chào bà ')).toBe('[Hỏi thêm] Chào bà');
  });
});

describe('withdrawn saved items (NT09)', () => {
  const entry = (id: string): SavedEntry => ({ id, title: 'T', kind: 'story', topicSlug: null, narratorLabel: 'N', region: null, savedAt: '2026-10-01T00:00:00Z' });
  const live = '11111111-1111-4111-8111-111111111111';
  const gone = '22222222-2222-4222-8222-222222222222';
  it('marks real items missing from public_items, never samples', () => {
    const out = withdrawnIds([entry(live), entry(gone), entry('mau-ca-kho-to')], new Set([live]));
    expect([...out]).toEqual([gone]);
  });
});
