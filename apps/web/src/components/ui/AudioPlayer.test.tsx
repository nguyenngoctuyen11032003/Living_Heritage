import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import { AudioPlayer, type AudioPlayerHandle } from './AudioPlayer';

function renderPlayer(props: Partial<React.ComponentProps<typeof AudioPlayer>> = {}, locale: 'vi' | 'en' = 'vi') {
  return render(
    <LocaleProvider initial={locale}>
      <AudioPlayer duration={75} title="Mẫu" {...props} />
    </LocaleProvider>,
  );
}

describe('AudioPlayer', () => {
  it('formats the time as m:ss for the current position and total', () => {
    renderPlayer();
    expect(screen.getByText('0:00 / 1:15')).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: 'Vị trí phát' });
    expect(slider).toHaveAttribute('aria-valuetext', '0:00 trên 1:15');
  });

  it('toggles aria-pressed and the accessible label on play/pause', () => {
    renderPlayer({}, 'en');
    const button = screen.getByRole('button', { name: 'Play' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAccessibleName('Pause');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAccessibleName('Play');
  });

  it('seeks with ±10 s buttons and the slider, reporting onTime', () => {
    const onTime = vi.fn();
    renderPlayer({ onTime }, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Forward 10 seconds' }));
    expect(onTime).toHaveBeenLastCalledWith(10);
    expect(screen.getByText('0:10 / 1:15')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back 10 seconds' }));
    expect(onTime).toHaveBeenLastCalledWith(0);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '65' } });
    expect(screen.getByText('1:05 / 1:15')).toBeInTheDocument();
  });

  it('exposes an imperative handle and labels simulated playback honestly', () => {
    const ref = createRef<AudioPlayerHandle>();
    render(
      <LocaleProvider initial="vi">
        <AudioPlayer ref={ref} duration={30} />
      </LocaleProvider>,
    );
    act(() => ref.current?.seek(12));
    expect(screen.getByText('0:12 / 0:30')).toBeInTheDocument();
    act(() => ref.current?.play());
    expect(screen.getByRole('button', { name: 'Tạm dừng' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Phát mô phỏng/)).toBeInTheDocument();
  });

  it('shows a load failure in the compact layout too, and clears it when the source changes', () => {
    const view = render(
      <LocaleProvider initial="en">
        <AudioPlayer src="https://example.test/a.m4a" duration={30} compact />
      </LocaleProvider>,
    );
    const audio = view.container.querySelector('audio')!;
    fireEvent.error(audio);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    view.rerender(
      <LocaleProvider initial="en">
        <AudioPlayer src="https://example.test/b.m4a" duration={30} compact />
      </LocaleProvider>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('0:00 / 0:30')).toBeInTheDocument();
  });
});
