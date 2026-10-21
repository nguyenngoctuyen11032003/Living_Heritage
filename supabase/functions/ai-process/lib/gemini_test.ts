import assert from 'node:assert/strict';
import { createBreaker } from './breaker.ts';
import {
  backoffMs,
  baseMime,
  createGemini,
  GEMINI_BASE_URL,
  GeminiError,
  type GeminiRuntime,
  toBase64,
  tuning,
  upstreamDetail,
} from './gemini.ts';

const CFG = { apiKey: 'secret-key', model: 'gemini-2.5-flash', timeoutMs: 5_000 };

function ok(text: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 3 },
    }),
    { status: 200 },
  );
}

function runtime(responses: Response[]) {
  const requests: { url: string; init: RequestInit }[] = [];
  let now = 0;
  const breaker = createBreaker({ failureThreshold: 5, windowMs: 60_000, openMs: 60_000, now: () => now });
  const rt: GeminiRuntime = {
    fetch: ((url: string, init: RequestInit) => {
      requests.push({ url, init });
      const r = responses.shift();
      return r ? Promise.resolve(r) : Promise.reject(new TypeError('network'));
    }) as typeof fetch,
    sleep: () => Promise.resolve(),
    random: () => 0,
    breaker,
  };
  return { rt, requests, breaker, tick: (ms: number) => (now += ms) };
}

Deno.test('transcribe sends inline audio with the key in a header only', async () => {
  const { rt, requests } = runtime([ok('  Xin chào  ')]);
  const r = await createGemini(CFG, rt).transcribe(new Uint8Array([1, 2, 3]), 'audio/webm;codecs=opus');
  assert.equal(r.value, 'Xin chào');
  assert.deepEqual(r.usage, { input_tokens: 7, output_tokens: 3 });
  const { url, init } = requests[0]!;
  assert.equal(url, `${GEMINI_BASE_URL}/gemini-2.5-flash:generateContent`);
  assert.ok(!url.includes('secret-key'));
  assert.equal((init.headers as Record<string, string>)['x-goog-api-key'], 'secret-key');
  const body = JSON.parse(String(init.body));
  assert.deepEqual(body.contents[0].parts[1], { inline_data: { mime_type: 'audio/webm', data: 'AQID' } });
});

Deno.test("transcribe passes the narrator's language as a hint", async () => {
  const { rt, requests } = runtime([ok('Hello'), ok('Xin chào')]);
  await createGemini(CFG, rt).transcribe(new Uint8Array(1), null, 'en');
  await createGemini(CFG, rt).transcribe(new Uint8Array(1), null);
  assert.match(JSON.parse(String(requests[0]!.init.body)).contents[0].parts[0].text, /usually speaks English/);
  assert.doesNotMatch(JSON.parse(String(requests[1]!.init.body)).contents[0].parts[0].text, /usually speaks/);
});

Deno.test('draft uses JSON mode with responseSchema and parses the output', async () => {
  const { rt, requests } = runtime([ok('{"a":1}')]);
  const r = await createGemini(CFG, rt).draft({ lang: 'vi', transcript: 't', topic: 'Làm vườn', question: null });
  assert.deepEqual(r.value, { a: 1 });
  const body = JSON.parse(String(requests[0]!.init.body));
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.equal(body.generationConfig.responseSchema.type, 'OBJECT');
  assert.match(body.systemInstruction.parts[0].text, /Vietnamese/);
});

Deno.test('503 is retried with backoff (1 + 3 attempts), then GeminiError unavailable', async () => {
  const { rt, requests } = runtime([503, 503, 503, 503].map(() => new Response('x', { status: 503 })));
  await assert.rejects(createGemini(CFG, rt).suggest({ lang: 'vi', topic: 't', previousTitles: [] }), (e) => {
    assert.ok(e instanceof GeminiError);
    assert.equal(e.kind, 'unavailable');
    return true;
  });
  assert.equal(requests.length, 4);
});

Deno.test('retry succeeds after a 429', async () => {
  const { rt } = runtime([new Response('x', { status: 429 }), ok('{"questions":["a"]}')]);
  const r = await createGemini(CFG, rt).suggest({ lang: 'en', topic: 't', previousTitles: [] });
  assert.deepEqual(r.value, { questions: ['a'] });
});

Deno.test('400 is not retried; invalid JSON output is invalid_output', async () => {
  const a = runtime([new Response('bad', { status: 400 })]);
  await assert.rejects(createGemini(CFG, a.rt).transcribe(new Uint8Array(1), null), /bad_request/);
  assert.equal(a.requests.length, 1);
  const b = runtime([ok('not json')]);
  await assert.rejects(createGemini(CFG, b.rt).draft({ lang: 'vi', transcript: 't', topic: null, question: null }), /invalid_output/);
});

Deno.test('breaker opens after 5 upstream failures and blocks further calls', async () => {
  const { rt, requests, breaker, tick } = runtime([]);
  const g = createGemini(CFG, rt);
  for (let i = 0; i < 5; i++) await assert.rejects(g.transcribe(new Uint8Array(1), null), /network/);
  assert.equal(breaker.state(), 'open');
  const before = requests.length;
  await assert.rejects(g.transcribe(new Uint8Array(1), null), /circuit_open/);
  assert.equal(requests.length, before);
  tick(60_000);
  assert.equal(breaker.state(), 'half_open');
});

Deno.test('helpers', () => {
  assert.equal(baseMime(null), 'audio/webm');
  assert.equal(baseMime('Audio/MP4; codecs=mp4a'), 'audio/mp4');
  assert.equal(toBase64(new TextEncoder().encode('hello')), 'aGVsbG8=');
  const big = new Uint8Array(100_000).fill(65);
  assert.equal(atob(toBase64(big)).length, 100_000);
});

Deno.test('upstreamDetail keeps a short single-line Gemini error message', () => {
  const body = JSON.stringify({ error: { code: 404, message: 'This model models/x is no longer   available\nto new users.' } });
  assert.equal(upstreamDetail(body), 'This model models/x is no longer available to new users.');
  assert.equal(upstreamDetail('not json'), null);
  assert.equal(upstreamDetail(JSON.stringify({ error: {} })), null);
  assert.equal(upstreamDetail(JSON.stringify({ error: { message: 'x'.repeat(500) } }))?.length, 240);
});

Deno.test('tuning: Gemini 3 keeps default temperature with low thinking; 2.5 disables thinking', () => {
  assert.deepEqual(tuning('gemini-3.8-flash', 0), { thinkingConfig: { thinkingLevel: 'low' } });
  assert.deepEqual(tuning('gemini-2.5-flash', 0.4), { temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } });
  assert.deepEqual(tuning('other-model', 0.7), { temperature: 0.7 });
});

Deno.test('backoff grows 1s, 2s, 4s with up to 0.5s jitter', () => {
  assert.deepEqual([0, 1, 2].map((n) => backoffMs(n, 0)), [1_000, 2_000, 4_000]);
  assert.equal(backoffMs(0, 0.999), 1_499);
});

Deno.test('a busy primary falls back to the fallback model once, with its own tuning', async () => {
  const busy = () => new Response('{"error":{"message":"high demand"}}', { status: 503 });
  const { rt, requests } = runtime([busy(), busy(), busy(), busy(), ok('{"questions":["b"]}')]);
  const g = createGemini({ ...CFG, model: 'gemini-3.8-flash', fallbackModel: 'gemini-3.8-flash-lite' }, rt);
  const r = await g.suggest({ lang: 'en', topic: 't', previousTitles: [] });
  assert.deepEqual(r.value, { questions: ['b'] });
  assert.equal(requests.length, 5);
  assert.match(requests[0]!.url, /gemini-3.8-flash:generateContent$/);
  assert.match(requests[4]!.url, /gemini-3.8-flash-lite:generateContent$/);
});

Deno.test('no fallback for 400, or when none is configured', async () => {
  const a = runtime([new Response('bad', { status: 400 }), ok('{"questions":["x"]}')]);
  await assert.rejects(
    createGemini({ ...CFG, fallbackModel: 'other' }, a.rt).suggest({ lang: 'en', topic: 't', previousTitles: [] }),
    /bad_request/,
  );
  assert.equal(a.requests.length, 1);
  const b = runtime([503, 503, 503, 503].map(() => new Response('x', { status: 503 })));
  await assert.rejects(createGemini(CFG, b.rt).suggest({ lang: 'en', topic: 't', previousTitles: [] }), /unavailable/);
  assert.equal(b.requests.length, 4);
});

Deno.test('tuning: speech models get no thinking settings', () => {
  assert.deepEqual(tuning('gemini-3.5-transcribe', 0), { temperature: 0 });
  assert.deepEqual(tuning('gemini-3.8-flash-tts', 0.5), { temperature: 0.5 });
});

Deno.test('transcribeModel is used for transcription only; drafting stays on the main model', async () => {
  const { rt, requests } = runtime([ok('hello'), ok('{"questions":["a"]}')]);
  const g = createGemini({ ...CFG, model: 'gemini-3.7-flash', transcribeModel: 'gemini-3.5-transcribe' }, rt);
  await g.transcribe(new Uint8Array([1]), 'audio/webm');
  await g.suggest({ lang: 'en', topic: 't', previousTitles: [] });
  assert.match(requests[0]!.url, /gemini-3.5-transcribe:generateContent$/);
  assert.match(requests[1]!.url, /gemini-3.7-flash:generateContent$/);
  assert.equal(JSON.parse(requests[0]!.init.body as string).generationConfig.thinkingConfig, undefined);
});

Deno.test('speech models get the instructions inside the user turn and no systemInstruction', async () => {
  const { rt, requests } = runtime([ok('hi'), ok('hi')]);
  await createGemini({ ...CFG, transcribeModel: 'gemini-3.5-transcribe' }, rt).transcribe(new Uint8Array([1]), 'audio/webm', 'en');
  const speech = JSON.parse(requests[0]!.init.body as string);
  assert.equal(speech.systemInstruction, undefined);
  assert.match(speech.contents[0].parts[0].text, /transcri/i);
  assert.ok(speech.contents[0].parts[1].inline_data.data.length > 0);
  await createGemini(CFG, rt).transcribe(new Uint8Array([1]), 'audio/webm', 'en');
  assert.ok(JSON.parse(requests[1]!.init.body as string).systemInstruction);
});
