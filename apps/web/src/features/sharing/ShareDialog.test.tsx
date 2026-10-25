import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';

type Row = Record<string, unknown>;
const LONG_BODY = Array.from({ length: 30 }, (_, i) => `Dòng ${i + 1} của câu chuyện.`).join('\n');

const STORY_PREVIEW: Row = { kind: 'story', title: 'Rau muống ao nhà', body: LONG_BODY, fields: {}, topic_slug: 'mon-an', narrator_label: 'Người kể ẩn danh', region: 'bac', decade: null, audio_allowed: false };

const db: { story: Row; settings: Row | null; requests: Row[]; canWrite: boolean; isNarrator: boolean; preview: Row; updateError: string | null } = {
  preview: STORY_PREVIEW,
  story: {},
  settings: null,
  requests: [],
  canWrite: true,
  isNarrator: false,
  updateError: null,
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
    update: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve(result()),
    maybeSingle: () => Promise.resolve(result()),
    // useTopics (preview topic line) awaits the builder itself; an empty list keeps the static topics.
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: db.updateError ? { message: db.updateError, code: '42501' } : null }).then(resolve),
  };
  return chain;
}

const fakeSb = {
  from: (table: string) => query(table),
  rpc: (fn: string) => {
    if (fn === 'can_write_story') return Promise.resolve({ data: db.canWrite, error: null });
    if (fn === 'is_narrator_user') return Promise.resolve({ data: db.isNarrator, error: null });
    if (fn === 'preview_public_item')
      return Promise.resolve({ data: db.preview, error: null });
    return Promise.resolve({ data: null, error: null });
  },
};

const track = vi.fn();
vi.mock('@/lib/events', () => ({ track: (code: string) => track(code) }));
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
    db.preview = STORY_PREVIEW;
    db.updateError = null;
    track.mockClear();
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
    // Exact preview: the whole text (not a clipped excerpt), the topic and an honest line about photos.
    expect(screen.getByRole('region', { name: 'Toàn văn sẽ công bố' })).toHaveTextContent('Dòng 30 của câu chuyện.');
    expect(screen.getByText('Món ăn')).toBeInTheDocument();
    expect(screen.getByText('Không đăng lên trang công khai')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Vùng miền/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Giọng kể/ })).not.toBeChecked();
    expect(screen.getByText(/có thể không thu hồi được/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi đề nghị công bố' })).toBeDisabled();
  });

  it('tracks share_request only after the server accepted a scope change', async () => {
    db.story = { id: 's1', family_id: 'fam', narrator_id: 'n1', kind: 'story', edit_status: 'approved', visibility: 'private', recording_id: null };
    renderDialog();
    fireEvent.click(await screen.findByRole('radio', { name: /Người được mời trong gia đình/ }));
    db.updateError = 'permission denied';
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phạm vi' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu phạm vi' })).toBeEnabled());
    expect(track).not.toHaveBeenCalled();

    db.updateError = null;
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phạm vi' }));
    await waitFor(() => expect(track).toHaveBeenCalledWith('share_request'));
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('does not track share_request when a story goes back to private (un-sharing)', async () => {
    db.story = { id: 's1', family_id: 'fam', narrator_id: 'n1', kind: 'story', edit_status: 'approved', visibility: 'family', recording_id: null };
    renderDialog();
    fireEvent.click(await screen.findByRole('radio', { name: /Chỉ mình tôi/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phạm vi' }));
    await screen.findByText('Đã cập nhật phạm vi chia sẻ.');
    expect(track).not.toHaveBeenCalled();
  });

  it('tracks share_request after a publish request is sent', async () => {
    db.story = { id: 's1', family_id: 'fam', narrator_id: 'n1', kind: 'story', edit_status: 'approved', visibility: 'family', recording_id: null };
    renderDialog();
    fireEvent.click(await screen.findByRole('radio', { name: /Đề nghị công bố/ }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Tôi đã đọc bản xem trước/ }));
    expect(track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đề nghị công bố' }));
    await waitFor(() => expect(track).toHaveBeenCalledWith('share_request'));
  });

  it('locks the photos switch off with the reason, even when an old setting turned it on', async () => {
    db.story = { id: 's1', family_id: 'fam', narrator_id: 'n1', kind: 'story', edit_status: 'approved', visibility: 'family', recording_id: null };
    db.settings = { show_audio: false, show_real_name: false, show_region: true, show_photos: true };
    renderDialog();
    fireEvent.click(await screen.findByRole('radio', { name: /Đề nghị công bố/ }));
    const photos = await screen.findByRole('switch', { name: /Ảnh đi kèm/ });
    expect(photos).toBeDisabled();
    expect(photos).not.toBeChecked();
    expect(screen.getByText(/Trang công khai chưa hỗ trợ đăng ảnh/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Vùng miền/ })).toBeEnabled();
  });

  it('previews an experience card like the public page: missing parts read "Chưa có thông tin"', async () => {
    db.story = { id: 's1', family_id: 'fam', narrator_id: 'n1', kind: 'experience', edit_status: 'approved', visibility: 'family', recording_id: null };
    db.preview = { ...STORY_PREVIEW, kind: 'experience', title: 'Ủ phân chuồng', body: '', fields: { steps: ['Trộn rơm với vôi'] } };
    renderDialog();
    fireEvent.click(await screen.findByRole('radio', { name: /Đề nghị công bố/ }));
    const body = await screen.findByRole('region', { name: 'Toàn văn sẽ công bố' });
    expect(body).toHaveTextContent('Trộn rơm với vôi');
    expect(within(body).getAllByText('Chưa có thông tin').length).toBe(4);
  });
});
