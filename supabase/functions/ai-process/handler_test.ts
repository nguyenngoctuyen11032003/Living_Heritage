import assert from 'node:assert/strict';
import { AiProcessResponse, AiSuggestResponse } from '../_shared/ai-contract.ts';
import { MAX_AUDIO_BYTES } from '../_shared/constants.ts';
import { handle, type HandlerDeps, JOB_KIND, markedUncertain, STALE_JOB_MS } from './handler.ts';
import type { AdminDb, JobRow, RecordingCtx, StoryInsert, UsageRow, UserDb } from './lib/db.ts';
import { type AiModel, type GeminiConfig, GeminiError } from './lib/gemini.ts';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const NOW = Date.UTC(2026, 9, 21, 8, 0, 0);
const USER_ID = '11111111-1111-4111-8111-111111111111';
const RECORDING_ID = '22222222-2222-4222-8222-222222222222';
const NARRATOR_ID = '33333333-3333-4333-8333-333333333333';
const TOPIC_ID = '44444444-4444-4444-8444-444444444444';
const FAMILY_ID = '55555555-5555-4555-8555-555555555555';
const JOB_ID = '66666666-6666-4666-8666-666666666666';

const RECORDING: RecordingCtx = {
  id: RECORDING_ID,
  storage_path: `${FAMILY_ID}/${NARRATOR_ID}/abc.webm`,
  mime: 'audio/webm;codecs=opus',
  family_id: FAMILY_ID,
  narrator_id: NARRATOR_ID,
  topic_id: TOPIC_ID,
  topic: { vi: 'Làm vườn', en: 'Gardening' },
  question: { vi: 'Ông bà trồng rau thế nào?', en: 'How did you grow vegetables?' },
  question_text: null,
  narrator_lang: null,
};

const TRANSCRIPT = 'Hồi đó tui trồng rau muống ở ao sau nhà [?]. Phải tưới sáng sớm, đừng tưới trưa nắng kẻo rau héo.';

const DRAFT = {
  story: { title: '  Vườn rau sau nhà ', body: 'Hồi đó tôi trồng rau muống ở ao sau nhà.' },
  experience: {
    title: 'Trồng rau muống',
    summary: 'Cách trồng và tưới rau muống.',
    fields: {
      skill: 'Trồng rau muống',
      context: '',
      conditions: ['ao sau nhà'],
      steps: ['Tưới sáng sớm.'],
      cautions: ['Đừng tưới trưa nắng.'],
      limits: null,
    },
  },
  topics: ['rau muống', 'làm vườn'],
  uncertain: ['ao sau nhà'],
};

const freshJob = (status: JobRow['status'], extra: Partial<JobRow> = {}): JobRow => ({
  id: JOB_ID,
  status,
  error: null,
  story_ids: [],
  updated_at: new Date(NOW - 30_000).toISOString(),
  ...extra,
});

interface World {
  validToken: boolean;
  recordingVisible: boolean;
  canContribute: boolean;
  narratorVisible: boolean;
  quotaAllowed: boolean;
  audioSize: number;
  audioMissing: boolean;
  existingJob: JobRow | null;
  existingTranscript: boolean;
  approvedTitles: string[];
  /** narrators.lang as readable by the caller (null = unreadable → request lang fallback). */
  narratorLang: 'vi' | 'en' | null;
  env: Record<string, string | undefined>;
  transcribe: () => Promise<string>;
  draft: () => Promise<unknown>;
  suggest: () => Promise<unknown>;
}

interface Log {
  calls: string[];
  jobUpdates: { status: string; error?: string | null; story_ids?: string[] }[];
  stories: StoryInsert[];
  transcripts: { text: string; uncertain: string[] }[];
  usage: UsageRow[];
  geminiCfg: GeminiConfig | null;
  quotaLimit: number | null;
  refunds: number;
  /** Language passed to each Gemini call, in call order (e.g. ['transcribe:en', 'draft:en']). */
  langs: string[];
  count(name: string): number;
}

function setup(over: Partial<World> = {}): { deps: HandlerDeps; log: Log } {
  const w: World = {
    validToken: true,
    recordingVisible: true,
    canContribute: true,
    narratorVisible: true,
    quotaAllowed: true,
    audioSize: 1024,
    audioMissing: false,
    existingJob: null,
    existingTranscript: false,
    approvedTitles: ['Ngày cưới của ông bà', 'Cái giếng làng'],
    narratorLang: null,
    env: { GEMINI_API_KEY: 'test-key' },
    transcribe: () => Promise.resolve(TRANSCRIPT),
    draft: () => Promise.resolve(structuredClone(DRAFT)),
    suggest: () => Promise.resolve({ questions: [' Ông nhớ mùa gặt nào nhất? ', 'Ai dạy ông cấy lúa?', 'Ruộng nhà mình ở đâu?', 'Thêm?'] }),
    ...over,
  };
  const log: Log = {
    calls: [],
    jobUpdates: [],
    stories: [],
    transcripts: [],
    usage: [],
    geminiCfg: null,
    quotaLimit: null,
    refunds: 0,
    langs: [],
    count: (name) => log.calls.filter((c) => c === name).length,
  };
  const note = (name: string) => log.calls.push(name);

  const userDb: UserDb = {
    getUserId: () => Promise.resolve(w.validToken ? USER_ID : null),
    getRecording: (id) =>
      Promise.resolve(w.recordingVisible && id === RECORDING_ID ? { ...RECORDING, narrator_lang: w.narratorLang } : null),
    canContribute: (familyId, narratorId) => {
      assert.equal(familyId, FAMILY_ID);
      assert.equal(narratorId, NARRATOR_ID);
      return Promise.resolve(w.canContribute);
    },
    getNarrator: (id) =>
      Promise.resolve(w.narratorVisible && id === NARRATOR_ID ? { id, family_id: FAMILY_ID, lang: w.narratorLang } : null),
    getTopic: (id) => Promise.resolve(id === TOPIC_ID ? { vi: 'Làm vườn', en: 'Gardening' } : null),
    recentApprovedTitles: (_id, limit) => Promise.resolve(w.approvedTitles.slice(0, limit)),
  };

  let storySeq = 0;
  const adminDb: AdminDb = {
    getOrCreateJob: (recordingId, kind, userId) => {
      note('getOrCreateJob');
      assert.equal(recordingId, RECORDING_ID);
      assert.equal(kind, JOB_KIND);
      assert.equal(userId, USER_ID);
      return Promise.resolve(w.existingJob ? { job: w.existingJob, created: false } : { job: freshJob('queued'), created: true });
    },
    restartJob: () => {
      note('restartJob');
      return Promise.resolve(true);
    },
    updateJob: (id, patch) => {
      assert.equal(id, JOB_ID);
      log.jobUpdates.push(patch);
      return Promise.resolve();
    },
    quotaConsume: (userId, limit) => {
      note('quotaConsume');
      assert.equal(userId, USER_ID);
      log.quotaLimit = limit;
      return Promise.resolve(w.quotaAllowed);
    },
    quotaRefund: (userId) => {
      assert.equal(userId, USER_ID);
      log.refunds++;
      return Promise.resolve();
    },
    downloadAudio: (path, maxBytes) => {
      note('downloadAudio');
      assert.equal(path, RECORDING.storage_path);
      if (w.audioMissing) return Promise.resolve({ ok: false, reason: 'missing' });
      if (w.audioSize > maxBytes) return Promise.resolve({ ok: false, reason: 'too_large' });
      return Promise.resolve({ ok: true, bytes: new Uint8Array(w.audioSize) });
    },
    latestTranscript: () => Promise.resolve(w.existingTranscript ? { id: 't0', version: 1, text: TRANSCRIPT } : null),
    insertTranscript: (_rid, text, uncertain, userId) => {
      assert.equal(userId, USER_ID);
      log.transcripts.push({ text, uncertain });
      return Promise.resolve({ id: 't1', version: 1, text });
    },
    setTranscriptUncertain: () => Promise.resolve(),
    insertStories: (rows) => {
      log.stories.push(...rows);
      return Promise.resolve(rows.map(() => `77777777-7777-4777-8777-77777777777${storySeq++}`));
    },
    logUsage: (row) => {
      log.usage.push(row);
      return Promise.resolve();
    },
  };

  const model = (cfg: GeminiConfig): AiModel => {
    log.geminiCfg = cfg;
    return {
      model: cfg.model,
      transcribe: async (audio, mime, lang) => {
        note('gemini.transcribe');
        log.langs.push(`transcribe:${lang}`);
        assert.equal(audio.byteLength, w.audioSize);
        assert.equal(mime, RECORDING.mime);
        return { value: await w.transcribe(), usage: { input_tokens: 100, output_tokens: 50 } };
      },
      draft: async (input) => {
        note('gemini.draft');
        log.langs.push(`draft:${input.lang}`);
        assert.equal(input.transcript, TRANSCRIPT);
        assert.equal(input.topic, RECORDING.topic![input.lang]);
        assert.equal(input.question, RECORDING.question![input.lang]);
        return { value: await w.draft(), usage: { input_tokens: 80, output_tokens: 60 } };
      },
      suggest: async (input) => {
        note('gemini.suggest');
        log.langs.push(`suggest:${input.lang}`);
        assert.equal(input.topic, input.lang === 'vi' ? 'Làm vườn' : 'Gardening');
        assert.deepEqual(input.previousTitles, w.approvedTitles.slice(0, 5));
        return { value: await w.suggest(), usage: { input_tokens: 10, output_tokens: 10 } };
      },
    };
  };

  const deps: HandlerDeps = {
    env: (k) => w.env[k],
    now: () => NOW,
    userClient: (jwt) => {
      assert.equal(jwt, 'good-token');
      return userDb;
    },
    adminClient: () => adminDb,
    gemini: model,
  };
  return { deps, log };
}

function post(body: unknown, auth: string | null = 'Bearer good-token'): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (auth) headers.authorization = auth;
  return new Request('http://localhost/ai-process', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const TRANSCRIBE = { action: 'transcribe_and_draft', recording_id: RECORDING_ID };
const SUGGEST = { action: 'suggest_questions', narrator_id: NARRATOR_ID, topic_id: TOPIC_ID };

// ---------------------------------------------------------------------------
// transcribe_and_draft
// ---------------------------------------------------------------------------

Deno.test('success: transcribes, drafts, saves story + experience and returns done with 2 story ids', async () => {
  const { deps, log } = setup({ env: { GEMINI_API_KEY: 'test-key', AI_DAILY_LIMIT: '12' } });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 200);
  const body = AiProcessResponse.parse(await res.json());
  assert.equal(body.job_id, JOB_ID);
  assert.equal(body.status, 'done');
  assert.equal(body.error, null);
  assert.equal(body.story_ids.length, 2);

  assert.deepEqual(log.geminiCfg, { apiKey: 'test-key', model: 'gemini-3.8-flash', timeoutMs: 60_000 });
  assert.equal(log.quotaLimit, 12);
  assert.equal(log.refunds, 0);
  assert.deepEqual(log.jobUpdates.map((u) => u.status), ['transcribing', 'drafting', 'done']);
  assert.deepEqual(log.jobUpdates.at(-1)?.story_ids, body.story_ids);

  assert.equal(log.transcripts.length, 1);
  assert.equal(log.transcripts[0]!.text, TRANSCRIPT);
  assert.deepEqual(log.transcripts[0]!.uncertain, ['ao sau nhà [?]']);

  const [story, exp] = log.stories;
  assert.equal(story!.kind, 'story');
  assert.equal(story!.title, 'Vườn rau sau nhà');
  assert.equal(story!.family_id, FAMILY_ID);
  assert.equal(story!.narrator_id, NARRATOR_ID);
  assert.equal(story!.topic_id, TOPIC_ID);
  assert.equal(story!.recording_id, RECORDING_ID);
  assert.equal(story!.lang, 'vi');
  assert.equal(story!.created_by, USER_ID);
  assert.equal(exp!.kind, 'experience');
  assert.equal(exp!.summary, 'Cách trồng và tưới rau muống.');
  assert.deepEqual(exp!.fields, { ...DRAFT.experience.fields, context: null });

  assert.deepEqual(log.usage.map((u) => [u.action, u.status, u.job_id, u.input_bytes]), [
    ['transcribe', 'ok', JOB_ID, 1024],
    ['draft', 'ok', JOB_ID, new TextEncoder().encode(TRANSCRIPT).byteLength],
  ]);
});

Deno.test('success without practical know-how: only the story is saved', async () => {
  const { deps, log } = setup({ draft: () => Promise.resolve({ ...structuredClone(DRAFT), experience: null }) });
  const res = await handle(post({ ...TRANSCRIBE, lang: 'en' }), deps);
  const body = AiProcessResponse.parse(await res.json());
  assert.equal(body.story_ids.length, 1);
  assert.deepEqual(log.stories.map((s) => [s.kind, s.lang]), [['story', 'en']]);
});

Deno.test('narrator language wins over the request lang: an English-speaking narrator, Vietnamese UI', async () => {
  const { deps, log } = setup({ narratorLang: 'en' });
  const res = await handle(post({ ...TRANSCRIBE, lang: 'vi' }), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(log.langs, ['transcribe:en', 'draft:en']);
  assert.deepEqual(log.stories.map((s) => [s.kind, s.lang]), [['story', 'en'], ['experience', 'en']]);
});

Deno.test('narrator language vi overrides an English UI request', async () => {
  const { deps, log } = setup({ narratorLang: 'vi' });
  await handle(post({ ...TRANSCRIBE, lang: 'en' }), deps);
  assert.deepEqual(log.langs, ['transcribe:vi', 'draft:vi']);
  assert.ok(log.stories.every((s) => s.lang === 'vi'));
});

Deno.test('narrator language unreadable: the request lang is the fallback', async () => {
  const { deps, log } = setup({ narratorLang: null });
  await handle(post({ ...TRANSCRIBE, lang: 'en' }), deps);
  assert.deepEqual(log.langs, ['transcribe:en', 'draft:en']);
});

Deno.test('quota_exceeded: 429, job marked error, Gemini never called, no refund', async () => {
  const { deps, log } = setup({ quotaAllowed: false });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.error, 'quota_exceeded');
  assert.equal(body.job_id, JOB_ID);
  assert.equal(body.status, 'error');
  assert.equal(log.count('gemini.transcribe'), 0);
  assert.equal(log.count('downloadAudio'), 0);
  assert.equal(log.refunds, 0);
  assert.deepEqual(log.jobUpdates, [{ status: 'error', error: 'quota_exceeded', story_ids: [] }]);
});

Deno.test('Gemini failure: quota refunded, job error ai_unavailable, recording untouched', async () => {
  const { deps, log } = setup({ transcribe: () => Promise.reject(new GeminiError('unavailable', 500)) });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 503);
  const body = AiProcessResponse.parse(await res.json());
  assert.equal(body.status, 'error');
  assert.equal(body.error, 'ai_unavailable');
  assert.equal(log.refunds, 1);
  assert.deepEqual(log.jobUpdates.at(-1), { status: 'error', error: 'ai_unavailable: gemini unavailable 500', story_ids: [] });
  assert.equal(log.stories.length, 0);
  assert.deepEqual(log.usage.map((u) => [u.action, u.status]), [['transcribe', 'unavailable']]);
});

Deno.test('draft that does not match AiDraft: refund + ai_unavailable, transcript kept for the retry', async () => {
  const { deps, log } = setup({ draft: () => Promise.resolve({ story: { title: 'x' } }) });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'ai_unavailable');
  assert.equal(log.refunds, 1);
  assert.equal(log.transcripts.length, 1);
  assert.equal(log.stories.length, 0);
});

Deno.test('retry after an error job: restarts and reuses the saved transcript (no second transcription)', async () => {
  const { deps, log } = setup({ existingJob: freshJob('error', { error: 'ai_unavailable' }), existingTranscript: true });
  const res = await handle(post(TRANSCRIBE), deps);
  const body = AiProcessResponse.parse(await res.json());
  assert.equal(body.status, 'done');
  assert.equal(log.count('restartJob'), 1);
  assert.equal(log.count('downloadAudio'), 0);
  assert.equal(log.count('gemini.transcribe'), 0);
  assert.equal(log.count('gemini.draft'), 1);
});

Deno.test('recording not visible under RLS: 404 not_found, no job, no quota', async () => {
  const { deps, log } = setup({ recordingVisible: false });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'not_found');
  assert.equal(log.count('getOrCreateJob'), 0);
  assert.equal(log.count('quotaConsume'), 0);
});

Deno.test('reader without edit rights (e.g. viewer of a shared story): 403 forbidden, no job, no quota', async () => {
  const { deps, log } = setup({ canContribute: false });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'forbidden');
  assert.equal(log.count('getOrCreateJob'), 0);
  assert.equal(log.count('quotaConsume'), 0);
});

Deno.test('duplicate call while in progress returns the existing job without calling Gemini', async () => {
  const { deps, log } = setup({ existingJob: freshJob('transcribing') });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 200);
  const body = AiProcessResponse.parse(await res.json());
  assert.deepEqual(body, { job_id: JOB_ID, status: 'transcribing', story_ids: [], error: null });
  assert.equal(log.count('quotaConsume'), 0);
  assert.equal(log.count('gemini.transcribe') + log.count('gemini.draft'), 0);
  assert.equal(log.jobUpdates.length, 0);
});

Deno.test('call for a done job returns its story ids', async () => {
  const ids = ['88888888-8888-4888-8888-888888888881', '88888888-8888-4888-8888-888888888882'];
  const { deps, log } = setup({ existingJob: freshJob('done', { story_ids: ids }) });
  const body = AiProcessResponse.parse(await (await handle(post(TRANSCRIBE), deps)).json());
  assert.deepEqual(body, { job_id: JOB_ID, status: 'done', story_ids: ids, error: null });
  assert.equal(log.count('quotaConsume'), 0);
});

Deno.test('stale in-progress job (isolate died) is restarted', async () => {
  const { deps, log } = setup({ existingJob: freshJob('drafting', { updated_at: new Date(NOW - STALE_JOB_MS - 1).toISOString() }) });
  const body = AiProcessResponse.parse(await (await handle(post(TRANSCRIBE), deps)).json());
  assert.equal(body.status, 'done');
  assert.equal(log.count('restartJob'), 1);
});

Deno.test('audio_too_large: 413, refund, job error, Gemini never called', async () => {
  const { deps, log } = setup({ audioSize: MAX_AUDIO_BYTES + 1 });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 413);
  const body = AiProcessResponse.parse(await res.json());
  assert.equal(body.error, 'audio_too_large');
  assert.equal(log.refunds, 1);
  assert.equal(log.count('gemini.transcribe'), 0);
  assert.deepEqual(log.jobUpdates.at(-1), { status: 'error', error: 'audio_too_large', story_ids: [] });
});

Deno.test('audio missing from storage: not_found with refund', async () => {
  const { deps, log } = setup({ audioMissing: true });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 404);
  assert.equal(log.refunds, 1);
});

Deno.test('invalid body: 400 bad_request', async () => {
  for (const body of ['not json', { action: 'transcribe_and_draft', recording_id: 'nope' }, { action: 'other' }, {}]) {
    const { deps, log } = setup();
    const res = await handle(post(body), deps);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal((await res.json()).error, 'bad_request');
    assert.equal(log.count('getOrCreateJob'), 0);
  }
});

Deno.test('missing / invalid Authorization: 401 unauthorized', async () => {
  for (const auth of [null, 'Basic abc']) {
    const { deps } = setup();
    const res = await handle(post(TRANSCRIBE, auth), deps);
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'unauthorized');
  }
  const { deps } = setup({ validToken: false });
  assert.equal((await handle(post(TRANSCRIBE), deps)).status, 401);
});

Deno.test('missing GEMINI_API_KEY: 503 ai_unavailable before any quota is used', async () => {
  const { deps, log } = setup({ env: {} });
  const res = await handle(post(TRANSCRIBE), deps);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'ai_unavailable');
  assert.equal(log.count('quotaConsume'), 0);
});

Deno.test('GEMINI_MODEL / GEMINI_TIMEOUT_MS are honoured', async () => {
  const { deps, log } = setup({ env: { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-x', GEMINI_TIMEOUT_MS: '90000' } });
  await handle(post(TRANSCRIBE), deps);
  assert.deepEqual(log.geminiCfg, { apiKey: 'k', model: 'gemini-x', timeoutMs: 90_000 });
});

Deno.test('CORS preflight', async () => {
  const { deps } = setup();
  const res = await handle(new Request('http://localhost/ai-process', { method: 'OPTIONS' }), deps);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
});

// ---------------------------------------------------------------------------
// suggest_questions
// ---------------------------------------------------------------------------

Deno.test('suggest_questions: 3 trimmed questions, quota consumed, usage logged', async () => {
  const { deps, log } = setup();
  const res = await handle(post(SUGGEST), deps);
  assert.equal(res.status, 200);
  const body = AiSuggestResponse.parse(await res.json());
  assert.deepEqual(body.questions, ['Ông nhớ mùa gặt nào nhất?', 'Ai dạy ông cấy lúa?', 'Ruộng nhà mình ở đâu?']);
  assert.equal(log.count('quotaConsume'), 1);
  assert.deepEqual(log.usage.map((u) => u.action), ['suggest_questions']);
});

Deno.test("suggest_questions: asked in the narrator's language, request lang only as fallback", async () => {
  const a = setup({ narratorLang: 'en' });
  await handle(post({ ...SUGGEST, lang: 'vi' }), a.deps);
  assert.deepEqual(a.log.langs, ['suggest:en']);
  const b = setup({ narratorLang: null });
  await handle(post({ ...SUGGEST, lang: 'en' }), b.deps);
  assert.deepEqual(b.log.langs, ['suggest:en']);
});

Deno.test('suggest_questions: narrator not visible ⇒ not_found, no quota', async () => {
  const { deps, log } = setup({ narratorVisible: false });
  const res = await handle(post(SUGGEST), deps);
  assert.equal(res.status, 404);
  assert.equal(log.count('quotaConsume'), 0);
});

Deno.test('suggest_questions: viewer without edit rights ⇒ forbidden', async () => {
  const { deps, log } = setup({ canContribute: false });
  const res = await handle(post(SUGGEST), deps);
  assert.equal(res.status, 403);
  assert.equal(log.count('quotaConsume'), 0);
});

Deno.test('suggest_questions: Gemini failure ⇒ refund + ai_unavailable', async () => {
  const { deps, log } = setup({ suggest: () => Promise.reject(new GeminiError('timeout')) });
  const res = await handle(post(SUGGEST), deps);
  assert.equal(res.status, 503);
  assert.equal(log.refunds, 1);
});

Deno.test('suggest_questions: quota_exceeded', async () => {
  const { deps, log } = setup({ quotaAllowed: false });
  const res = await handle(post(SUGGEST), deps);
  assert.equal(res.status, 429);
  assert.equal(log.count('gemini.suggest'), 0);
});

Deno.test('markedUncertain picks the words before each [?]', () => {
  assert.deepEqual(markedUncertain('Ông tôi tên là Tư [?] ở làng [?]. Không có gì.'), ['tên là Tư [?]', 'ở làng [?]']);
  assert.deepEqual(markedUncertain('không có dấu'), []);
});
