import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import DemoPage from './DemoPage';
import { STORAGE_KEY } from './state';

const wrap = (locale: 'vi' | 'en') =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <LocaleProvider initial={locale}>
        <MemoryRouter>{children}</MemoryRouter>
      </LocaleProvider>
    );
  };

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('DemoPage', () => {
  it('walks the whole journey without any network call', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<DemoPage />, { wrapper: wrap('vi') });
    expect(screen.getByText(/Bản trải nghiệm mẫu — dữ liệu minh họa, không lưu lên máy chủ/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Món ăn/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Một kỷ niệm/ }));
    fireEvent.click(screen.getByRole('button', { name: /Nghe lời kể mẫu/ }));
    expect(screen.getByText('Mô phỏng · không có âm thanh')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xem bản chép lời' }));
    // The draft is blocked until the uncertain words are checked.
    fireEvent.click(screen.getByRole('button', { name: 'Xem bản nháp' }));
    expect(screen.getByText(/Hãy xem chỗ “Cần kiểm tra”/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hoặc gõ lại cho đúng'), { target: { value: 'Sáu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu chỗ sửa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem bản nháp' }));

    expect(screen.getAllByText('Mô phỏng kết quả AI').length).toBeGreaterThan(0);
    const body = screen.getByLabelText(/Nội dung/) as HTMLTextAreaElement;
    expect(body.value).toContain('dì Sáu');
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Nồi cá kho của má' } });
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục: xác nhận/ }));

    expect(screen.getByRole('heading', { name: 'Nội dung này đã đúng điều bác muốn kể chưa?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đúng rồi' }));

    fireEvent.click(screen.getByRole('radio', { name: /Đề nghị công bố/ }));
    expect(screen.getByText(/mọi người, sau khi ban biên tập duyệt/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lưu vào kho gia đình/ }));

    expect(screen.getByRole('heading', { name: 'Kho gia đình mẫu' })).toBeInTheDocument();
    expect(screen.getByText('Nồi cá kho của má')).toBeInTheDocument();
    expect(screen.getAllByText('Đã đề nghị công bố · chờ duyệt').length).toBeGreaterThan(0);
    for (const status of ['Bản nháp · chờ người kể duyệt', 'Riêng tư', 'Người được mời', 'Công khai']) {
      expect(screen.getAllByText(status).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('link', { name: 'Xem thẻ công khai' })).toHaveAttribute('href', '/tri-thuc/mau-tuot-la-mai');

    fireEvent.click(screen.getByRole('button', { name: 'Mở chương sách mẫu' }));
    expect(screen.getByRole('heading', { name: /Chương 1/ })).toBeInTheDocument();
    expect(screen.getByText('Nồi cá kho của má')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toContain('Nồi cá kho của má');
  });

  it('restores the sample data from the banner', () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, step: 'vault', topic: null, kind: null, heard: false, check: { status: 'pending', value: '' }, draft: null, confirmed: false, scope: null, saved: null, openId: null }));
    render(<DemoPage />, { wrapper: wrap('en') });
    expect(screen.getByRole('heading', { name: 'Sample family archive' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore sample data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByRole('heading', { name: 'What would you like to talk about today?' })).toBeInTheDocument();
  });
});
