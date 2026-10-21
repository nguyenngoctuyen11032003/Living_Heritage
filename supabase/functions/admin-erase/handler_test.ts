import assert from 'node:assert/strict';
import { type EraseDeps, type EraseResponse, handle, REMOVE_BATCH } from './handler.ts';
import { type EraseRpcResult, isErasable, parseObjects, rpcFailure } from './lib/db.ts';

const REQ = '11111111-1111-4111-8111-111111111111';
const FAM = '22222222-2222-4222-8222-222222222222';
const NAR = '33333333-3333-4333-8333-333333333333';

const REC = (i: number) => ({ bucket: 'recordings', path: `${FAM}/${NAR}/rec-${i}.webm` });
const PHOTO = { bucket: 'media', path: `${FAM}/photo-1.jpg` };
const PUBLIC = { bucket: 'public-audio', path: 'items/abc-1.webm' };

function setup(rpc: EraseRpcResult | (() => Promise<EraseRpcResult>), failBuckets: string[] = []) {
  const calls = { rpc: [] as string[], removed: [] as { bucket: string; paths: string[] }[], logs: [] as string[] };
  const deps: EraseDeps = {
    verifyUser: (jwt) => Promise.resolve(jwt === 'good' ? 'user-1' : null),
    eraseRpc: (jwt, id) => {
      assert.equal(jwt, 'good');
      calls.rpc.push(id);
      return typeof rpc === 'function' ? rpc() : Promise.resolve(rpc);
    },
    remove: (bucket, paths) => {
      calls.removed.push({ bucket, paths });
      return Promise.resolve(!failBuckets.includes(bucket));
    },
    log: (m) => calls.logs.push(m),
  };
  return { deps, calls };
}

function post(body: unknown, auth: string | null = 'Bearer good'): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (auth) headers.authorization = auth;
  return new Request('http://localhost/admin-erase', { method: 'POST', headers, body: JSON.stringify(body) });
}

Deno.test('erases the returned objects per bucket after the DB step', async () => {
  const { deps, calls } = setup({ ok: true, objects: [REC(1), PHOTO, PUBLIC, REC(2)] });
  const res = await handle(post({ requestId: REQ }), deps);
  assert.equal(res.status, 200);
  const body = (await res.json()) as EraseResponse;
  assert.deepEqual(body, { request_id: REQ, db_done: true, removed: 4, failed: 0, skipped: 0, storage_complete: true });
  assert.deepEqual(calls.rpc, [REQ]);
  assert.deepEqual(calls.removed, [
    { bucket: 'recordings', paths: [REC(1).path, REC(2).path] },
    { bucket: 'media', paths: [PHOTO.path] },
    { bucket: 'public-audio', paths: [PUBLIC.path] },
  ]);
  assert.deepEqual(calls.logs, []);
});

Deno.test(`removes in batches of at most ${REMOVE_BATCH}`, async () => {
  const objects = Array.from({ length: 230 }, (_, i) => REC(i));
  const { deps, calls } = setup({ ok: true, objects });
  const body = (await (await handle(post({ requestId: REQ }), deps)).json()) as EraseResponse;
  assert.equal(body.removed, 230);
  assert.deepEqual(calls.removed.map((c) => c.paths.length), [100, 100, 30]);
});

Deno.test('a storage failure keeps the DB step, is reported and logged (retry with the same id)', async () => {
  const { deps, calls } = setup({ ok: true, objects: [REC(1), PHOTO] }, ['media']);
  const res = await handle(post({ requestId: REQ }), deps);
  assert.equal(res.status, 200);
  const body = (await res.json()) as EraseResponse;
  assert.deepEqual(body, { request_id: REQ, db_done: true, removed: 1, failed: 1, skipped: 0, storage_complete: false });
  assert.equal(calls.logs.length, 1);
  assert.match(calls.logs[0]!, /failed 1/);
});

Deno.test('a thrown storage error counts as failed, not as a crash', async () => {
  const { deps } = setup({ ok: true, objects: [REC(1)] });
  deps.remove = () => Promise.reject(new Error('boom'));
  const body = (await (await handle(post({ requestId: REQ }), deps)).json()) as EraseResponse;
  assert.equal(body.failed, 1);
});

Deno.test('never touches other buckets or unexpected paths', async () => {
  const objects = [
    { bucket: 'avatars', path: `${FAM}/a.jpg` },
    { bucket: 'recordings', path: '../../etc/passwd' },
    { bucket: 'recordings', path: `${FAM}/x.webm` },
    { bucket: 'media', path: `${FAM}/a/b/c.jpg` },
    { bucket: 'public-audio', path: 'other/a.webm' },
    { bucket: 'toString', path: 'items/a.webm' },
  ];
  const { deps, calls } = setup({ ok: true, objects });
  const body = (await (await handle(post({ requestId: REQ }), deps)).json()) as EraseResponse;
  assert.equal(body.skipped, objects.length);
  assert.equal(body.removed, 0);
  assert.equal(body.storage_complete, false);
  assert.deepEqual(calls.removed, []);
  assert.equal(calls.logs.length, 1);
});

Deno.test('retry of a done request with no stored objects is a plain ok', async () => {
  const { deps, calls } = setup({ ok: true, objects: [] });
  const body = (await (await handle(post({ requestId: REQ }), deps)).json()) as EraseResponse;
  assert.deepEqual(body, { request_id: REQ, db_done: true, removed: 0, failed: 0, skipped: 0, storage_complete: true });
  assert.deepEqual(calls.removed, []);
});

Deno.test('RPC refusals map to stable codes without internals', async () => {
  for (
    const [reason, status, code] of [
      ['forbidden', 403, 'forbidden'],
      ['not_found', 404, 'not_found'],
      ['bad_request', 400, 'bad_request'],
      ['failed', 500, 'internal'],
    ] as const
  ) {
    const { deps, calls } = setup({ ok: false, reason });
    const res = await handle(post({ requestId: REQ }), deps);
    assert.equal(res.status, status);
    const body = await res.json();
    assert.equal(body.error, code);
    assert.deepEqual(Object.keys(body).sort(), ['error', 'message']);
    assert.deepEqual(calls.removed, []);
  }
  const { deps } = setup(() => Promise.reject(new Error('db password=secret')));
  const res = await handle(post({ requestId: REQ }), deps);
  assert.equal(res.status, 500);
  assert.doesNotMatch(await res.text(), /secret/);
});

Deno.test('auth and input validation', async () => {
  const { deps, calls } = setup({ ok: true, objects: [] });
  assert.equal((await handle(post({ requestId: REQ }, null), deps)).status, 401);
  assert.equal((await handle(post({ requestId: REQ }, 'Bearer bad'), deps)).status, 401);
  assert.equal((await handle(post({ requestId: 'nope' }), deps)).status, 400);
  assert.equal((await handle(post({ request_id: REQ }), deps)).status, 400);
  assert.equal((await handle(new Request('http://x', { method: 'GET' }), deps)).status, 400);
  assert.equal((await handle(new Request('http://x', { method: 'OPTIONS' }), deps)).status, 204);
  assert.deepEqual(calls.rpc, []);
});

Deno.test('parseObjects accepts rows, a json array or {objects}; drops malformed and duplicates', () => {
  assert.deepEqual(parseObjects([REC(1), REC(1), { bucket: 1, path: 'x' }, null]), [REC(1)]);
  assert.deepEqual(parseObjects({ objects: [PHOTO] }), [PHOTO]);
  assert.deepEqual(parseObjects(null), []);
  assert.deepEqual(parseObjects('x'), []);
});

Deno.test('isErasable / rpcFailure', () => {
  assert.ok(isErasable(REC(1)) && isErasable(PHOTO) && isErasable(PUBLIC));
  assert.ok(!isErasable({ bucket: 'recordings', path: `${FAM}/${NAR}/../x.webm` }));
  assert.equal(rpcFailure('42501'), 'forbidden');
  assert.equal(rpcFailure('P0002'), 'not_found');
  assert.equal(rpcFailure('22P02'), 'bad_request');
  assert.equal(rpcFailure(undefined), 'failed');
});
