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
    // tabs: one narration, three outputs
    const tablist = screen.getByRole('tablist', { name: 'Các đầu ra từ một lời kể' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Câu chuyện gia đình', 'Kinh nghiệm thực tiễn', 'Bản chép lời gốc']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    // honesty labels
    expect(screen.getAllByText('Dữ liệu minh họa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Giá dự kiến, chưa thu phí').length).toBeGreaterThan(0);
    expect(screen.getByText('149.000đ')).toBeInTheDocument();
    // QR is a real, labelled SVG
    expect(screen.getAllByRole('img', { name: 'Mã QR mở trang nghe bản gốc' }).length).toBeGreaterThan(0);
    // FAQ
    expect(screen.getByRole('button', { name: 'Dự án đã thu tiền chưa?' })).toHaveAttribute('aria-expanded', 'false');
    // footer status line
    expect(screen.getByText('Dự án đang trong giai đoạn thử nghiệm')).toBeInTheDocument();
  }, 30_000);

  it('every sample card and "Xem câu chuyện" opens a real detail screen; value cards and trust lead to their pages', () => {
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
    expect(screen.getByRole('link', { name: /Thử chế độ kể chuyện/ })).toHaveAttribute('href', '/ke-chuyen');
    expect(screen.getByRole('link', { name: /Xem kho gia đình/ })).toHaveAttribute('href', '/gia-dinh');
    for (const a of screen.getAllByRole('link', { name: /Khám phá tri thức/ })) expect(a).toHaveAttribute('href', '/kham-pha');
    expect(screen.getByRole('link', { name: /Đọc chính sách quyền riêng tư/ })).toHaveAttribute('href', '/quyen-rieng-tu');
    // hero: one primary CTA to topic selection + the small listen card for the 58 s sample
    const hero = screen.getByRole('region', { name: /Giữ lại giọng kể/ });
    expect(within(hero).getByRole('link', { name: /Kể câu chuyện đầu tiên/ })).toHaveAttribute('href', '/ke-chuyen');
    expect(within(hero).getByRole('button', { name: /Nghe thử.*Bộ áo mới sáng mùng Một.*0:58/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trải nghiệm thử (dữ liệu mẫu)' })).toHaveAttribute('href', '/trai-nghiem');
    expect(screen.getByRole('link', { name: /Dùng thử với dữ liệu mẫu/ })).toHaveAttribute('href', '/trai-nghiem');
    expect(screen.getByText('Dữ liệu minh họa — không tạo từ dữ liệu người dùng')).toBeInTheDocument();
    // no fake achievement numbers (NT03)
    expect(document.body.textContent).not.toMatch(/(^|\D)(20 người|50 nội dung|80 ?%)/);
  }, 30_000);

  it('renders in English', () => {
    renderLanding('en');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Keep their voices,');
    expect(screen.getAllByRole('link', { name: /Tell your first story/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('tablist', { name: 'Outputs from one narration' })).toBeInTheDocument();
    expect(screen.getAllByText('Illustrative data').length).toBeGreaterThan(0);
    expect(screen.getByText('This project is in its pilot phase')).toBeInTheDocument();
    expect(screen.queryByText('Kể câu chuyện đầu tiên')).not.toBeInTheDocument();
  }, 30_000);
});
