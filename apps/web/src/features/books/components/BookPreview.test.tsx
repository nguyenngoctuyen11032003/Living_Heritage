import { fireEvent, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { buildBookPages, type ChapterInput } from '../pages';
import { BookPreview } from './BookPreview';

const chapters: ChapterInput[] = [{ storyId: 's1', title: 'Mùa gặt', narrator: 'Ông Ba', paragraphs: ['Ngày ấy lúa chín vàng.'], durationS: 72 }];

// happy-dom's WAAPI rejects cancelled animations; skip motion in this test.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

describe('BookPreview', () => {
  it('turns pages with the arrow keys and shows the QR caption on the chapter page', () => {
    const pages = buildBookPages(chapters);
    render(
      <LocaleProvider initial="vi">
        <BookPreview open onClose={() => {}} book={{ title: 'Chuyện nhà mình', subtitle: null, cover_style: 'giay-do' }} pages={pages} chapters={chapters} />
      </LocaleProvider>,
    );
    expect(screen.getByText('Trang 1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chuyện nhà mình' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Trang 2 / 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Trang 3 / 3')).toBeInTheDocument();
    expect(screen.getByText('Quét để nghe giọng kể gốc · 1:12')).toBeInTheDocument();
    expect(screen.getByText('Người quét cần đăng nhập và có quyền xem. Mã chỉ mở được khi bản ghi còn trong kho.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mùa gặt/ })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Trang 3 / 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Trang 2 / 3')).toBeInTheDocument();
    // The table of contents links to the chapter's page.
    fireEvent.click(screen.getByRole('button', { name: 'Mở chương 1: Mùa gặt, trang 2' }));
    expect(screen.getByText('Trang 3 / 3')).toBeInTheDocument();
  });

  describe('keyboard hint', () => {
    const renderPreview = () =>
      render(
        <LocaleProvider initial="vi">
          <BookPreview open onClose={() => {}} book={{ title: 'Sách', subtitle: null, cover_style: 'giay-do' }} pages={buildBookPages(chapters)} chapters={chapters} />
        </LocaleProvider>,
      );
    afterEach(() => vi.unstubAllGlobals());

    it('is hidden on touch screens', () => {
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
      renderPreview();
      expect(screen.queryByText('Dùng phím ← → để lật trang.')).not.toBeInTheDocument();
    });
    it('is shown with a mouse / keyboard', () => {
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('pointer: fine'), media: q, addEventListener() {}, removeEventListener() {} }));
      renderPreview();
      expect(screen.getByText('Dùng phím ← → để lật trang.')).toBeInTheDocument();
    });
  });
});
