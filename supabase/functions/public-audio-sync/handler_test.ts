import assert from 'node:assert/strict';
import { collectPages, handle, PUBLIC_AUDIO_CACHE_SECONDS, reconcile, type SyncStore } from './handler.ts';

function fakeStore(items: { id: string; audio_path: string; source_path: string | null }[], files: string[]) {
  const calls = { copied: [] as string[], removed: [] as string[] };
  const store: SyncStore = {
    listPublishedAudio: () => Promise.resolve(items),
    listPublicFiles: () => Promise.resolve(files),
    copyToPublic: (src, target) => {
      if (src === 'broken') return Promise.reject(new Error('x'));
      calls.copied.push(target);
      return Promise.resolve();
    },
    removePublic: (paths) => {
      calls.removed.push(...paths);
      return Promise.resolve();
    },
  };
  return { store, calls };
}

Deno.test('copies missing published audio and removes orphans', async () => {
  const { store, calls } = fakeStore(
    [
      { id: 'a', audio_path: 'items/a.webm', source_path: 'f/n/1.webm' },
      { id: 'b', audio_path: 'items/b.webm', source_path: 'f/n/2.webm' },
    ],
    ['items/b.webm', 'items/old.webm'],
  );
  const res = await reconcile(store);
  assert.deepEqual(res.copied, ['items/a.webm']);
  assert.deepEqual(res.removed, ['items/old.webm']);
  assert.deepEqual(calls.copied, ['items/a.webm']);
  assert.deepEqual(calls.removed, ['items/old.webm']);
});

Deno.test('records failures without throwing', async () => {
  const { store } = fakeStore(
    [
      { id: 'a', audio_path: 'items/a.webm', source_path: null },
      { id: 'b', audio_path: 'items/b.webm', source_path: 'broken' },
    ],
    [],
  );
  const res = await reconcile(store);
  assert.deepEqual(res.failed, ['a', 'b']);
  assert.deepEqual(res.removed, []);
});

Deno.test('rejects unauthenticated calls and answers preflight', async () => {
  const { store } = fakeStore([], []);
  const deps = { verifyUser: (jwt: string) => Promise.resolve(jwt === 'good'), store: () => store };
  assert.deepEqual((await handle(new Request('http://x', { method: 'OPTIONS' }), deps)).status, 204);
  assert.deepEqual((await handle(new Request('http://x', { method: 'POST' }), deps)).status, 401);
  const ok = await handle(new Request('http://x', { method: 'POST', headers: { authorization: 'Bearer good' } }), deps);
  assert.deepEqual(ok.status, 200);
});

Deno.test('never copies to a path outside items/ (only the shape review_publish writes)', async () => {
  const { store, calls } = fakeStore(
    [
      { id: 'a', audio_path: '../recordings/x.webm', source_path: 'f/n/1.webm' },
      { id: 'b', audio_path: 'other/b.webm', source_path: 'f/n/2.webm' },
      { id: 'c', audio_path: 'items/c/d.webm', source_path: 'f/n/3.webm' },
    ],
    [],
  );
  const res = await reconcile(store);
  assert.deepEqual(res.failed, ['a', 'b', 'c']);
  assert.deepEqual(calls.copied, []);
});

Deno.test('revoked / audio switched off: its public copy is removed (NT09)', async () => {
  const { store, calls } = fakeStore([], ['items/a.webm']);
  const res = await reconcile(store);
  assert.deepEqual(res.removed, ['items/a.webm']);
  assert.deepEqual(calls.removed, ['items/a.webm']);
});

Deno.test('public audio is cached for at most a minute, so a revoke takes effect quickly (NT09)', () => {
  assert.ok(PUBLIC_AUDIO_CACHE_SECONDS > 0 && PUBLIC_AUDIO_CACHE_SECONDS <= 60);
});

Deno.test('collectPages reads past 1000 rows and does not stop on a page the server capped below the page size', async () => {
  const rows = Array.from({ length: 2_345 }, (_, i) => i);
  const offsets: number[] = [];
  // The server caps every page at 700 rows although 1000 are requested.
  const all = await collectPages((offset, limit) => {
    offsets.push(offset);
    return Promise.resolve(rows.slice(offset, offset + Math.min(limit, 700)));
  }, 1000);
  assert.equal(all.length, 2_345);
  assert.deepEqual(all, rows);
  assert.deepEqual(offsets, [0, 700, 1400, 2100, 2345]);
});

Deno.test('with more than 1000 published items none of their files is treated as an orphan', async () => {
  const items = Array.from({ length: 1_500 }, (_, i) => ({ id: `i${i}`, audio_path: `items/i${i}.webm`, source_path: `f/n/${i}.webm` }));
  const files = items.map((i) => i.audio_path);
  const { store, calls } = fakeStore([], files);
  store.listPublishedAudio = () => collectPages((offset, limit) => Promise.resolve(items.slice(offset, offset + Math.min(limit, 1000))));
  const res = await reconcile(store);
  assert.deepEqual(res.removed, []);
  assert.deepEqual(calls.removed, []);
});
