import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import type { NarratorInfo, Question, SessionRow } from './data';
import { SessionFlow } from './SessionFlow';

vi.mock('@/lib/supabase', () => ({ getSupabase: () => null, requireSupabase: () => null }));

const session: SessionRow = { id: 's1', family_id: 'f1', narrator_id: 'n1', topic_id: 't1', ended_at: null };
const narrator: NarratorInfo = { id: 'n1', family_id: 'f1', display_name: 'Lan', pen_name: null, user_id: 'u1', family_name: 'Nguyễn' };
const questions: Question[] = [
  { id: 'q1', topic_id: 't1', prompt_vi: 'Câu hỏi một?', prompt_en: 'Question one?', kind_hint: 'story', sort: 1 },
  { id: 'q2', topic_id: 't1', prompt_vi: 'Câu hỏi hai?', prompt_en: 'Question two?', kind_hint: 'story', sort: 2 },
];

function renderFlow(assisted = false) {
  const router = createMemoryRouter(
    [{ path: '/ke-chuyen/phien/:id', element: <SessionFlow session={session} narrator={narrator} assisted={assisted} topic={null} questions={questions} answered={[]} /> }],
    { initialEntries: ['/ke-chuyen/phien/s1'] },
  );
  return render(
    <LocaleProvider initial="vi">
      <RouterProvider router={router} />
    </LocaleProvider>,
  );
}

describe('SessionFlow', () => {
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
  });

  it('shows the assisted-recording banner for a family editor', () => {
    renderFlow(true);
    expect(screen.getByRole('note')).toHaveTextContent('Đang ghi giúp ông/bà Lan');
  });
});
