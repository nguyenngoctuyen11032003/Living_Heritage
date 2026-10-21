import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import type { CurrentFamilyState } from './current';

const FAMILY = { id: 'fam-1', name: 'Nhà họ Nguyễn', role: 'owner' as const };
const fam: CurrentFamilyState = {
  families: [FAMILY],
  current: FAMILY,
  loading: false,
  error: null,
  select: vi.fn(),
  reload: vi.fn(async () => {}),
  canEdit: true,
  canManage: true,
};

const rows: Record<string, unknown[]> = {
  family_members: [
    { user_id: 'u-owner', role: 'owner', relation: null, created_at: '2026-10-01T00:00:00Z' },
    { user_id: 'u-lan', role: 'viewer', relation: 'Cháu', created_at: '2026-10-02T00:00:00Z' },
  ],
  profiles: [
    { id: 'u-owner', display_name: 'Minh Anh' },
    { id: 'u-lan', display_name: 'Lan' },
  ],
  family_invites: [],
};
const updates: unknown[] = [];

/** Minimal chainable PostgREST stand-in: every builder resolves to the table's rows. */
function builder(table: string) {
  const result = { data: rows[table] ?? [], error: null };
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'in', 'delete']) b[m] = () => b;
  b.update = (v: unknown) => {
    updates.push(v);
    return b;
  };
  b.then = (ok: (v: typeof result) => unknown) => Promise.resolve(result).then(ok);
  return b;
}

vi.mock('./current', () => ({ useCurrentFamily: () => fam }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ from: builder }) }));

const { default: MembersPage } = await import('./MembersPage');

function renderPage(path: string) {
  return render(
    <LocaleProvider initial="vi">
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/gia-dinh/thanh-vien" element={<MembersPage />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe('<MembersPage> ?invite=1', () => {
  it('focuses the invite email once and does not steal focus on later reloads', async () => {
    renderPage('/gia-dinh/thanh-vien?invite=1');
    const email = await screen.findByRole('textbox', { name: /Email/ });
    await waitFor(() => expect(document.activeElement).toBe(email));

    const role = screen.getByRole('combobox', { name: /Lan/ });
    role.focus();
    fireEvent.change(role, { target: { value: 'editor' } });
    await waitFor(() => expect(updates).toContainEqual({ role: 'editor' }));
    // The reload after the role change re-renders the member list; focus must stay on the select.
    await new Promise((r) => setTimeout(r, 20));
    expect(document.activeElement).toBe(role);
  });
});
