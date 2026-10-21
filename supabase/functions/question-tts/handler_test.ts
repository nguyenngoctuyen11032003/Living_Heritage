import assert from 'node:assert/strict';
import {
  cacheKey,
  DEFAULT_TTS_DAILY_LIMIT,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  handle,
  type HandlerDeps,
  type UsageLog,
} from './handler.ts';
import { createLru } from './lib/lru.ts';
import { type TtsAudio, type TtsConfig, TtsError } from './lib/tts.ts';

interface Opts {
  env?: Record<string, string>;
  user?: string | null;
  quota?: boolean;
  synth?: (text: string) => Promise<TtsAudio>;
}

function setup(opts: Opts = {}) {
  const calls = { consumed: [] as number[], refunded: 0, synth: [] as string[], logs: [] as UsageLog[], cfg: null as TtsConfig | null };
  const env: Record<string, string> = { GEMINI_API_KEY: 'k', ...opts.env };
  const cache = createLru<Uint8Array<ArrayBuffer>>({ maxEntries: 50, sizeOf: (v) => v.byteLength });
  const deps: HandlerDeps = {
    env: (k) => env[k],
    now: () => 1_000,
    verifyUser: (jwt) => Promise.resolve(jwt === 'good' ? (opts.user === undefined ? 'u1' : opts.user) : null),
    quotaConsume: (_u, limit) => {
      calls.consumed.push(limit);
      return Promise.resolve(opts.quota ?? true);
    },
    quotaRefund: () => {
      calls.refunded++;
      return Promise.resolve();
    },
    logUsage: (row) => {
      calls.logs.push(row);
      return Promise.resolve();
    },
    tts: (cfg) => {
      calls.cfg = cfg;
      return {
        model: cfg.model,
        voice: cfg.voice,
        synthesize: (text) => {
          calls.synth.push(text);
          return opts.synth ? opts.synth(text) : Promise.resolve({ bytes: new Uint8Array([1, 0, 2, 0]), sampleRate: 24_000, wav: false });
        },
      };
    },
    cache,
  };
  return { deps, calls, cache };
}

const post = (body: unknown, auth = 'Bearer good') =>
  new Request('http://x/question-tts', {
    method: 'POST',
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const ok = { text: 'Bà nhớ điều gì nhất về ngày Tết?', lang: 'vi' };

Deno.test('returns audio/wav with a RIFF header, cache headers, defaults and quota consumed', async () => {
  const { deps, calls } = setup();
  const res = await handle(post(ok), deps);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'audio/wav');
  assert.match(res.headers.get('cache-control') ?? '', /max-age=\d+/);
  assert.equal(res.headers.get('x-tts-cache'), 'miss');
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.equal(bytes.byteLength, 48);
  assert.equal(String.fromCharCode(...bytes.subarray(0, 4)), 'RIFF');
  assert.deepEqual([...bytes.subarray(44)], [1, 0, 2, 0]);
  assert.deepEqual(calls.consumed, [DEFAULT_TTS_DAILY_LIMIT]);
  assert.equal(calls.cfg?.model, DEFAULT_TTS_MODEL);
  assert.equal(calls.cfg?.voice, DEFAULT_TTS_VOICE);
  assert.equal(calls.logs[0]?.action, 'question_tts');
  assert.equal(calls.logs[0]?.status, 'ok');
});

Deno.test('env overrides model, voice and TTS_DAILY_LIMIT', async () => {
  const { deps, calls } = setup({ env: { GEMINI_TTS_MODEL: 'm2', GEMINI_TTS_VOICE: 'Kore', TTS_DAILY_LIMIT: '5' } });
  assert.equal((await handle(post(ok), deps)).status, 200);
  assert.equal(calls.cfg?.model, 'm2');
  assert.equal(calls.cfg?.voice, 'Kore');
  assert.deepEqual(calls.consumed, [5]);
});

Deno.test('a cache hit skips Gemini and the quota', async () => {
  const { deps, calls } = setup();
  await handle(post(ok), deps);
  // Same text with different spacing is the same question.
  const again = await handle(post({ ...ok, text: `  ${ok.text.replace(' ', '   ')} ` }), deps);
  assert.equal(again.status, 200);
  assert.equal(again.headers.get('x-tts-cache'), 'hit');
  assert.equal(calls.synth.length, 1);
  assert.equal(calls.consumed.length, 1);
  // Another language is another entry.
  await handle(post({ ...ok, lang: 'en' }), deps);
  assert.equal(calls.synth.length, 2);
});

Deno.test('cacheKey depends on lang, voice and text', async () => {
  const a = await cacheKey('vi', 'Sulafat', 'x');
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, await cacheKey('en', 'Sulafat', 'x'));
  assert.notEqual(a, await cacheKey('vi', 'Kore', 'x'));
  assert.equal(a, await cacheKey('vi', 'Sulafat', 'x'));
});

Deno.test('quota exceeded → 429 without calling Gemini', async () => {
  const { deps, calls } = setup({ quota: false });
  const res = await handle(post(ok), deps);
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error, 'quota_exceeded');
  assert.equal(calls.synth.length, 0);
  assert.equal(calls.refunded, 0);
});

Deno.test('bad input → 400', async () => {
  const { deps, calls } = setup();
  for (
    const body of [
      '{not json',
      {},
      { text: '', lang: 'vi' },
      { text: '    ', lang: 'vi' },
      { text: 'x'.repeat(401), lang: 'vi' },
      { text: 'ok', lang: 'fr' },
      { text: 42, lang: 'vi' },
    ]
  ) {
    const res = await handle(post(body), deps);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal((await res.json()).error, 'bad_request');
  }
  assert.equal((await handle(post({ text: 'x'.repeat(400), lang: 'en' }), deps)).status, 200);
  assert.equal((await handle(new Request('http://x', { method: 'GET', headers: { authorization: 'Bearer good' } }), deps)).status, 400);
  assert.equal(calls.consumed.length, 1);
});

Deno.test('auth: missing / invalid token → 401; preflight → 204', async () => {
  const { deps } = setup();
  assert.equal((await handle(post(ok, ''), deps)).status, 401);
  assert.equal((await handle(post(ok, 'Bearer bad'), deps)).status, 401);
  assert.equal((await handle(new Request('http://x', { method: 'OPTIONS' }), deps)).status, 204);
});

Deno.test('anonymous narrator sessions are allowed (any verified user id)', async () => {
  const { deps } = setup({ user: 'anon-user-id' });
  assert.equal((await handle(post(ok), deps)).status, 200);
});

Deno.test('no GEMINI_API_KEY → 503 before any quota is used', async () => {
  const { deps, calls } = setup({ env: { GEMINI_API_KEY: '' } });
  assert.equal((await handle(post(ok), deps)).status, 503);
  assert.equal(calls.consumed.length, 0);
});

Deno.test('Gemini failure → 503, quota refunded, nothing cached', async () => {
  const { deps, calls, cache } = setup({ synth: () => Promise.reject(new TtsError('unavailable', 500)) });
  const res = await handle(post(ok), deps);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'ai_unavailable');
  assert.equal(calls.refunded, 1);
  assert.equal(cache.size, 0);
  assert.equal(calls.logs[0]?.status, 'unavailable');
});

Deno.test('unexpected failure also refunds', async () => {
  const { deps, calls } = setup({ synth: () => Promise.reject(new Error('boom')) });
  assert.equal((await handle(post(ok), deps)).status, 503);
  assert.equal(calls.refunded, 1);
});

Deno.test('a WAV from Gemini is passed through unchanged', async () => {
  const wav = new Uint8Array(46);
  wav.set([0x52, 0x49, 0x46, 0x46], 0);
  wav.set([0x57, 0x41, 0x56, 0x45], 8);
  const { deps } = setup({ synth: () => Promise.resolve({ bytes: wav, sampleRate: 24_000, wav: true }) });
  const res = await handle(post(ok), deps);
  assert.equal((await res.arrayBuffer()).byteLength, 46);
});
