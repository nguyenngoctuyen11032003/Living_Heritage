import { fireEvent, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
    expect(screen.getByText('Người quét cần có quyền xem.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mùa gặt/ })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Trang 3 / 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Trang 2 / 3')).toBeInTheDocument();
  });
});
