import assert from 'node:assert/strict';
import { handle, reconcile, type SyncStore } from './handler.ts';

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

Deno.test('never copies an audio_path outside items/ (no traversal into the public bucket)', async () => {
  const { store, calls } = fakeStore(
    [
      { id: 'a', audio_path: '../secret.webm', source_path: 'f/n/1.webm' },
      { id: 'b', audio_path: 'other/b.webm', source_path: 'f/n/2.webm' },
    ],
    [],
  );
  const res = await reconcile(store);
  assert.deepEqual(res.failed, ['a', 'b']);
  assert.deepEqual(calls.copied, []);
});
