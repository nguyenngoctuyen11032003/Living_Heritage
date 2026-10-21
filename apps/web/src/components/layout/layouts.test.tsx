import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';

vi.mock('@/lib/session', () => ({
  RequireAuth: ({ children }: { children: ReactNode }) => <>{children}</>,
  useSession: () => ({ user: { id: 'u1', email: 'a@b.vn' }, isAnonymous: false, loading: false }),
}));
vi.mock('@/lib/myProfile', () => ({ useMyProfile: () => null, avatarUrl: () => null }));
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ rpc: () => Promise.resolve({ data: true }), auth: { signOut: () => Promise.resolve({}) } }),
}));

import { AppShell, NarratorShell } from './layouts';
import { NarratorHelpSlot } from './NarratorHelpSlot';

function renderAt(path: string, routes: Parameters<typeof createMemoryRouter>[0]) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <LocaleProvider initial="vi">
      <RouterProvider router={router} />
    </LocaleProvider>,
  );
  return router;
}

const appRoutes = [
  {
    element: <AppShell />,
    children: ['gia-dinh', 'gia-dinh/thanh-vien', 'gia-dinh/album', 'cai-dat', 'quan-tri'].map((p) => ({ path: p, element: <p>page {p}</p> })),
  },
];

describe('AppShell mobile navigation', () => {
  it('reaches every section through the More sheet, including admin for admins', async () => {
    const router = renderAt('/gia-dinh', appRoutes);
    const more = screen.getByRole('button', { name: 'Thêm' });
    expect(more).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(more);
    const sheet = await screen.findByRole('dialog', { name: 'Tất cả mục' });
    for (const name of ['Thành viên', 'Album ảnh', 'Cây gia đình', 'Cài đặt', 'Đăng xuất']) {
      expect(within(sheet).getByText(name)).toBeInTheDocument();
    }
    await waitFor(() => expect(within(sheet).getByRole('link', { name: 'Quản trị' })).toBeInTheDocument());

    fireEvent.click(within(sheet).getByRole('link', { name: 'Thành viên' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/gia-dinh/thanh-vien');
    expect(screen.getByRole('button', { name: 'Thêm' }).className).toContain('font-semibold');
  });

  it('closes the sheet with Escape', async () => {
    renderAt('/gia-dinh', appRoutes);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('NarratorShell', () => {
  it('keeps the logo inside storytelling and renders the page help control in the header', () => {
    renderAt('/ke-chuyen', [
      {
        element: <NarratorShell />,
        children: [
          {
            path: 'ke-chuyen',
            element: (
              <NarratorHelpSlot>
                <button type="button">Trợ giúp</button>
              </NarratorHelpSlot>
            ),
          },
        ],
      },
    ]);
    expect(screen.getByRole('link', { name: 'Di Sản Sống' })).toHaveAttribute('href', '/ke-chuyen');
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Trợ giúp' })).toBeInTheDocument();
  });
});
