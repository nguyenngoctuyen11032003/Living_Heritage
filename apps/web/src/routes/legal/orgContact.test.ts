import { describe, expect, it } from 'vitest';
import { buildOrgMailto, contactEmail, validateOrgContact } from './orgContact';

const ok = { name: 'Lan', contact: 'lan@thuvien.vn', organisation: 'Thư viện tỉnh', message: 'Chúng tôi muốn ghi lại lời kể.', consent: true };

describe('org contact', () => {
  it('accepts a complete form with an email or a phone number', () => {
    expect(validateOrgContact(ok)).toEqual({});
    expect(validateOrgContact({ ...ok, contact: '+84 912 345 678' })).toEqual({});
  });

  it('flags missing fields, a malformed contact and missing consent', () => {
    expect(validateOrgContact({ name: ' ', contact: '', organisation: '', message: '', consent: false })).toEqual({
      name: 'required',
      contact: 'required',
      organisation: 'required',
      message: 'required',
      consent: 'required',
    });
    expect(validateOrgContact({ ...ok, contact: 'abc' }).contact).toBe('contactInvalid');
  });

  it('only uses a well-formed configured mailbox', () => {
    expect(contactEmail(undefined)).toBeNull();
    expect(contactEmail('  ')).toBeNull();
    expect(contactEmail('not-an-email')).toBeNull();
    expect(contactEmail(' lienhe@disansong.vn ')).toBe('lienhe@disansong.vn');
  });

  it('builds an encoded mailto with labelled lines', () => {
    const href = buildOrgMailto('a@b.vn', 'Đề nghị — Thư viện', [
      ['Tên', ' Lan '],
      ['Lời nhắn', 'A & B'],
    ]);
    expect(href.startsWith('mailto:a@b.vn?subject=')).toBe(true);
    const url = new URL(href);
    expect(url.searchParams.get('subject')).toBe('Đề nghị — Thư viện');
    expect(url.searchParams.get('body')).toBe('Tên: Lan\nLời nhắn: A & B');
  });
});
