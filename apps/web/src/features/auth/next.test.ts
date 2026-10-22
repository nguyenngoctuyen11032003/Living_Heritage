import { describe, expect, it } from 'vitest';
import { loginHref, safeNext } from './next';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/gia-dinh/thanh-vien?invite=1')).toBe('/gia-dinh/thanh-vien?invite=1');
    expect(safeNext('/moi/abc')).toBe('/moi/abc');
  });
  it('rejects open-redirect shapes', () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', '/a\tb', 'javascript:alert(1)', '', null, undefined]) {
      expect(safeNext(bad)).toBe('/gia-dinh');
    }
  });
  it('rejects the auth pages to avoid redirect loops', () => {
    expect(safeNext('/dang-nhap')).toBe('/gia-dinh');
    expect(safeNext('/dang-nhap?next=/x')).toBe('/gia-dinh');
    expect(safeNext('/dang-ky/')).toBe('/gia-dinh');
    expect(safeNext('/dang-nhap-khac')).toBe('/dang-nhap-khac');
  });
  it('loginHref drops unsafe next', () => {
    expect(loginHref('//evil.com')).toBe('/dang-nhap');
    expect(loginHref('/moi/abc')).toBe('/dang-nhap?next=%2Fmoi%2Fabc');
  });
});
