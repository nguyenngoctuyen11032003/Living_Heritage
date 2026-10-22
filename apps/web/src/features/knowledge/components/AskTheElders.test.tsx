import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { AskError, type AskResult } from '../ask';
import { AskTheElders } from './AskTheElders';

vi.mock('@/design/motion', () => ({ useReducedMotionSafe: () => true }));

const SOURCES: AskResult['sources'] = [
  { id: '11111111-1111-4111-8111-111111111111', title: 'Tuốt lá mai trước Tết', kind: 'experience', narrator_label: 'Ông Tư', topic_slug: 'lam-vuon', similarity: 0.8 },
  { id: '22222222-2222-4222-8222-222222222222', title: 'Vườn mai của ba', kind: 'story', narrator_label: 'Bà Năm', topic_slug: 'lam-vuon', similarity: 0.6 },
];

function renderAsk(ask: ReturnType<typeof vi.fn>, props: Partial<Parameters<typeof AskTheElders>[0]> = {}) {
  return render(
    <LocaleProvider initial="vi">
      <MemoryRouter>
        <AskTheElders hubMode="live" ask={ask as never} {...props} />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe('AskTheElders', () => {
  it('answers an example question with numbered citation links and the disclaimer', async () => {
    const ask = vi.fn(async (): Promise<AskResult> => ({ answer: 'Theo ông Tư, tuốt lá vào rằm tháng Chạp [1].', cited: [1], sources: SOURCES, reason: null }));
    renderAsk(ask);
    expect(screen.getByRole('heading', { name: 'Hỏi điều người đi trước đã kể' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ông bà xưa chăm cây mai thế nào?' }));
    expect(ask).toHaveBeenCalledWith('Ông bà xưa chăm cây mai thế nào?', 'vi', expect.anything());
    const chip = await screen.findByRole('link', { name: 'Mở nguồn 1: Tuốt lá mai trước Tết' });
    expect(chip).toHaveAttribute('href', `/tri-thuc/${SOURCES[0]!.id}`);
    expect(screen.getByText(/không thay thế hướng dẫn chuyên môn/)).toBeInTheDocument();
    expect(screen.getByText('Nguồn lời kể')).toBeInTheDocument();
    expect(screen.getByText('Lời kể có liên quan')).toBeInTheDocument();
  });

  it('no sources: says so and offers search / browse instead of an answer', async () => {
    const onSearch = vi.fn();
    const ask = vi.fn(async (): Promise<AskResult> => ({ answer: null, cited: [], sources: [], reason: 'no_sources' }));
    renderAsk(ask, { onSearch });
    await userEvent.type(screen.getByLabelText('Câu hỏi của bạn'), 'Kho cá sao cho đậm vị?');
    await userEvent.click(screen.getByRole('button', { name: 'Hỏi' }));
    expect(await screen.findByText('Chưa có lời kể nào nói về điều này')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Tìm “Kho cá sao cho đậm vị\?” trong kho/ }));
    expect(onSearch).toHaveBeenCalledWith('Kho cá sao cho đậm vị?');
  });

  it('shows the rate-limit message and validates short questions without calling the function', async () => {
    const ask = vi.fn(async () => {
      throw new AskError('rate_limited', 30);
    });
    renderAsk(ask);
    const input = screen.getByLabelText('Câu hỏi của bạn');
    await userEvent.type(input, 'ab{Enter}');
    expect(ask).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Câu hỏi cần từ 3 đến 300 ký tự.');
    await userEvent.type(input, 'c mai{Enter}');
    await waitFor(() => expect(screen.getByText('Bạn hỏi hơi nhanh. Vui lòng đợi khoảng 30 giây rồi hỏi tiếp.')).toBeInTheDocument());
  });

  it('is disabled with an explanation while the hub only has illustrative samples', () => {
    const ask = vi.fn();
    renderAsk(ask, { hubMode: 'sample' });
    expect(screen.getByText('Sẽ mở khi kho có lời kể thật')).toBeInTheDocument();
    expect(screen.getByLabelText('Câu hỏi của bạn')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hỏi' })).toBeDisabled();
  });
});
