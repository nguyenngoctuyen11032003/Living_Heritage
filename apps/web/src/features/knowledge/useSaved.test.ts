import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedEntry } from './saved';
import { useSaved } from './useSaved';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const entry = (id: string): SavedEntry => ({ id, title: `T ${id}`, kind: 'story', topicSlug: null, narratorLabel: 'N', region: null, savedAt: '2026-10-01T00:00:00Z' });

let session: { user: { id: string } | null; loading: boolean; isAnonymous: boolean } = { user: null, loading: false, isAnonymous: false };
let server: SavedEntry[] = [];
const listSavedItems = vi.fn(async () => [...server]);

vi.mock('@/lib/session', () => ({ useSession: () => session }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }));
vi.mock('./api', () => ({
  listSavedItems: () => listSavedItems(),
  addSavedItems: vi.fn(async () => []),
  removeSavedItem: vi.fn(async () => {}),
}));

describe('useSaved', () => {
  beforeEach(() => {
    localStorage.clear();
    listSavedItems.mockClear();
  });

  it('reloads from the server after sign-out and sign-in again (no stale cached list)', async () => {
    server = [entry(A)];
    session = { user: { id: 'u1' }, loading: false, isAnonymous: false };
    const { result, rerender } = renderHook(() => useSaved());
    await waitFor(() => expect(result.current.list.map((e) => e.id)).toEqual([A]));
    expect(result.current.mode).toBe('account');

    session = { user: null, loading: false, isAnonymous: false };
    rerender();
    expect(result.current.mode).toBe('device');
    expect(result.current.list).toEqual([]);

    server = [entry(B)]; // changed on another device meanwhile
    session = { user: { id: 'u1' }, loading: false, isAnonymous: false };
    act(() => rerender());
    await waitFor(() => expect(result.current.list.map((e) => e.id)).toEqual([B]));
    expect(listSavedItems).toHaveBeenCalledTimes(2);
  });
});
