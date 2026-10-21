import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { TranscriptView } from './TranscriptView';

describe('TranscriptView', () => {
  it('labels uncertain words with text, not colour alone', () => {
    render(
      <LocaleProvider initial="vi">
        <TranscriptView text="Tui trồng rau ở ao sau nhà [?]. [?] Rồi đi chợ." />
      </LocaleProvider>,
    );
    const marks = document.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]).toHaveTextContent('nhàCần kiểm tra');
    expect(marks[1]).toHaveTextContent('đoạn nghe không rõCần kiểm tra');
    expect(screen.getByText(/2 chỗ cần kiểm tra/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('[?]');
  });
});
