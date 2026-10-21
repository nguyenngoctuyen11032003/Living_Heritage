import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeCandidates, SavedAccountStore, SavedWithdrawnError, type SavedApi } from './saved-account';
import { readSaved, writeSaved, type SavedEntry } from './saved';
import { fromPublicRow } from './types';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const entry = (id: string, savedAt = '2026-10-01T00:00:00Z'): SavedEntry => ({ id, title: `T ${id}`, kind: 'story', topicSlug: null, narratorLabel: 'N', region: null, savedAt });

function fakeApi(server: SavedEntry[] = [], withdrawn: ReadonlySet<string> = new Set()) {
  const rows = [...server];
  const api = {
    list: vi.fn(async () => [...rows]),
    add: vi.fn(async (ids: readonly string[]) => {
      for (const id of ids) if (!withdrawn.has(id) && !rows.some((r) => r.id === id)) rows.unshift(entry(id));
      return ids.filter((id) => withdrawn.has(id));
    }),
    remove: vi.fn(async (id: string) => {
      rows.splice(rows.findIndex((r) => r.id === id), 1);
    }),
  } satisfies SavedApi;
  return { api, rows };
}

describe('SavedAccountStore (saved_items when signed in)', () => {
  beforeEach(() => localStorage.clear());

  it('merges the device list on sign-in, keeping samples on the device', async () => {
    writeSaved([entry(A), entry('mau-ca-kho-to')]);
    const { api } = fakeApi([entry(B)]);
    const store = new SavedAccountStore(api, 'u1');
    await store.ensureLoaded();
    expect(api.add).toHaveBeenCalledWith([A]);
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', mergeFailed: false });
    expect(store.getSnapshot().entries.map((e) => e.id).sort()).toEqual([A, B].sort());
    expect(readSaved().map((e) => e.id)).toEqual(['mau-ca-kho-to']);

    // Nothing new on the device: a later sign-in does not call add again.
    await new SavedAccountStore(api, 'u1').ensureLoaded();
    expect(api.add).toHaveBeenCalledTimes(1);
  });

  it('moves items saved on the device while signed out up on every later sign-in', async () => {
    const { api, rows } = fakeApi([entry(B)]);
    await new SavedAccountStore(api, 'u1').ensureLoaded();
    writeSaved([entry(A)]); // saved while signed out
    const again = new SavedAccountStore(api, 'u1');
    await again.ensureLoaded();
    expect(api.add).toHaveBeenLastCalledWith([A]);
    expect(rows.map((r) => r.id).sort()).toEqual([A, B].sort());
    expect(again.has(A)).toBe(true);
    expect(readSaved()).toEqual([]);
  });

  it('keeps the device list and says so when the merge fails', async () => {
    writeSaved([entry(A)]);
    const { api } = fakeApi();
    api.add.mockRejectedValueOnce(new Error('offline'));
    const store = new SavedAccountStore(api, 'u2');
    await store.ensureLoaded();
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', mergeFailed: true });
    expect(readSaved().map((e) => e.id)).toEqual([A]);
  });

  it('reports a load error instead of an empty list, and can retry', async () => {
    const { api } = fakeApi([entry(B)]);
    api.list.mockRejectedValueOnce(new Error('500'));
    const store = new SavedAccountStore(api, 'u3');
    await store.ensureLoaded();
    expect(store.getSnapshot().status).toBe('error');
    await store.reload();
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', entries: [expect.objectContaining({ id: B })] });
  });

  it('toggles on the server and reverts when the server refuses', async () => {
    const { api } = fakeApi();
    const store = new SavedAccountStore(api, 'u4');
    await store.ensureLoaded();
    const item = fromPublicRow({ id: A, kind: 'story', title: 'X', narrator_label: 'N', fields: {} });
    await expect(store.toggle(item, entry(A))).resolves.toBe(true);
    expect(store.has(A)).toBe(true);

    api.remove.mockRejectedValueOnce(new Error('rls'));
    await expect(store.toggle(item, entry(A))).rejects.toThrow('rls');
    expect(store.has(A)).toBe(true);

    api.add.mockRejectedValueOnce(new Error('offline'));
    await store.remove(A);
    expect(store.has(A)).toBe(false);
    await expect(store.toggle(item, entry(A))).rejects.toThrow('offline');
    expect(store.has(A)).toBe(false);
  });

  it('only uploads real public item ids that the server does not have', () => {
    expect(mergeCandidates([entry(A), entry(B), entry('mau-x')], [entry(B)])).toEqual([A]);
  });

  it('refuses to show an item as saved when it was withdrawn after the page loaded', async () => {
    const { api } = fakeApi([], new Set([A]));
    const store = new SavedAccountStore(api, 'u5');
    await store.ensureLoaded();
    const item = fromPublicRow({ id: A, kind: 'story', title: 'X', narrator_label: 'N', fields: {} });
    await expect(store.toggle(item, entry(A))).rejects.toBeInstanceOf(SavedWithdrawnError);
    expect(store.has(A)).toBe(false);
  });
});
