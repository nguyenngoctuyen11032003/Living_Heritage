import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';

type Res = { data: unknown[]; error: null; count: number };
const pending: Array<{ filter: string | null; resolve: (r: Res) => void }> = [];

const fakeSb = {
  from: (table: string) => {
    if (table === 'profiles') {
      const p = { select: () => p, in: () => Promise.resolve({ data: [], error: null }) };
      return p;
    }
    let filter: string | null = null;
    const chain = {
      select: () => chain,
      eq: (col: string, v: string) => {
        if (col === 'action') filter = v;
        return chain;
      },
      order: () => chain,
      range: () => new Promise<Res>((resolve) => pending.push({ filter, resolve })),
    };
    return chain;
  },
};
vi.mock('@/lib/supabase', () => ({ getSupabase: () => fakeSb }));

const { AuditSection } = await import('./AuditSection');

const row = (id: string, action: string, actor: string | null = null, actor_role: string | null = null) => ({ id, actor, actor_role, action, target_type: null, target_id: null, details: {}, at: '2026-10-20T08:00:00Z' });

describe('<AuditSection>', () => {
  it('a slow older page never overwrites the newer filtered result', async () => {
    render(
      <LocaleProvider initial="vi">
        <AuditSection family={{ id: 'f1', name: 'Nhà họ Lê', role: 'owner' } as never} storyTitles={new Map()} narratorNames={new Map()} />
      </LocaleProvider>,
    );
    await waitFor(() => expect(pending).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('Lọc theo thao tác'), { target: { value: 'approve_story' } });
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[1]!.resolve({ data: [row('new', 'approve_story')], error: null, count: 1 });
    await waitFor(() => expect(within(screen.getByRole('table')).getByText('Người kể xác nhận câu chuyện')).toBeTruthy());
    // The first (unfiltered) request answers last.
    pending[0]!.resolve({ data: [row('old', 'create_family')], error: null, count: 1 });
    await new Promise((r) => setTimeout(r, 20));
    expect(within(screen.getByRole('table')).queryByText('Tạo kho gia đình')).toBeNull();
    expect(within(screen.getByRole('table')).getByText('Người kể xác nhận câu chuyện')).toBeTruthy();
  });

  it('shows the role the actor had, translated, next to the actor', async () => {
    pending.length = 0;
    render(
      <LocaleProvider initial="vi">
        <AuditSection family={{ id: 'f1', name: 'Nhà họ Lê', role: 'owner' } as never} storyTitles={new Map()} narratorNames={new Map()} />
      </LocaleProvider>,
    );
    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0]!.resolve({ data: [row('a', 'approve_story', 'u1', 'narrator'), row('b', 'create_family', null, 'service'), row('c', 'create_invite', 'u2', 'none')], error: null, count: 3 });
    const table = await screen.findByRole('table');
    await waitFor(() => expect(within(table).getByText('· Người kể', { exact: false })).toBeTruthy());
    // System rows are not labelled twice; 'none' gets no label.
    expect(within(table).queryByText(/· Hệ thống/)).toBeNull();
    expect(within(table).getAllByText(/^· /)).toHaveLength(1);
  });
});
