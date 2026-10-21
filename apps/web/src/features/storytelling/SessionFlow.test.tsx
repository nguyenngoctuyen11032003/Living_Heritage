import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import type { NarratorInfo, Question, SessionRow } from './data';
import { createMemoryPendingStore, type PendingStore, type PendingUpload } from './pendingStore';
import { CONSENT_KEY, HOWTO_KEY } from './prefs';
import { SessionFlow } from './SessionFlow';

vi.mock('@/lib/supabase', () => ({ getSupabase: () => null, requireSupabase: () => null }));

let testStore: PendingStore = createMemoryPendingStore();
vi.mock('./pendingStore', async (orig) => ({ ...(await orig<typeof import('./pendingStore')>()), getPendingStore: () => testStore }));

/** happy-dom never loads media: report "unknown duration" straight away. */
class FakeAudio {
  preload = '';
  duration = NaN;
  onloadedmetadata: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    setTimeout(() => this.onerror?.(), 0);
  }
}

async function pickFile() {
  const input = screen.getByLabelText('Chọn tệp ghi âm có sẵn');
  await userEvent.upload(input, new File(['abc'], 'memo.m4a', { type: 'audio/x-m4a' }));
  return screen.findByRole('button', { name: 'Giữ bản ghi' });
}

const session: SessionRow = { id: 's1', family_id: 'f1', narrator_id: 'n1', topic_id: 't1', ended_at: null };
const narrator: NarratorInfo = { id: 'n1', family_id: 'f1', display_name: 'Lan', pen_name: null, user_id: 'u1', family_name: 'Nguyễn', lang: 'vi' };
const questions: Question[] = [
  { id: 'q1', topic_id: 't1', prompt_vi: 'Câu hỏi một?', prompt_en: 'Question one?', kind_hint: 'story', sort: 1 },
  { id: 'q2', topic_id: 't1', prompt_vi: 'Câu hỏi hai?', prompt_en: 'Question two?', kind_hint: 'story', sort: 2 },
];

function renderFlow({ assisted = false, who = narrator, locale = 'vi' as 'vi' | 'en', keptBefore = 0 } = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/ke-chuyen/phien/:id',
        element: <SessionFlow session={session} narrator={who} assisted={assisted} topic={null} questions={questions} answered={[]} keptBefore={keptBefore} />,
      },
    ],
    { initialEntries: ['/ke-chuyen/phien/s1'] },
  );
  return render(
    <LocaleProvider initial={locale}>
      <RouterProvider router={router} />
    </LocaleProvider>,
  );
}

describe('SessionFlow', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(HOWTO_KEY, '1');
    localStorage.setItem(CONSENT_KEY, '1');
    testStore = createMemoryPendingStore();
    vi.stubGlobal('Audio', FakeAudio);
  });

  it('shows the question big and rotates with "Đổi câu hỏi khác"', async () => {
    renderFlow();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Câu hỏi một?');
    await userEvent.click(screen.getByRole('button', { name: 'Đổi câu hỏi khác' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Câu hỏi hai?');
  });

  it('explains an unsupported browser in words and offers a file upload', () => {
    renderFlow(); // happy-dom has no MediaRecorder
    expect(screen.getByText('Trình duyệt này chưa ghi âm được')).toBeInTheDocument();
    expect(screen.getByLabelText('Chọn tệp ghi âm có sẵn')).toHaveAttribute('accept', 'audio/*');
    expect(screen.getByRole('link', { name: 'Nghe lời kể mẫu trong bản trải nghiệm' })).toHaveAttribute('href', '/trai-nghiem');
  });

  it('shows the assisted-recording banner for a family editor', () => {
    renderFlow({ assisted: true });
    expect(screen.getByRole('note')).toHaveTextContent('Đang ghi giúp ông/bà Lan');
  });

  it('asks the question in the narrator language, not the UI language', () => {
    renderFlow({ locale: 'en', who: { ...narrator, lang: 'vi' } });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Câu hỏi một?');
    expect(screen.getByRole('button', { name: 'Try a different question' })).toBeInTheDocument();
  });

  it('shows the "Cách kể chuyện" guide the first time only', async () => {
    localStorage.removeItem(HOWTO_KEY);
    const first = renderFlow();
    expect(screen.getByRole('dialog', { name: 'Cách kể chuyện' })).toBeInTheDocument();
    expect(screen.getByText('Bấm ghi và kể')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đã hiểu, bắt đầu kể' }));
    expect(localStorage.getItem(HOWTO_KEY)).toBe('1');
    first.unmount();
    renderFlow();
    expect(screen.queryByRole('dialog', { name: 'Cách kể chuyện' })).not.toBeInTheDocument();
  });

  it('remembers "Tự đọc câu hỏi" (off by default)', async () => {
    renderFlow();
    const box = screen.getByRole('checkbox', { name: 'Tự đọc câu hỏi' });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(localStorage.getItem('lh.narrator.autoRead')).toBe('1');
  });

  it('"Kết thúc buổi kể" shows how many recordings were kept', async () => {
    renderFlow({ keptBefore: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Kết thúc buổi kể' }));
    const dialog = screen.getByRole('dialog', { name: 'Kết thúc buổi kể?' });
    expect(dialog).toHaveTextContent('Hôm nay ông/bà Lan đã giữ 2 bản ghi.');
    await userEvent.click(screen.getByRole('button', { name: 'Kể tiếp' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Kết thúc buổi kể?' })).not.toBeInTheDocument());
  });

  it('"Bỏ qua câu này" is there even with a single question and then falls back to free telling', async () => {
    const router = createMemoryRouter(
      [{ path: '/p', element: <SessionFlow session={session} narrator={narrator} assisted={false} topic={null} questions={[questions[0]!]} answered={[]} /> }],
      { initialEntries: ['/p'] },
    );
    render(
      <LocaleProvider initial="vi">
        <RouterProvider router={router} />
      </LocaleProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua câu này' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ông/bà muốn kể điều gì cũng được');
  });

  it('a double tap on "Giữ bản ghi" saves one copy only', async () => {
    // IndexedDB is slow: the first save is still in flight when the second tap lands.
    let release = () => {};
    const put = vi.fn(() => new Promise<void>((r) => (release = r)));
    testStore = { ...createMemoryPendingStore(), put };
    renderFlow();
    const keep = await pickFile();
    await userEvent.dblClick(keep);
    await userEvent.click(keep);
    expect(put).toHaveBeenCalledTimes(1);
    release();
  });

  it('explains what happens to the recording before the first one is kept', async () => {
    localStorage.removeItem(CONSENT_KEY);
    const put = vi.fn(async () => {});
    testStore = { ...createMemoryPendingStore(), put };
    renderFlow();
    await userEvent.click(await pickFile());
    const dialog = screen.getByRole('dialog', { name: 'Trước khi ghi âm' });
    expect(dialog).toHaveTextContent('Không có gì được công khai');
    await userEvent.click(screen.getByRole('button', { name: 'Để sau' }));
    expect(put).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Giữ bản ghi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tôi đồng ý, bắt đầu' }));
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(CONSENT_KEY)).toBe('1');
  });

  it('brings back a take for another seeded question and puts it in ?q= too', async () => {
    await testStore.put({
      key: 's1/q2',
      attemptId: 'a2',
      blob: new Blob(['x']),
      mime: 'audio/webm',
      duration: 3,
      familyId: 'f1',
      narratorId: 'n1',
      sessionId: 's1',
      questionId: 'q2',
      createdAt: 1,
      uploaded: false,
      recordingId: null,
    });
    const router = createMemoryRouter(
      [{ path: '/ke-chuyen/phien/:id', element: <SessionFlow session={session} narrator={narrator} assisted={false} topic={null} questions={questions} answered={[]} /> }],
      { initialEntries: ['/ke-chuyen/phien/s1'] },
    );
    render(
      <LocaleProvider initial="vi">
        <RouterProvider router={router} />
      </LocaleProvider>,
    );
    expect(await screen.findByText('Còn một bản ghi chưa tải lên')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Câu hỏi hai?');
    expect(router.state.location.search).toBe('?q=q2');
  });

  it('labels free telling only for a session without a topic', () => {
    renderFlow(); // topic_id t1, but the topic row is not readable
    expect(screen.queryByText('Kể tự do')).not.toBeInTheDocument();
  });

  it('brings back a take for an AI follow-up question that failed to upload before a reload', async () => {
    const stranded: PendingUpload = {
      key: 's1/ai-abc',
      attemptId: 'a1',
      blob: new Blob(['x']),
      mime: 'audio/webm',
      duration: 3,
      familyId: 'f1',
      narratorId: 'n1',
      sessionId: 's1',
      questionId: null,
      questionText: 'Ai thường nấu cùng bà?',
      createdAt: 1,
      uploaded: false,
      recordingId: null,
    };
    await testStore.put(stranded);
    renderFlow();
    expect(await screen.findByText('Còn một bản ghi chưa tải lên')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ai thường nấu cùng bà?');
    expect(screen.getByRole('button', { name: 'Thử tải lại' })).toBeInTheDocument();
  });
});
