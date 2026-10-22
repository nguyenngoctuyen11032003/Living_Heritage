import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './router';

const known = [
  '/', '/cach-hoat-dong', '/goi-dich-vu', '/to-chuc', '/quyen-rieng-tu', '/dieu-khoan', '/sach-ky-uc',
  '/dang-nhap', '/dang-ky', '/auth/callback', '/k/abc', '/ke-chuyen', '/ke-chuyen/phien/1', '/gia-dinh/thanh-vien',
  '/ban-nhap/1', '/sach', '/sach/1', '/kham-pha', '/tri-thuc/1', '/nghe/1', '/quan-tri', '/da-luu', '/cai-dat',
  '/gia-dinh/bo-suu-tap', '/bat-dau', '/thanh-vien', '/bo-suu-tap',
];

describe('route table', () => {
  it.each(known)('%s resolves to a real route', (path) => {
    const m = matchRoutes(routes, path);
    expect(m).not.toBeNull();
    expect(m!.at(-1)!.route.path).not.toBe('*');
  });

  it('unknown paths fall through to the 404 route', () => {
    expect(matchRoutes(routes, '/khong-ton-tai')!.at(-1)!.route.path).toBe('*');
  });
});
