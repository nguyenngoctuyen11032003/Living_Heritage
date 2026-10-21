import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui';
import { LocaleProvider } from '@/i18n';

const FAM = '7c1e0a9e-1111-4222-8333-444455556666';
const db: { photos: Array<Record<string, unknown>> } = { photos: [] };

const fakeSb = {
  from: () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      then: (resolve: (v: unknown) => void) => resolve({ data: db.photos, error: null }),
    };
    return chain;
  },
  storage: {
    from: () => ({
      createSignedUrls: async (paths: string[]) => ({ data: paths.map((p) => ({ path: p, signedUrl: `https://x.test/${p}`, error: null })), error: null }),
      upload: vi.fn(),
    }),
  },
};

vi.mock('@/lib/supabase', () => ({ getSupabase: () => fakeSb, requireSupabase: () => fakeSb }));
vi.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ open, title, children, footer }: { open: boolean; title: ReactNode; children?: ReactNode; footer?: ReactNode }) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
}));

const { StoryPhotos } = await import('./StoryPhotos');

const renderUi = (canEdit: boolean) =>
  render(
    <LocaleProvider initial="vi">
      <ToastProvider>
        <StoryPhotos storyId="s1" familyId={FAM} canEdit={canEdit} />
      </ToastProvider>
    </LocaleProvider>,
  );

describe('StoryPhotos', () => {
  beforeEach(() => {
    db.photos = [];
  });

  it('shows the empty state to viewers without upload controls', async () => {
    renderUi(false);
    expect(await screen.findByText('Câu chuyện này chưa có ảnh kỷ niệm.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chọn ảnh' })).not.toBeInTheDocument();
  });

  it('renders photos with captions, alt fallback, and opens the lightbox', async () => {
    db.photos = [
      { id: 'a', story_id: 's1', family_id: FAM, storage_path: `${FAM}/a.jpg`, caption: 'Tết 1975', position: 0, created_at: '', created_by: null },
      { id: 'b', story_id: 's1', family_id: FAM, storage_path: `${FAM}/b.jpg`, caption: null, position: 1, created_at: '', created_by: null },
    ];
    renderUi(false);
    expect(await screen.findByAltText('Tết 1975')).toHaveAttribute('src', `https://x.test/${FAM}/a.jpg`);
    expect(screen.getByAltText('Ảnh minh họa câu chuyện')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Phóng to ảnh 2' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Ảnh 2/2');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Ảnh 1/2'));
  });

  it('editors get picker + camera inputs and a per-file error for unsupported files', async () => {
    const { container } = renderUi(true);
    expect(await screen.findByRole('button', { name: 'Chọn ảnh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chụp ảnh' })).toBeInTheDocument();
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type=file]');
    expect(inputs[1]).toHaveAttribute('capture', 'environment');
    fireEvent.change(inputs[0]!, { target: { files: [new File(['x'], 'scan.gif', { type: 'image/gif' })] } });
    expect(await screen.findByText(/Định dạng chưa hỗ trợ/)).toBeInTheDocument();
    expect(screen.getByText('scan.gif')).toBeInTheDocument();
  });
});
