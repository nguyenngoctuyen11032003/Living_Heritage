import assert from 'node:assert/strict';
import { KnowledgeAskResponse, KnowledgeReindexResponse } from '../_shared/knowledge-contract.ts';
import { GeminiError } from '../ai-process/lib/gemini.ts';
import { handle, type KnowledgeDeps, LAZY_EMBED_LIMIT, MATCH_LIMIT, REINDEX_LIMIT } from './handler.ts';
import type { AnswerInput, EmbedTask, KnowledgeAi, KnowledgeAiConfig } from './lib/ai.ts';
import type { AdminCheck, KnowledgeDb, MatchRow, UnembeddedRow } from './lib/db.ts';
import { createDailyCap, createRateLimiter } from './lib/limits.ts';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const NOW = Date.UTC(2026, 9, 22, 8, 0, 0);
const ITEM_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ITEM_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const MATCH_A: MatchRow = {
  id: ITEM_A,
  kind: 'experience',
  title: 'Tuốt lá mai trước Tết',
  summary: 'Tuốt lá mai vào khoảng rằm tháng Chạp để hoa nở đúng Tết.',
  body: 'Ông Tư kể: tuốt lá vào rằm tháng Chạp.',
  fields: {
    skill: 'Tuốt lá mai',
    steps: ['Tưới đẫm trước một ngày.', 'Tuốt lá vào rằm tháng Chạp.'],
    cautions: ['Đừng tuốt khi cây yếu.'],
  },
  topic_slug: 'lam-vuon',
  narrator_label: 'Ông Tư (Bến Tre)',
  region: 'nam',
  decade: 1970,
  similarity: 0.81234,
};
const MATCH_B: MatchRow = { ...MATCH_A, id: ITEM_B, kind: 'story', title: 'Vườn mai của ba', similarity: 0.6 };

const pending = (n: number): UnembeddedRow[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `row-${i}`,
    title: `Tiêu đề ${i}`,
    summary: `Tóm tắt ${i}`,
    body: `Nội dung ${i}`,
    fields: { steps: [`Bước ${i}`] },
    updated_at: '2026-10-22T07:00:00+00:00',
  }));

interface World {
  env: Record<string, string | undefined>;
  matches: MatchRow[];
  unembedded: UnembeddedRow[];
  admin: AdminCheck;
  embed: (texts: string[], task: EmbedTask) => Promise<number[][]>;
  answer: (input: AnswerInput) => Promise<unknown>;
  ratePerMin: number;
  dailyCap: number;
}

interface Log {
  embedCalls: { task: EmbedTask; texts: string[] }[];
  answerCalls: AnswerInput[];
  saved: { id: string; at: string; dims: number }[];
  matchArgs: { limit: number; min: number } | null;
  listLimits: number[];
  aiCfg: KnowledgeAiConfig | null;
  adminTokens: string[];
}

const vec = () => Array.from({ length: 768 }, () => 0.01);

function setup(over: Partial<World> = {}) {
  const w: World = {
    env: { GEMINI_API_KEY: 'test-key' },
    matches: [MATCH_A, MATCH_B],
    unembedded: [],
    admin: 'admin',
    embed: (texts) => Promise.resolve(texts.map(vec)),
    answer: () =>
      Promise.resolve({
        answered: true,
        answer: 'Theo lời kể của ông Tư, nên tuốt lá vào rằm tháng Chạp [1]. Đừng tuốt khi cây yếu [1][7].',
        cited: [1],
      }),
    ratePerMin: 10,
    dailyCap: 1000,
    ...over,
  };
  const log: Log = { embedCalls: [], answerCalls: [], saved: [], matchArgs: null, listLimits: [], aiCfg: null, adminTokens: [] };

  const db: KnowledgeDb = {
    listUnembedded: (limit) => {
      log.listLimits.push(limit);
      return Promise.resolve(w.unembedded.slice(0, limit));
    },
    saveEmbedding: (row, v, at) => {
      log.saved.push({ id: row.id, at, dims: v.length });
      w.unembedded = w.unembedded.filter((r) => r.id !== row.id);
      return Promise.resolve(true);
    },
    countUnembedded: () => Promise.resolve(w.unembedded.length),
    match: (_v, limit, min) => {
      log.matchArgs = { limit, min };
      return Promise.resolve(w.matches);
    },
  };

  const ai = (cfg: KnowledgeAiConfig): KnowledgeAi => {
    log.aiCfg = cfg;
    return {
      embed: (texts, task) => {
        log.embedCalls.push({ task, texts });
        return w.embed(texts, task);
      },
      answer: (input) => {
        log.answerCalls.push(input);
        return w.answer(input);
      },
    };
  };

  const deps: KnowledgeDeps = {
    env: (k) => w.env[k],
    now: () => NOW,
    db: () => db,
    checkAdmin: (jwt) => {
      log.adminTokens.push(jwt);
      return Promise.resolve(w.admin);
    },
    ai,
    limiter: createRateLimiter({ limit: w.ratePerMin, windowMs: 60_000, now: () => NOW }),
    dailyCap: createDailyCap({ cap: w.dailyCap, now: () => NOW }),
  };
  return { deps, log, w };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/knowledge-ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7, 10.0.0.1', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const ASK = { action: 'ask', question: '  Ông bà xưa   chăm cây mai thế nào? ', lang: 'vi' };

// ---------------------------------------------------------------------------
// ask
// ---------------------------------------------------------------------------

Deno.test('answer path: embeds the question, matches, answers from numbered sources with valid citations only', async () => {
  const { deps, log } = setup();
  const res = await handle(post(ASK), deps);
  assert.equal(res.status, 200);
  const body = KnowledgeAskResponse.parse(await res.json());
  assert.equal(body.reason, null);
  // [7] does not exist → dropped; [1] kept.
  assert.equal(body.answer, 'Theo lời kể của ông Tư, nên tuốt lá vào rằm tháng Chạp [1]. Đừng tuốt khi cây yếu [1].');
  assert.deepEqual(body.cited, [1]);
  assert.deepEqual(body.sources.map((s) => [s.id, s.kind, s.topic_slug, s.narrator_label]), [
    [ITEM_A, 'experience', 'lam-vuon', 'Ông Tư (Bến Tre)'],
    [ITEM_B, 'story', 'lam-vuon', 'Ông Tư (Bến Tre)'],
  ]);
  assert.equal(body.sources[0]!.similarity, 0.812);

  assert.deepEqual(log.embedCalls, [{ task: 'RETRIEVAL_QUERY', texts: ['Ông bà xưa chăm cây mai thế nào?'] }]);
  assert.deepEqual(log.matchArgs, { limit: MATCH_LIMIT, min: 0.55 });
  assert.equal(log.answerCalls.length, 1);
  assert.equal(log.answerCalls[0]!.lang, 'vi');
  assert.equal(log.answerCalls[0]!.sources.length, 2);
  assert.deepEqual(log.aiCfg, { apiKey: 'test-key', model: 'gemini-3.8-flash', embedModel: 'gemini-embedding-001', timeoutMs: 25_000 });
});

Deno.test('no sources above the similarity floor: no Gemini answer call, reason no_sources', async () => {
  const { deps, log } = setup({ matches: [] });
  const res = await handle(post(ASK), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { answer: null, cited: [], sources: [], reason: 'no_sources' });
  assert.equal(log.answerCalls.length, 0);
});

Deno.test('sources that do not answer (or an uncited answer) are never shown: reason not_in_sources', async () => {
  const a = setup({ answer: () => Promise.resolve({ answered: false, answer: 'Các lời kể chưa nói tới điều này.', cited: [] }) });
  const ra = KnowledgeAskResponse.parse(await (await handle(post(ASK), a.deps)).json());
  assert.equal(ra.answer, null);
  assert.equal(ra.reason, 'not_in_sources');
  assert.equal(ra.sources.length, 2);

  const b = setup({ answer: () => Promise.resolve({ answered: true, answer: 'Cây mai cần nhiều nắng.', cited: [1] }) });
  const rb = KnowledgeAskResponse.parse(await (await handle(post(ASK), b.deps)).json());
  assert.equal(rb.answer, null);
  assert.equal(rb.reason, 'not_in_sources');
});

Deno.test('lazy embedding: rows without an embedding are embedded (RETRIEVAL_DOCUMENT) before searching', async () => {
  const { deps, log, w } = setup({ unembedded: pending(25) });
  const res = await handle(post(ASK), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(log.listLimits, [LAZY_EMBED_LIMIT]);
  assert.equal(log.embedCalls[1]!.task, 'RETRIEVAL_DOCUMENT');
  assert.equal(log.embedCalls[1]!.texts.length, LAZY_EMBED_LIMIT);
  assert.equal(log.embedCalls[1]!.texts[0], 'Tiêu đề 0\nTóm tắt 0\nNội dung 0\nBước 0');
  assert.equal(log.saved.length, LAZY_EMBED_LIMIT);
  assert.ok(log.saved.every((s) => s.dims === 768 && s.at === new Date(NOW).toISOString()));
  assert.equal(w.unembedded.length, 5);
});

Deno.test('lazy embedding failure does not fail the question', async () => {
  const { deps, log } = setup({
    unembedded: pending(3),
    embed: (texts, task) =>
      task === 'RETRIEVAL_DOCUMENT' ? Promise.reject(new GeminiError('unavailable', 503)) : Promise.resolve(texts.map(vec)),
  });
  const res = await handle(post(ASK), deps);
  assert.equal(res.status, 200);
  assert.equal(log.saved.length, 0);
  assert.equal(log.answerCalls.length, 1);
});

Deno.test('rate limit: 11th question per minute from one IP → 429 quota_exceeded; another IP is still served', async () => {
  const { deps, log } = setup();
  for (let i = 0; i < 10; i++) assert.equal((await handle(post(ASK), deps)).status, 200);
  const res = await handle(post(ASK), deps);
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.error, 'quota_exceeded');
  assert.equal(body.scope, 'ip');
  assert.equal(body.retry_after_s, 60);
  assert.equal(log.embedCalls.length, 10);
  const other = await handle(post(ASK, { 'cf-connecting-ip': '198.51.100.2' }), deps);
  assert.equal(other.status, 200);
});

Deno.test('global daily cap → 429 quota_exceeded scope global', async () => {
  const { deps } = setup({ dailyCap: 1 });
  assert.equal((await handle(post(ASK), deps)).status, 200);
  const res = await handle(post(ASK, { 'x-forwarded-for': '192.0.2.9' }), deps);
  assert.equal(res.status, 429);
  assert.equal((await res.json()).scope, 'global');
});

Deno.test('bad input: 400 bad_request without any AI call or rate-limit hit', async () => {
  const { deps, log } = setup({ ratePerMin: 1 });
  const bad = [
    { action: 'ask', question: 'ab', lang: 'vi' },
    { action: 'ask', question: '   a  ', lang: 'vi' },
    { action: 'ask', question: 'x'.repeat(301), lang: 'vi' },
    { action: 'ask', question: 'Kho cá thế nào?', lang: 'fr' },
    { action: 'ask' },
    { action: 'nope' },
    'not json',
  ];
  for (const b of bad) {
    const res = await handle(post(b), deps);
    assert.equal(res.status, 400, JSON.stringify(b));
    assert.equal((await res.json()).error, 'bad_request');
  }
  assert.equal((await handle(new Request('http://x', { method: 'GET' }), deps)).status, 400);
  assert.equal(log.embedCalls.length, 0);
  // the single allowed question is still available
  assert.equal((await handle(post(ASK), deps)).status, 200);
});

Deno.test('Gemini failures map to ai_unavailable; missing key is ai_unavailable before any call', async () => {
  const a = setup({ embed: () => Promise.reject(new GeminiError('timeout')) });
  assert.equal((await handle(post(ASK), a.deps)).status, 503);
  const b = setup({ answer: () => Promise.reject(new GeminiError('rate_limited', 429)) });
  const rb = await handle(post(ASK), b.deps);
  assert.equal(rb.status, 503);
  assert.equal((await rb.json()).error, 'ai_unavailable');
  const c = setup({ answer: () => Promise.resolve({ nope: true }) });
  assert.equal((await handle(post(ASK), c.deps)).status, 503);
  const d = setup({ env: {} });
  assert.equal((await handle(post(ASK), d.deps)).status, 503);
  assert.equal(d.log.embedCalls.length, 0);
});

Deno.test('unexpected database failure → 500 internal', async () => {
  const { deps } = setup();
  const db = deps.db();
  deps.db = () => ({ ...db, match: () => Promise.reject(new Error('boom')) });
  const res = await handle(post(ASK), deps);
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'internal');
});

Deno.test('env overrides: models, similarity floor, timeout', async () => {
  const { deps, log } = setup({
    env: {
      GEMINI_API_KEY: 'k',
      GEMINI_MODEL: 'gemini-x',
      GEMINI_EMBED_MODEL: 'embed-y',
      KNOWLEDGE_MIN_SIMILARITY: '0.7',
      KNOWLEDGE_TIMEOUT_MS: '5000',
    },
  });
  await handle(post({ ...ASK, lang: 'en' }), deps);
  assert.deepEqual(log.aiCfg, { apiKey: 'k', model: 'gemini-x', embedModel: 'embed-y', timeoutMs: 5000 });
  assert.equal(log.matchArgs!.min, 0.7);
  assert.equal(log.answerCalls[0]!.lang, 'en');
});

Deno.test('CORS preflight', async () => {
  const { deps } = setup();
  const res = await handle(new Request('http://x', { method: 'OPTIONS' }), deps);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

// ---------------------------------------------------------------------------
// reindex
// ---------------------------------------------------------------------------

const REINDEX = { action: 'reindex' };

Deno.test('reindex: admin embeds every row without an embedding (max 200 per call) and reports counts', async () => {
  const { deps, log } = setup({ unembedded: pending(230) });
  const res = await handle(post(REINDEX, { authorization: 'Bearer admin-jwt' }), deps);
  assert.equal(res.status, 200);
  const body = KnowledgeReindexResponse.parse(await res.json());
  assert.deepEqual(body, { embedded: REINDEX_LIMIT, failed: 0, remaining: 30 });
  assert.deepEqual(log.adminTokens, ['admin-jwt']);
  assert.deepEqual(log.listLimits, [REINDEX_LIMIT]);
  assert.ok(log.embedCalls.every((c) => c.task === 'RETRIEVAL_DOCUMENT' && c.texts.length <= 50));
});

Deno.test('reindex: forbidden for a signed-in non-admin, unauthorized without a valid session', async () => {
  const a = setup({ admin: 'not_admin', unembedded: pending(2) });
  const ra = await handle(post(REINDEX, { authorization: 'Bearer user-jwt' }), a.deps);
  assert.equal(ra.status, 403);
  assert.equal((await ra.json()).error, 'forbidden');
  assert.equal(a.log.embedCalls.length, 0);

  const b = setup({ admin: 'invalid' });
  assert.equal((await handle(post(REINDEX, { authorization: 'Bearer sb_publishable_x' }), b.deps)).status, 401);
  const c = setup();
  assert.equal((await handle(post(REINDEX), c.deps)).status, 401);
  assert.equal(c.log.adminTokens.length, 0);
});

Deno.test('reindex: everything failing upstream → 503 ai_unavailable with counts', async () => {
  const { deps } = setup({ unembedded: pending(3), embed: () => Promise.reject(new GeminiError('unavailable', 503)) });
  const res = await handle(post(REINDEX, { authorization: 'Bearer admin-jwt' }), deps);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error, 'ai_unavailable');
  assert.equal(body.failed, 3);
  assert.equal(body.remaining, 3);
});
