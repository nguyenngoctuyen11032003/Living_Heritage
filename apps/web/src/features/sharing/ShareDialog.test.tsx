import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';

type Row = Record<string, unknown>;
const db: { story: Row; settings: Row | null; requests: Row[]; canWrite: boolean; isNarrator: boolean } = {
  story: {},
  settings: null,
  requests: [],
  canWrite: true,
  isNarrator: false,
};

/** Minimal chainable fake of the supabase query builder used by sharing/data.ts. */
function query(table: string) {
  const result = () => {
    if (table === 'stories') return { data: db.story, error: null };
    if (table === 'story_share_settings') return { data: db.settings, error: null };
    return { data: db.requests, error: null };
  };
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve(result()),
    maybeSingle: () => Promise.resolve(result()),
  };
  return chain;
}

const fakeSb = {
  from: (table: string) => query(table),
  rpc: (fn: string) => {
    if (fn === 'can_write_story') return Promise.resolve({ data: db.canWrite, error: null });
    if (fn === 'is_narrator_user') return Promise.resolve({ data: db.isNarrator, error: null });
    if (fn === 'preview_public_item')
      return Promise.resolve({ data: { kind: 'story', title: 'Rau muống ao nhà', body: 'Nội dung', fields: {}, narrator_label: 'Người kể ẩn danh', region: 'bac', decade: null, audio_allowed: false }, error: null });
    return Promise.resolve({ data: null, error: null });
  },
};

vi.mock('@/lib/supabase', () => ({ getSupabase: () => fakeSb, requireSupabase: () => fakeSb }));
vi.mock('@/features/families/current', () => ({
  useCurrentFamily: () => ({ families: [{ id: 'fam', name: 'Nhà', role: 'owner' }] }),
}));

// Plain dialog: avoids motion's WAAPI animations, which happy-dom cancels with unhandled rejections.
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

const { ShareDialog } = await import('./ShareDialog');

function renderDialog() {
  return render(
    <LocaleProvider initial="vi">
      <ShareDialog storyId="s1" open onClose={() => {}} />
    </LocaleProvider>,
  );
}

describe('ShareDialog', () => {
  beforeEach(() => {
    db.settings = null;
    db.requests = [];
    db.canWrite = true;
    db.isNarrator = false;
  });

  it('disables "Đề nghị công bố" with a reason until the story is approved', async () => {
    db.story = { id: 's1', family_id: 'fam', narrator_id: 'n1', kind: 'story', edit_status: 'pending_review', visibility: 'private', recording_id: null };
    renderDialog();
    const publish = await screen.findByRole('radio', { name: /Đề nghị công bố/ });
    expect(publish).toBeDisabled();
    expect(screen.getByText('Cần người kể xác nhận nội dung trước khi đề nghị công bố.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Chỉ mình tôi/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Người được mời trong gia đình/ })).toBeEnabled();
  });

  it('shows toggles, the exact preview and the recall warning for an approved story', async () => {
    db.story = { id: 's1', family_id: 'fam', narrator_id: 'n1', kind: 'story', edit_status: 'approved', visibility: 'family', recording_id: null };
    renderDialog();
    const publish = await screen.findByRole('radio', { name: /Đề nghị công bố/ });
    expect(publish).toBeEnabled();
    fireEvent.click(publish);
    expect(await screen.findByText('Rau muống ao nhà')).toBeInTheDocument();
    expect(screen.getByText('Người kể ẩn danh')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Vùng miền/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Giọng kể/ })).not.toBeChecked();
    expect(screen.getByText(/có thể không thu hồi được/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi đề nghị công bố' })).toBeDisabled();
  });
});
