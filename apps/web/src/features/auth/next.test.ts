import { describe, expect, it } from 'vitest';
import { siteHref } from '@/lib/env';
import { callbackUrl, DEFAULT_AFTER_LOGIN, loginHref, safeNext } from './next';

describe('safeNext (open-redirect guard)', () => {
  it('keeps same-site absolute paths with query and hash', () => {
    expect(safeNext('/gia-dinh')).toBe('/gia-dinh');
    expect(safeNext('/moi/Abc_123?x=1#y')).toBe('/moi/Abc_123?x=1#y');
    expect(safeNext('  /cai-dat  ')).toBe('/cai-dat');
  });

  it.each([
    ['empty', ''],
    ['null', null],
    ['protocol-relative', '//evil.example'],
    ['protocol-relative after trim', '  //evil.example'],
    ['absolute URL', 'https://evil.example/gia-dinh'],
    ['javascript: URL', 'javascript:alert(1)'],
    ['backslash trick', '/\\evil.example'],
    ['backslash first', '\\\\evil.example'],
    ['tab inside', '/\t/evil.example'],
    ['newline inside', '/\n/evil.example'],
    ['relative path', 'gia-dinh'],
    ['encoded slashes without leading slash', '%2F%2Fevil.example'],
  ])('rejects %s', (_label, raw) => {
    expect(safeNext(raw)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext(raw, '/x')).toBe('/x');
  });
});

describe('loginHref / callbackUrl', () => {
  it('encodes a safe next and drops an unsafe one', () => {
    expect(loginHref('/moi/abc')).toBe('/dang-nhap?next=%2Fmoi%2Fabc');
    expect(loginHref('//evil.example')).toBe('/dang-nhap');
    expect(loginHref(null, '/dang-ky')).toBe('/dang-ky');
  });

  it('points email links at /auth/callback with a sanitised next', () => {
    expect(callbackUrl('/dat-lai-mat-khau')).toBe(siteHref('/auth/callback?next=%2Fdat-lai-mat-khau'));
    expect(callbackUrl('https://evil.example')).toBe(siteHref(`/auth/callback?next=${encodeURIComponent(DEFAULT_AFTER_LOGIN)}`));
  });
});
