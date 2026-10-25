import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LocaleProvider, type Locale } from '@/i18n';
import { OrgContactForm } from './OrgContactForm';
import StartPage from './StartPage';

beforeAll(() => {
  for (const proto of [Element.prototype, HTMLElement.prototype]) {
    if (Object.prototype.hasOwnProperty.call(proto, 'animate')) delete (proto as unknown as Record<string, unknown>).animate;
  }
});

function wrap(ui: React.ReactNode, locale: Locale = 'vi') {
  return render(
    <LocaleProvider initial={locale}>
      <MemoryRouter>{ui}</MemoryRouter>
    </LocaleProvider>,
  );
}

describe('/bat-dau', () => {
  it('offers one real destination per role plus the samples', () => {
    wrap(<StartPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Bạn muốn bắt đầu từ đâu?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chọn chủ đề để kể/ })).toHaveAttribute('href', '/ke-chuyen');
    expect(screen.getByRole('link', { name: /Tạo kho gia đình/ })).toHaveAttribute('href', '/dang-ky');
    expect(screen.getByRole('link', { name: /Đã có tài khoản/ })).toHaveAttribute('href', '/dang-nhap');
    expect(screen.getByRole('link', { name: /Vào kho tri thức/ })).toHaveAttribute('href', '/kham-pha');
    expect(screen.getByRole('link', { name: /Nghe chuyện mẫu/ })).toHaveAttribute('href', '/#chuyen-mau');
    expect(screen.getByRole('link', { name: /Xem bản trải nghiệm mẫu/ })).toHaveAttribute('href', '/trai-nghiem');
  });

  it('renders in English', () => {
    wrap(<StartPage />, 'en');
    expect(screen.getByRole('heading', { level: 1, name: 'Where would you like to begin?' })).toBeInTheDocument();
  });
});

describe('OrgContactForm', () => {
  afterEach(() => vi.restoreAllMocks());

  it('falls back to the public contact mailbox when none is configured', () => {
    wrap(<OrgContactForm />);
    expect(screen.getByRole('button', { name: /Soạn email/ })).toBeInTheDocument();
  });

  it('validates, then opens the mail app and never claims the request was sent', () => {
    const assigned: string[] = [];
    const loc = window.location;
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...loc,
      set href(v: string) {
        assigned.push(v);
      },
    } as unknown as Location);
    wrap(<OrgContactForm email="lienhe@example.org" />);
    const submit = screen.getByRole('button', { name: /Soạn email/ });
    fireEvent.click(submit);
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(5);
    expect(assigned).toHaveLength(0);

    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Lan' } });
    fireEvent.change(screen.getByLabelText(/Email hoặc số điện thoại/), { target: { value: 'lan@thuvien.vn' } });
    fireEvent.change(screen.getByLabelText(/Tên tổ chức/), { target: { value: 'Thư viện tỉnh' } });
    fireEvent.change(screen.getByLabelText(/Bạn muốn trao đổi/), { target: { value: 'Ghi lời kể' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(submit);
    expect(assigned).toHaveLength(1);
    expect(assigned[0]).toMatch(/^mailto:lienhe@example\.org\?subject=/);
    expect(screen.getByRole('status')).toHaveTextContent('chưa được gửi');
  });
});
