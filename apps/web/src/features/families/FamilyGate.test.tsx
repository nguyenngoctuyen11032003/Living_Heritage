import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n';
import type { CurrentFamilyState } from './current';
import { gateDecision } from './gate';
import { rpcErrorCode } from './rpcError';

const fake: { state: CurrentFamilyState; configured: boolean } = { state: null as unknown as CurrentFamilyState, configured: true };

vi.mock('./current', () => ({ useCurrentFamily: () => fake.state }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => (fake.configured ? {} : null) }));

const { FamilyGate } = await import('./FamilyGate');

function state(over: Partial<CurrentFamilyState>): CurrentFamilyState {
  return {
    families: [],
    current: null,
    loading: false,
    error: null,
    select: vi.fn(),
    reload: vi.fn(async () => {}),
    canEdit: false,
    canManage: false,
    ...over,
  };
}

const A = { id: 'a', name: 'Nhà họ Nguyễn', role: 'owner' as const };
const B = { id: 'b', name: 'Nhà họ Trần', role: 'viewer' as const };

function renderGate() {
  return render(
    <LocaleProvider initial="vi">
      <MemoryRouter initialEntries={['/gia-dinh']}>
        <Routes>
          <Route
            path="/gia-dinh"
            element={
              <FamilyGate>
                <p>vault content</p>
              </FamilyGate>
            }
          />
          <Route path="/gia-dinh/bat-dau" element={<p>onboarding page</p>} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

beforeEach(() => {
  fake.configured = true;
});

describe('gateDecision', () => {
  it('covers every state', () => {
    expect(gateDecision(state({}), false)).toBe('not-configured');
    expect(gateDecision(state({ loading: true }), true)).toBe('loading');
    expect(gateDecision(state({ error: 'boom' }), true)).toBe('error');
    expect(gateDecision(state({}), true)).toBe('onboard');
    expect(gateDecision(state({ families: [A], current: A }), true)).toBe('ready');
  });
});

describe('<FamilyGate>', () => {
  it('shows a busy skeleton while loading', () => {
    fake.state = state({ loading: true });
    const { container } = renderGate();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('vault content')).toBeNull();
  });

  it('redirects to onboarding when the user has no family', () => {
    fake.state = state({});
    renderGate();
    expect(screen.getByText('onboarding page')).toBeInTheDocument();
  });

  it('renders children without a switcher for a single family', () => {
    fake.state = state({ families: [A], current: A });
    renderGate();
    expect(screen.getByText('vault content')).toBeInTheDocument();
    expect(screen.queryByLabelText('Gia đình đang xem')).toBeNull();
  });

  it('shows a family switcher for several families and selects on change', () => {
    const select = vi.fn();
    fake.state = state({ families: [A, B], current: A, select });
    renderGate();
    const box = screen.getByLabelText('Gia đình đang xem');
    fireEvent.change(box, { target: { value: 'b' } });
    expect(select).toHaveBeenCalledWith('b');
  });

  it('offers retry on error', () => {
    const reload = vi.fn(async () => {});
    fake.state = state({ error: 'boom', reload });
    renderGate();
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(reload).toHaveBeenCalled();
  });

  it('shows the not-configured notice without Supabase', () => {
    fake.configured = false;
    fake.state = state({});
    renderGate();
    expect(screen.getByText('Hệ thống chưa được cấu hình kết nối máy chủ.')).toBeInTheDocument();
  });
});

describe('rpcErrorCode', () => {
  it('extracts known codes and maps RLS/network errors', () => {
    expect(rpcErrorCode({ message: 'invite_email_mismatch' })).toBe('invite_email_mismatch');
    expect(rpcErrorCode({ message: 'new row violates row-level security policy for table "narrators"', code: '42501' })).toBe('forbidden');
    expect(rpcErrorCode({ message: 'TypeError: Failed to fetch' })).toBe('network');
    expect(rpcErrorCode({ message: 'something odd' })).toBe('unknown');
  });
});
