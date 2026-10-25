import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider, type Locale } from '@/i18n';
import MemoryBookPage from './MemoryBookPage';

const motionPref = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/design/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design/motion')>()),
  useReducedMotionSafe: () => motionPref.reduced,
}));

const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

beforeAll(() => {
  for (const proto of [Element.prototype, HTMLElement.prototype]) {
    if (Object.prototype.hasOwnProperty.call(proto, 'animate')) delete (proto as unknown as Record<string, unknown>).animate;
  }
});

beforeEach(() => {
  motionPref.reduced = false;
  play.mockClear();
  pause.mockClear();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.getElementById('font-instrument-serif')?.remove();
});

function wrap(locale: Locale = 'vi') {
  return render(
    <LocaleProvider initial={locale}>
      <MemoryRouter>
        <MemoryBookPage />
      </MemoryRouter>
    </LocaleProvider>,
  );
}

const heroVideo = () => screen.getByTestId('mb-hero-video') as HTMLVideoElement;

describe('/sach-ky-uc', () => {
  it('has exactly one h1 and the primary CTA goes to /ke-chuyen', () => {
    wrap();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Giữ lại giọng kể, in thành sách');
    const ctas = screen.getAllByRole('link', { name: 'Kể câu chuyện đầu tiên' });
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const a of ctas) expect(a).toHaveAttribute('href', '/ke-chuyen');
    expect(screen.getByRole('link', { name: /Xem kho tri thức/ })).toHaveAttribute('href', '/kham-pha');
    expect(screen.getByRole('link', { name: /Chính sách quyền riêng tư/ })).toHaveAttribute('href', '/quyen-rieng-tu');
  });

  it('keeps the sample label, planned specs, closing CTA and FAQ', () => {
    wrap();
    expect(screen.getByRole('heading', { level: 2, name: 'Một cuốn sách biết nói' })).toBeInTheDocument();
    expect(screen.getByText('Sách in là kế hoạch, chưa nhận đặt hàng. Bản PDF sẽ có trước.')).toBeInTheDocument();
    expect(screen.getByText('20 × 25 cm, bìa cứng')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Bắt đầu từ một câu chuyện' })).toBeInTheDocument();
    const faq = screen.getByRole('heading', { level: 2, name: 'Những điều gia đình hay hỏi' }).closest('section')!;
    expect(within(faq).getByRole('button', { name: /Ai được xem/ })).toHaveAttribute('aria-expanded', 'true');
    expect(within(faq).getByRole('button', { name: /Dự án đã thu tiền chưa/ })).toBeInTheDocument();
  });

  it('hero video is muted, inline, decorative and autoplays only without reduced motion', () => {
    wrap();
    const v = heroVideo();
    expect(v.muted).toBe(true);
    expect(v).toHaveAttribute('playsinline');
    expect(v).toHaveAttribute('aria-hidden', 'true');
    expect(v).not.toHaveAttribute('autoplay');
    expect(play).toHaveBeenCalled();
  });

  it('under reduced motion nothing autoplays', () => {
    motionPref.reduced = true;
    wrap();
    expect(play).not.toHaveBeenCalled();
    expect(heroVideo()).toHaveAttribute('preload', 'metadata');
  });

  it('renders in English and loads Instrument Serif only for English', () => {
    const { unmount } = wrap('vi');
    expect(document.getElementById('font-instrument-serif')).toBeNull();
    unmount();
    wrap('en');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Keep the voice, bound in a book');
    expect(document.getElementById('font-instrument-serif')).not.toBeNull();
  });
});
