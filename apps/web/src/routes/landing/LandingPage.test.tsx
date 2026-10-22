import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { LocaleProvider, type Locale } from '@/i18n';
import LandingPage from './LandingPage';

// happy-dom's Animation.cancel() rejects `finished` without a handler; make motion use its JS driver instead of WAAPI.
beforeAll(() => {
  for (const proto of [Element.prototype, HTMLElement.prototype]) {
    if (Object.prototype.hasOwnProperty.call(proto, 'animate')) delete (proto as unknown as Record<string, unknown>).animate;
  }
});

function renderLanding(locale: Locale) {
  return render(
    <LocaleProvider initial={locale}>
      <MemoryRouter>
        <SiteHeader />
        <main id="main">
          <LandingPage />
        </main>
        <SiteFooter />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe('LandingPage', () => {
  it('renders all blocks in Vietnamese (default)', () => {
    renderLanding('vi');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Giữ lại giọng kể,');
    expect(h1).toHaveTextContent('trao truyền kinh nghiệm');
    expect(screen.getByText('Đang thử nghiệm · 2026')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Kể câu chuyện đầu tiên/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: /Nghe chuyện mẫu/ })).toBeInTheDocument();
    // how it works: four steps and the people × AI split
    const steps = within(screen.getByRole('region', { name: 'Bốn bước, từ lời kể đến di sản' })).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(screen.getByRole('heading', { level: 3, name: 'Con người quyết định' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'AI làm phần nặng nhọc' })).toBeInTheDocument();
    // honesty labels
    expect(screen.getAllByText('Dữ liệu minh họa').length).toBeGreaterThan(0);
    expect(screen.getByText(/Video nền là cảnh minh họa/)).toBeInTheDocument();
    // FAQ
    expect(screen.getByRole('button', { name: 'Dự án đã thu tiền chưa?' })).toHaveAttribute('aria-expanded', 'false');
    // footer status line
    expect(screen.getByText('Dự án đang trong giai đoạn thử nghiệm')).toBeInTheDocument();
  }, 30_000);

  it('every sample card and "Xem câu chuyện" opens a real detail screen; each block leads to its page', () => {
    renderLanding('vi');
    expect(screen.getByRole('link', { name: 'Xem câu chuyện' })).toHaveAttribute('href', '/tri-thuc/mau-tet-ao-moi');
    const knowledge = screen.getByRole('region', { name: 'Học từ những người đã làm cả đời' });
    const detailLinks = within(knowledge)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((h) => h?.startsWith('/tri-thuc/'));
    expect(detailLinks).toHaveLength(6);
    for (const href of detailLinks) expect(href).toMatch(/^\/tri-thuc\/mau-[a-z-]+$/);
    expect(within(knowledge).getByRole('link', { name: /Xem toàn bộ kho tri thức/ })).toHaveAttribute('href', '/kham-pha');
    // hero: one primary CTA, the knowledge search, the 58 s sample, the demo and the page-wide video pause
    const hero = within(screen.getByRole('region', { name: /Giữ lại giọng kể/ }));
    expect(hero.getByRole('link', { name: /Kể câu chuyện đầu tiên/ })).toHaveAttribute('href', '/ke-chuyen');
    expect(hero.getByRole('searchbox', { name: 'Tìm trong kho tri thức' })).toBeInTheDocument();
    expect(hero.getByRole('button', { name: 'Nghe chuyện mẫu' })).toBeInTheDocument();
    expect(hero.getByRole('link', { name: 'Trải nghiệm thử (dữ liệu mẫu)' })).toHaveAttribute('href', '/trai-nghiem');
    expect(hero.getByRole('button', { name: /video nền/ })).toBeInTheDocument();
    // how it works → its page and the demo
    expect(screen.getByRole('link', { name: /Xem cách hoạt động/ })).toHaveAttribute('href', '/cach-hoat-dong');
    expect(screen.getByRole('link', { name: /Dùng thử với dữ liệu mẫu/ })).toHaveAttribute('href', '/trai-nghiem');
    // one card per marketing page
    const services = within(screen.getByRole('region', { name: 'Một lời kể, nhiều nơi để sống tiếp' }));
    expect(services.getByRole('link', { name: 'Mở kho tri thức' })).toHaveAttribute('href', '/kham-pha');
    expect(services.getByRole('link', { name: 'Xem trang sách ký ức' })).toHaveAttribute('href', '/sach-ky-uc');
    expect(services.getByRole('link', { name: 'Xem chương trình cho tổ chức' })).toHaveAttribute('href', '/to-chuc');
    expect(screen.getByRole('link', { name: /Đọc chính sách quyền riêng tư/ })).toHaveAttribute('href', '/quyen-rieng-tu');
    // no fake achievement numbers (NT03)
    expect(document.body.textContent).not.toMatch(/(^|\D)(20 người|50 nội dung|80 ?%)/);
  }, 30_000);

  it('renders in English', () => {
    renderLanding('en');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Keep their voices,');
    expect(screen.getAllByRole('link', { name: /Tell your first story/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('region', { name: 'One story, many places to live on' })).toBeInTheDocument();
    expect(screen.getAllByText('Illustrative data').length).toBeGreaterThan(0);
    expect(screen.getByText('This project is in its pilot phase')).toBeInTheDocument();
    expect(screen.queryByText('Kể câu chuyện đầu tiên')).not.toBeInTheDocument();
  }, 30_000);
});
