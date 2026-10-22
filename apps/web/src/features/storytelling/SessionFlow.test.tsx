import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import type { NarratorInfo, Question, SessionRow } from './data';
import { HOWTO_KEY } from './prefs';
import { SessionFlow } from './SessionFlow';

vi.mock('@/lib/supabase', () => ({ getSupabase: () => null, requireSupabase: () => null }));

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
  });

  it('shows the question big and rotates with "Đổi câu hỏi khác"', async () => {
    renderFlow();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Câu hỏi một?');
    await userEvent.click(screen.getByRole('button', { name: 'Đổi câu hỏi khác' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Câu hỏi hai?');
  });

  it('"Bỏ qua câu này" moves on, and falls back to the open prompt once every question is skipped', async () => {
    renderFlow();
    const skip = () => userEvent.click(screen.getByRole('button', { name: 'Bỏ qua câu này' }));
    await skip();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Câu hỏi hai?');
    await skip();
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(/Câu hỏi (một|hai)/);
    expect(screen.getByRole('button', { name: 'Kết thúc buổi kể' })).toBeInTheDocument();
  });

  it('explains an unsupported browser in words and offers a file upload', () => {
    renderFlow(); // happy-dom has no MediaRecorder
    expect(screen.getByText('Trình duyệt này chưa ghi âm được')).toBeInTheDocument();
    expect(screen.getByLabelText('Chọn tệp ghi âm có sẵn')).toHaveAttribute('accept', 'audio/*');
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
});
