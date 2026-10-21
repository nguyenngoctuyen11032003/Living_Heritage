import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { BookPrint } from './BookPrint';

const family = { families: [] as Array<{ id: string; name: string; role: string }>, loading: false };

vi.mock('@/lib/session', () => ({ RequireAuth: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }));
vi.mock('@/features/families/current', () => ({ useCurrentFamily: () => family }));
vi.mock('@/features/vault/useLookups', () => ({ useVaultLookups: () => ({ narratorById: new Map() }) }));
vi.mock('./useBook', async (orig) => ({
  ...(await orig<typeof import('./useBook')>()),
  useBook: () => ({
    state: {
      kind: 'ready',
      book: { id: 'b1', family_id: 'f1', title: 'Sách bí mật', subtitle: null, cover_style: 'giay-do', created_at: '', updated_at: '' },
      chapters: [
        {
          story_id: 's1',
          position: 0,
          durationS: null,
          story: { id: 's1', title: 'Chương một', body: 'Ngày ấy.', summary: null, kind: 'story', fields: {}, edit_status: 'approved', narrator_id: 'n1', recording_id: null },
        },
      ],
    },
    reload: () => {},
  }),
}));

const renderPrint = () =>
  render(
    <LocaleProvider initial="vi">
      <MemoryRouter>
        <BookPrint bookId="b1" />
      </MemoryRouter>
    </LocaleProvider>,
  );

describe('BookPrint permissions (B11)', () => {
  beforeEach(() => {
    family.loading = false;
  });

  it('shows viewers a no-permission notice without the book title', () => {
    family.families = [{ id: 'f1', name: 'Nhà', role: 'viewer' }];
    renderPrint();
    expect(screen.getByRole('heading', { level: 1, name: 'Chỉ người biên tập mới in được sách' })).toBeInTheDocument();
    expect(screen.queryByText('Sách bí mật')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /In \/ Lưu PDF/ })).not.toBeInTheDocument();
  });

  it('lets editors print', () => {
    family.families = [{ id: 'f1', name: 'Nhà', role: 'editor' }];
    renderPrint();
    expect(screen.getByRole('heading', { level: 1, name: 'Sách bí mật' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In \/ Lưu PDF/ })).toBeEnabled();
  });

  it('waits for the family list before deciding', () => {
    family.families = [];
    family.loading = true;
    renderPrint();
    expect(screen.queryByText('Chỉ người biên tập mới in được sách')).not.toBeInTheDocument();
    expect(screen.queryByText('Sách bí mật')).not.toBeInTheDocument();
  });
});
