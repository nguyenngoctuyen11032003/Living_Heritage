// Spec 1 §8: the ai-process pipeline. Every side effect (database, storage, Gemini, clock, env)
// arrives through `deps`, so handler_test.ts drives the whole flow with fakes.
import { z } from 'zod';
import { AiDraft, AiErrorCode, AiRequest } from '../_shared/ai-contract.ts';
import { MAX_AUDIO_BYTES } from '../_shared/constants.ts';
import { preflight } from '../_shared/cors.ts';
import { fail, json, readLimited } from '../_shared/http.ts';
import type { AdminDb, JobRow, RecordingCtx, StoryInsert, UserDb } from './lib/db.ts';
import { type AiModel, type GeminiConfig, GeminiError, type GenResult } from './lib/gemini.ts';
import type { Lang } from './lib/prompts.ts';

export interface HandlerDeps {
  env: (k: string) => string | undefined;
  now: () => number;
  /** Data access as the caller (anon key + the caller's JWT, under RLS). */
  userClient: (jwt: string) => UserDb;
  /** service_role data access, used only after access was proven with userClient. */
  adminClient: () => AdminDb;
  /** Gemini model bound to the config (the real one shares the isolate's circuit breaker). */
  gemini: (cfg: GeminiConfig) => AiModel;
}

/** ai_jobs.kind for this action (idempotency key: recording_id + kind). */
export const JOB_KIND = 'transcribe_and_draft';
/** An in-progress job not touched for this long is considered dead (isolate killed) and may be restarted. */
export const STALE_JOB_MS = 15 * 60_000;
export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const DEFAULT_DAILY_LIMIT = 30;
export const DEFAULT_TIMEOUT_MS = 90_000;
const BODY_MAX_BYTES = 8 * 1024;
const TITLE_MAX = 120;
const SUGGEST_COUNT = 3;
const PREVIOUS_TITLES = 5;

type Req = z.output<typeof AiRequest>;
type Draft = z.infer<typeof AiDraft>;

/** A failure with a known contract code, raised inside the pipeline. */
class Failure extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, detail = '') {
    super(detail || code);
    this.code = code;
  }
}

function codeOf(e: unknown): AiErrorCode {
  if (e instanceof Failure) return e.code;
  if (e instanceof GeminiError) return 'ai_unavailable';
  return 'internal';
}

function intEnv(deps: HandlerDeps, name: string, fallback: number, min: number, max: number): number {
  const raw = deps.env(name)?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function jobBody(job_id: string, status: JobRow['status'], story_ids: string[], error: AiErrorCode | null) {
  return { job_id, status, story_ids, error };
}

/** Existing job → response body (an unknown stored error text maps to `internal`). */
function existingJobBody(job: JobRow) {
  const code = AiErrorCode.safeParse(job.error);
  return jobBody(job.id, job.status, job.story_ids, job.status === 'error' ? (code.success ? code.data : 'internal') : null);
}

async function quietly(p: () => Promise<unknown>): Promise<void> {
  try {
    await p();
  } catch {
    // best effort (cleanup after a failure must not hide the original error)
  }
}

/** Words just before each `[?]` marker in a transcript (up to three words: "bà tôi ở Kẻ Chợ [?]" → "ở Kẻ Chợ [?]"). */
export function markedUncertain(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(?:[^\s[\]]+\s+){0,2}[^\s[\]]*\s*\[\?\]/gu)) {
    const s = m[0].trim();
    if (s) out.add(s);
    if (out.size >= 50) break;
  }
  return [...out];
}

const clean = (s: string, max = 20_000) => s.trim().slice(0, max);
const cleanList = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter((x) => x !== ''))];
const orNull = (s: string | null) => (s === null || s.trim() === '' ? null : s.trim());

/** Trims the model output; an experience without a named skill is dropped (nothing practical was told). */
export function normalizeDraft(d: Draft): Draft {
  const exp = d.experience;
  return {
    story: { title: clean(d.story.title, TITLE_MAX), body: clean(d.story.body, 100_000) },
    experience: exp && exp.fields.skill.trim() !== ''
      ? {
        title: clean(exp.title, TITLE_MAX) || clean(exp.fields.skill, TITLE_MAX),
        summary: clean(exp.summary, 2_000),
        fields: {
          skill: clean(exp.fields.skill, 500),
          context: orNull(exp.fields.context),
          conditions: cleanList(exp.fields.conditions),
          steps: exp.fields.steps.map((s) => s.trim()).filter((s) => s !== ''),
          cautions: cleanList(exp.fields.cautions),
          limits: orNull(exp.fields.limits),
        },
      }
      : null,
    topics: cleanList(d.topics).slice(0, 5),
    uncertain: cleanList(d.uncertain).slice(0, 50),
  };
}

interface Ctx {
  deps: HandlerDeps;
  user: UserDb;
  userId: string;
  model: AiModel;
}

/** Runs one Gemini call and logs it to ai_usage (best effort; metadata only, never content). */
async function tracked<T>(
  ctx: Ctx,
  admin: AdminDb,
  call: { action: string; jobId: string | null; inputBytes: number },
  run: () => Promise<GenResult<T>>,
): Promise<T> {
  const started = ctx.deps.now();
  const log = (status: string) =>
    quietly(() =>
      admin.logUsage({
        user_id: ctx.userId,
        job_id: call.jobId,
        action: call.action,
        model: ctx.model.model,
        status,
        latency_ms: Math.max(0, ctx.deps.now() - started),
        input_bytes: call.inputBytes,
      })
    );
  try {
    const r = await run();
    await log('ok');
    return r.value;
  } catch (e) {
    // An open breaker never reached Gemini: nothing to log.
    if (!(e instanceof GeminiError && e.kind === 'circuit_open')) await log(e instanceof GeminiError ? e.kind : 'error');
    throw e;
  }
}

const utf8Bytes = (s: string) => new TextEncoder().encode(s).byteLength;

async function transcribeAndDraft(ctx: Ctx, req: Extract<Req, { action: 'transcribe_and_draft' }>): Promise<Response> {
  const { deps, user, userId } = ctx;
  const nowIso = () => new Date(deps.now()).toISOString();

  // RLS proves access: a recording the caller cannot see is indistinguishable from a missing one.
  const rec = await user.getRecording(req.recording_id);
  if (!rec) return fail('not_found');
  // Readers of shared stories can see a recording too; only editors / the narrator may run AI on it.
  if (!(await user.canContribute(rec.family_id, rec.narrator_id))) return fail('forbidden');

  const admin = deps.adminClient();
  const { job, created } = await admin.getOrCreateJob(rec.id, JOB_KIND, userId);
  if (!created) {
    if (job.status === 'done') return json(200, existingJobBody(job));
    const inProgress = job.status !== 'error';
    const stale = inProgress && deps.now() - Date.parse(job.updated_at) > STALE_JOB_MS;
    if (inProgress && !stale) return json(200, existingJobBody(job));
    // error (or a dead in-progress job): retry, unless a concurrent call restarted it first.
    if (!(await admin.restartJob(job, nowIso()))) return json(200, jobBody(job.id, 'queued', [], null));
  }

  const limit = intEnv(deps, 'AI_DAILY_LIMIT', DEFAULT_DAILY_LIMIT, 1, 100_000);
  if (!(await admin.quotaConsume(userId, limit))) {
    await quietly(() => admin.updateJob(job.id, { status: 'error', error: 'quota_exceeded', story_ids: [] }, nowIso()));
    return fail('quota_exceeded', jobBody(job.id, 'error', [], 'quota_exceeded'));
  }

  try {
    // The narrator's own language (narrators.lang) decides transcription and drafting; the request lang
    // (the UI language of whoever pressed the button) is only a fallback.
    const storyIds = await runPipeline(ctx, admin, rec, job.id, rec.narrator_lang ?? req.lang, nowIso);
    return json(200, jobBody(job.id, 'done', storyIds, null));
  } catch (e) {
    const code = codeOf(e);
    if (code === 'internal') console.error('ai-process transcribe_and_draft failed:', e instanceof Error ? e.name : typeof e);
    await quietly(() => admin.quotaRefund(userId));
    // Keep the upstream reason for the admin 'AI jobs' tab: 'ai_unavailable: gemini bad_request 400 <message>'.
    const detail = e instanceof GeminiError ? `: gemini ${e.kind}${e.status ? ' ' + e.status : ''}${e.detail ? ' ' + e.detail : ''}` : '';
    if (e instanceof GeminiError && e.detail) console.error(`ai-process gemini ${e.kind}:`, e.status, e.detail);
    await quietly(() => admin.updateJob(job.id, { status: 'error', error: (code + detail).slice(0, 500), story_ids: [] }, nowIso()));
    return fail(code, jobBody(job.id, 'error', [], code));
  }
}

async function runPipeline(
  ctx: Ctx,
  admin: AdminDb,
  rec: RecordingCtx,
  jobId: string,
  lang: Lang,
  nowIso: () => string,
): Promise<string[]> {
  const { model, userId } = ctx;

  // A transcript from an earlier attempt (that failed while drafting) is reused: no second transcription.
  let transcript = await admin.latestTranscript(rec.id);
  if (!transcript) {
    const audio = await admin.downloadAudio(rec.storage_path, MAX_AUDIO_BYTES);
    if (!audio.ok) throw new Failure(audio.reason === 'too_large' ? 'audio_too_large' : 'not_found');
    await admin.updateJob(jobId, { status: 'transcribing' }, nowIso());
    const text = await tracked(
      ctx,
      admin,
      { action: 'transcribe', jobId, inputBytes: audio.bytes.byteLength },
      () => model.transcribe(audio.bytes, rec.mime, lang),
    );
    // No speech in the recording: nothing to draft from.
    if (text.trim() === '') throw new Failure('bad_request', 'empty transcript');
    transcript = await admin.insertTranscript(rec.id, text, markedUncertain(text), userId);
  }

  await admin.updateJob(jobId, { status: 'drafting' }, nowIso());
  const raw = await tracked(ctx, admin, { action: 'draft', jobId, inputBytes: utf8Bytes(transcript.text) }, () =>
    model.draft({
      lang,
      transcript: transcript.text,
      topic: rec.topic ? rec.topic[lang] : null,
      question: rec.question ? rec.question[lang] : rec.question_text,
    }));
  const parsed = AiDraft.safeParse(raw);
  if (!parsed.success) throw new Failure('ai_unavailable', 'draft did not match AiDraft');
  const draft = normalizeDraft(parsed.data);
  if (draft.story.body === '') throw new Failure('ai_unavailable', 'empty story');

  const base = {
    family_id: rec.family_id,
    narrator_id: rec.narrator_id,
    recording_id: rec.id,
    topic_id: rec.topic_id,
    lang,
    created_by: userId,
  };
  const rows: StoryInsert[] = [{
    ...base,
    kind: 'story',
    title: draft.story.title,
    summary: null,
    body: draft.story.body,
    fields: { topics: draft.topics },
  }];
  if (draft.experience) {
    rows.push({
      ...base,
      kind: 'experience',
      title: draft.experience.title,
      summary: draft.experience.summary,
      body: draft.experience.summary,
      fields: draft.experience.fields,
    });
  }
  const ids = await admin.insertStories(rows);

  if (draft.uncertain.length > 0) {
    const merged = cleanList([...markedUncertain(transcript.text), ...draft.uncertain]).slice(0, 100);
    const t = transcript;
    await quietly(() => admin.setTranscriptUncertain(t.id, merged));
  }
  await admin.updateJob(jobId, { status: 'done', error: null, story_ids: ids }, nowIso());
  return ids;
}

const SuggestOut = z.object({ questions: z.array(z.string()) });

async function suggestQuestions(ctx: Ctx, req: Extract<Req, { action: 'suggest_questions' }>): Promise<Response> {
  const { deps, user, userId, model } = ctx;
  const narrator = await user.getNarrator(req.narrator_id);
  if (!narrator) return fail('not_found');
  if (!(await user.canContribute(narrator.family_id, narrator.id))) return fail('forbidden');
  const topic = await user.getTopic(req.topic_id);
  if (!topic) return fail('not_found');
  const titles = await user.recentApprovedTitles(narrator.id, PREVIOUS_TITLES);
  // The questions are put to the narrator: ask them in the narrator's language (request lang as fallback).
  const lang = narrator.lang ?? req.lang;

  const admin = deps.adminClient();
  const limit = intEnv(deps, 'AI_DAILY_LIMIT', DEFAULT_DAILY_LIMIT, 1, 100_000);
  if (!(await admin.quotaConsume(userId, limit))) return fail('quota_exceeded');

  try {
    const raw = await tracked(
      ctx,
      admin,
      { action: 'suggest_questions', jobId: null, inputBytes: 0 },
      () => model.suggest({ lang, topic: topic[lang], previousTitles: titles.slice(0, PREVIOUS_TITLES) }),
    );
    const parsed = SuggestOut.safeParse(raw);
    if (!parsed.success) throw new Failure('ai_unavailable', 'suggest output invalid');
    const questions = cleanList(parsed.data.questions).map((q) => q.slice(0, 300)).slice(0, SUGGEST_COUNT);
    if (questions.length === 0) throw new Failure('ai_unavailable', 'no questions');
    return json(200, { questions });
  } catch (e) {
    const code = codeOf(e);
    if (code === 'internal') console.error('ai-process suggest_questions failed:', e instanceof Error ? e.name : typeof e);
    await quietly(() => admin.quotaRefund(userId));
    return fail(code);
  }
}

export async function handle(req: Request, deps: HandlerDeps): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('bad_request');

  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')?.trim() ?? '');
  if (!m) return fail('unauthorized');
  const user = deps.userClient(m[1]!);
  const userId = await user.getUserId();
  if (!userId) return fail('unauthorized');

  const text = await readLimited(req, BODY_MAX_BYTES);
  if (text === null) return fail('bad_request');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail('bad_request');
  }
  const parsed = AiRequest.safeParse(body);
  if (!parsed.success) return fail('bad_request');

  const apiKey = deps.env('GEMINI_API_KEY')?.trim();
  if (!apiKey) return fail('ai_unavailable');
  const model = deps.gemini({
    apiKey,
    model: deps.env('GEMINI_MODEL')?.trim() || DEFAULT_MODEL,
    timeoutMs: intEnv(deps, 'GEMINI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, 1_000, 400_000),
    ...(deps.env('GEMINI_FALLBACK_MODEL')?.trim() ? { fallbackModel: deps.env('GEMINI_FALLBACK_MODEL')!.trim() } : {}),
    ...(deps.env('GEMINI_TRANSCRIBE_MODEL')?.trim() ? { transcribeModel: deps.env('GEMINI_TRANSCRIBE_MODEL')!.trim() } : {}),
  });

  const ctx: Ctx = { deps, user, userId, model };
  try {
    switch (parsed.data.action) {
      case 'transcribe_and_draft':
        return await transcribeAndDraft(ctx, parsed.data);
      case 'suggest_questions':
        return await suggestQuestions(ctx, parsed.data);
    }
  } catch (e) {
    // Failures before any quota was consumed (RLS reads, job upsert, quota RPC).
    console.error('ai-process failed:', e instanceof Error ? e.name : typeof e);
    return fail(codeOf(e));
  }
}
