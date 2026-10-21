import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import ExplorePage from './ExplorePage';

const track = vi.fn();
vi.mock('@/lib/events', () => ({ track: (code: string) => track(code) }));
// Not configured → the hub shows the labelled illustrative set (no network).
vi.mock('@/lib/supabase', () => ({ getSupabase: () => null }));

function renderHub() {
  return render(
    <LocaleProvider initial="vi">
      <MemoryRouter initialEntries={['/kham-pha']}>
        <Routes>
          <Route path="/kham-pha" element={<ExplorePage />} />
          <Route path="/tri-thuc/:id" element={<p>detail</p>} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe('ExplorePage usage events (B17)', () => {
  beforeEach(() => track.mockClear());

  it("sends 'search' once per submitted search, without the query", () => {
    renderHub();
    const form = screen.getByRole('search');
    fireEvent.change(within(form).getByRole('searchbox'), { target: { value: 'kho cá' } });
    fireEvent.submit(form);
    expect(track.mock.calls).toEqual([['search']]);
  });

  it("does not send 'search' while typing", () => {
    renderHub();
    fireEvent.change(within(screen.getByRole('search')).getByRole('searchbox'), { target: { value: 'mai' } });
    expect(track).not.toHaveBeenCalled();
  });

  it("sends 'open_result' once when a result card is opened", () => {
    renderHub();
    const results = screen.getByRole('region', { name: /Mới được chia sẻ|Nội dung trong kho/ });
    fireEvent.click(within(results).getAllByRole('link')[0]!);
    expect(track.mock.calls).toEqual([['open_result']]);
  });
});
