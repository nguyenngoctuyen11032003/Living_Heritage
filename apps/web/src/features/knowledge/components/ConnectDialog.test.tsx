import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui';
import { LocaleProvider } from '@/i18n';
import { fromPublicRow } from '../types';
import { ConnectDialog } from './ConnectDialog';

const inserts: unknown[] = [];
let insertError: { message: string } | null = null;

const track = vi.fn();
vi.mock('@/lib/events', () => ({ track: (code: string) => track(code) }));
vi.mock('@/lib/session', () => ({ useSession: () => ({ user: { id: 'u-1' }, loading: false }) }));
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      insert: async (row: unknown) => {
        inserts.push(row);
        return { error: insertError };
      },
    }),
  }),
}));

const item = fromPublicRow({ id: '11111111-1111-4111-8111-111111111111', kind: 'experience', title: '“Tuốt lá mai”', narrator_label: 'Ông Tư', fields: {} });

function renderDialog() {
  return render(
    <LocaleProvider initial="vi">
      <ToastProvider>
        <MemoryRouter>
          <ConnectDialog item={item} open onClose={() => {}} />
        </MemoryRouter>
      </ToastProvider>
    </LocaleProvider>,
  );
}

function fill(contact = 'an@example.com') {
  fireEvent.change(screen.getByLabelText(/Tên của bạn/), { target: { value: 'An' } });
  fireEvent.change(screen.getByLabelText(/Email hoặc số điện thoại/), { target: { value: contact } });
  fireEvent.change(screen.getByLabelText(/Điều bạn muốn trao đổi/), { target: { value: 'Xin hỏi thêm' } });
  fireEvent.click(screen.getByLabelText(/Tôi đồng ý/));
}

describe('ConnectDialog ("Đề nghị trao đổi")', () => {
  beforeEach(() => {
    inserts.length = 0;
    track.mockClear();
    insertError = null;
  });

  it('names the item the request is about', () => {
    renderDialog();
    expect(screen.getByText('“Tuốt lá mai”')).toBeInTheDocument();
  });

  it('blocks an implausible contact and sends nothing', async () => {
    renderDialog();
    fill('abc');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đề nghị' }));
    expect(await screen.findByText('Vui lòng nhập email hoặc số điện thoại hợp lệ.')).toBeInTheDocument();
    expect(inserts).toHaveLength(0);
  });

  it('never reports success when the request was not saved', async () => {
    insertError = { message: 'new row violates row-level security policy' };
    renderDialog();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đề nghị' }));
    expect(await screen.findByText('Chưa gửi được đề nghị. Vui lòng thử lại.')).toBeInTheDocument();
    expect(screen.queryByText(/Đã tiếp nhận đề nghị/)).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it('confirms receipt only after the insert succeeds, with the chosen format in the message', async () => {
    renderDialog();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đề nghị' }));
    await waitFor(() => expect(screen.getAllByText(/Đã tiếp nhận đề nghị/).length).toBeGreaterThan(0));
    expect(track.mock.calls).toEqual([['connect_sent']]);
    expect(inserts).toEqual([
      { public_item_id: item.id, name: 'An', contact: 'an@example.com', message: '[Hỏi thêm về kinh nghiệm này] Xin hỏi thêm' },
    ]);
  });
});
