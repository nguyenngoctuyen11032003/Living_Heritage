import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { ProcessingPanel } from './ProcessingPanel';
import { transcriptDirty } from './transcript';

describe('ProcessingPanel', () => {
  it('a done job whose drafts were deleted shows a way out instead of spinning', () => {
    render(
      <MemoryRouter>
        <LocaleProvider initial="vi">
          <ProcessingPanel status="done" errorCode={null} retrying={false} onRetry={vi.fn()} orphaned={{ backHref: '/gia-dinh', backLabel: 'Về kho gia đình' }} />
        </LocaleProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bản nháp từ bản ghi này không còn nữa');
    expect(screen.getByRole('link', { name: 'Về kho gia đình' })).toHaveAttribute('href', '/gia-dinh');
    expect(screen.queryByText(/đang mở bản nháp/)).toBeNull();
  });

  it('labels steps without percentages', () => {
    render(
      <MemoryRouter>
        <LocaleProvider initial="vi">
          <ProcessingPanel status="transcribing" errorCode={null} retrying={false} onRetry={vi.fn()} />
        </LocaleProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Bước 2 trên 3: Đang chép lời từ bản ghi âm');
    expect(document.body).not.toHaveTextContent('%');
  });
});

describe('transcriptDirty', () => {
  const current = { id: 't', version: 1, text: 'a', created_at: '' };
  it('counts a typed, unsaved correction as unsaved', () => {
    expect(transcriptDirty({ current, draft: null })).toBe(false);
    expect(transcriptDirty({ current, draft: 'a' })).toBe(false);
    expect(transcriptDirty({ current, draft: 'ab' })).toBe(true);
  });
});
