import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import ConnectPage from './ConnectPage';

vi.mock('@/lib/supabase', () => ({ getSupabase: () => null }));

function renderPage(url = '/ket-noi') {
  return render(
    <LocaleProvider initial="vi">
      <MemoryRouter initialEntries={[url]}>
        <ConnectPage />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe('ConnectPage (no Supabase = simulation)', () => {
  it('labels itself as a simulation and never claims a real send', async () => {
    renderPage('/ket-noi?plan=year');
    expect(screen.getByRole('heading', { level: 1, name: 'Kết nối với nhóm điều phối' })).toBeInTheDocument();
    expect(screen.getByText(/chưa thu phí và chưa nhận thanh toán/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Chủ đề bạn muốn trao đổi/), 'Kho cá');
    await userEvent.type(screen.getByLabelText(/Tên của bạn/), 'Lan');
    await userEvent.type(screen.getByLabelText(/Email hoặc số điện thoại/), 'lan@example.com');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Thử gửi (mô phỏng)' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Mô phỏng: đề nghị của bạn chưa được gửi đi');
    expect(screen.queryByText(/Đã tiếp nhận đề nghị/)).not.toBeInTheDocument();
  });

  it('validates required fields and consent before anything is accepted', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Thử gửi (mô phỏng)' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Vui lòng đánh dấu đồng ý để gửi.')).toBeInTheDocument();
    expect(screen.getAllByText('Vui lòng điền thông tin này.').length).toBeGreaterThanOrEqual(3);
  });
});
