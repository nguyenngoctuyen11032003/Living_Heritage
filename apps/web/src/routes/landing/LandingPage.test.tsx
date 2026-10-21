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
    expect(within(tablist).getAllByRole('tab')).toHaveLength(3);
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
  });

  it('renders in English', () => {
    renderLanding('en');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Keep their voices,');
    expect(screen.getAllByRole('link', { name: /Tell your first story/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('tablist', { name: 'Outputs from one narration' })).toBeInTheDocument();
    expect(screen.getAllByText('Illustrative data').length).toBeGreaterThan(0);
    expect(screen.getByText('This project is in its pilot phase')).toBeInTheDocument();
    expect(screen.queryByText('Kể câu chuyện đầu tiên')).not.toBeInTheDocument();
  });
});
