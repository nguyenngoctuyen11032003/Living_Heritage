import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { Badge } from './Badge';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ToastProvider, useToast, type ToastOptions } from './Toast';

const vi_ = ({ children }: { children: ReactNode }) => <LocaleProvider initial="vi">{children}</LocaleProvider>;

describe('Button', () => {
  it('blocks clicks and marks itself busy while loading (no double submit)', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Lưu</Button>, { wrapper: vi_ });
    const button = screen.getByRole('button', { name: 'Lưu' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} loading>
        Lưu
      </Button>,
    );
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('meets the 48px touch target and lets a caller hide it responsively', () => {
    render(<Button className="hidden sm:inline-flex">Mở</Button>, { wrapper: vi_ });
    const cls = screen.getByRole('button', { name: 'Mở' }).className.split(' ');
    expect(cls).toContain('min-h-12');
    expect(cls).toContain('hidden');
    expect(cls).not.toContain('inline-flex');
  });
});

describe('Badge', () => {
  it('drops its base inline-flex when the caller picks a display', () => {
    render(<Badge className="hidden md:inline-flex">Riêng tư</Badge>);
    const cls = screen.getByText('Riêng tư').parentElement!.className.split(' ');
    expect(cls).toContain('hidden');
    expect(cls).not.toContain('inline-flex');
  });
});

describe('Badge wrapping', () => {
  it('shows status labels in full by default and truncates only on request', () => {
    const { rerender } = render(<Badge>Mô phỏng · không có âm thanh gốc</Badge>);
    const label = screen.getByText('Mô phỏng · không có âm thanh gốc');
    expect(label.className).not.toContain('truncate');
    expect(label.className).toContain('break-words');
    rerender(<Badge truncate>Mô phỏng · không có âm thanh gốc</Badge>);
    expect(screen.getByText('Mô phỏng · không có âm thanh gốc').className).toContain('truncate');
  });
});

describe('EmptyState', () => {
  it('defaults to h3 and can be the page h1', () => {
    const { rerender } = render(<EmptyState title="Trống" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Trống' })).toBeInTheDocument();
    rerender(<EmptyState title="Không tìm thấy" headingLevel={1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Không tìm thấy' })).toBeInTheDocument();
  });
});

describe('Toast', () => {
  function Trigger({ opts }: { opts: ToastOptions }) {
    const { toast } = useToast();
    return (
      <button type="button" onClick={() => toast(opts)}>
        go
      </button>
    );
  }

  function renderWith(opts: ToastOptions) {
    return render(
      <LocaleProvider initial="vi">
        <ToastProvider>
          <Trigger opts={opts} />
        </ToastProvider>
      </LocaleProvider>,
    );
  }

  it('keeps errors until the user closes them, as an assertive alert', async () => {
    vi.useFakeTimers();
    try {
      renderWith({ title: 'Lưu thất bại', tone: 'error' });
      fireEvent.click(screen.getByRole('button', { name: 'go' }));
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.getByRole('alert')).toHaveTextContent('Lưu thất bại');
    } finally {
      vi.useRealTimers();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    await waitFor(() => expect(screen.queryByText('Lưu thất bại')).not.toBeInTheDocument());
  });

  it('auto-dismisses success messages, which are written in text', async () => {
    renderWith({ title: 'Đã lưu bản nháp', tone: 'success', duration: 30 });
    fireEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu bản nháp');
    await waitFor(() => expect(screen.queryByText('Đã lưu bản nháp')).not.toBeInTheDocument());
  });
});
