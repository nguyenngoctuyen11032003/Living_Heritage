import assert from 'node:assert/strict';
import { createBreaker } from './breaker.ts';
import { baseMime, createGemini, GEMINI_BASE_URL, GeminiError, type GeminiRuntime, toBase64 } from './gemini.ts';

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

Deno.test('draft uses JSON mode with responseSchema and parses the output', async () => {
  const { rt, requests } = runtime([ok('{"a":1}')]);
  const r = await createGemini(CFG, rt).draft({ lang: 'vi', transcript: 't', topic: 'Làm vườn', question: null });
  assert.deepEqual(r.value, { a: 1 });
  const body = JSON.parse(String(requests[0]!.init.body));
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.equal(body.generationConfig.responseSchema.type, 'OBJECT');
  assert.match(body.systemInstruction.parts[0].text, /Vietnamese/);
});

Deno.test('one retry on 503, then GeminiError unavailable', async () => {
  const { rt, requests } = runtime([new Response('x', { status: 503 }), new Response('x', { status: 503 })]);
  await assert.rejects(createGemini(CFG, rt).suggest({ lang: 'vi', topic: 't', previousTitles: [] }), (e) => {
    assert.ok(e instanceof GeminiError);
    assert.equal(e.kind, 'unavailable');
    return true;
  });
  assert.equal(requests.length, 2);
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
