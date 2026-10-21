// question-tts: reads one storytelling question aloud with a Gemini TTS voice and returns audio/wav.
// Every side effect (auth, quota, Gemini, usage log, clock, env) arrives through `deps`, so
// handler_test.ts drives the whole flow with fakes. The cache lives in the isolate (index.ts).
import { z } from 'zod';
import { CORS_HEADERS, preflight } from '../_shared/cors.ts';
import { fail, readLimited } from '../_shared/http.ts';
import type { Lru } from './lib/lru.ts';
import { type TtsConfig, TtsError, type TtsModel } from './lib/tts.ts';
import { GEMINI_PCM, pcmToWav } from './lib/wav.ts';

export const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
/** A warm, gentle prebuilt voice. Override with GEMINI_TTS_VOICE. */
export const DEFAULT_TTS_VOICE = 'Sulafat';
export const DEFAULT_TTS_DAILY_LIMIT = 60;
export const DEFAULT_TTS_TIMEOUT_MS = 30_000;
export const MAX_TEXT_CHARS = 400;
export const CACHE_MAX_ENTRIES = 50;
/** Rough ceiling for the isolate cache (≈ 50 questions of 10–15 s at 48 kB/s). */
export const CACHE_MAX_BYTES = 40 * 1024 * 1024;
/** The same question always sounds the same: browsers may keep it for a day. */
export const CACHE_CONTROL = 'private, max-age=86400';
const BODY_MAX_BYTES = 4 * 1024;

export const TtsRequest = z.object({
  text: z.string().transform((s) => s.replace(/\s+/g, ' ').trim()).pipe(z.string().min(1).max(MAX_TEXT_CHARS)),
  lang: z.enum(['vi', 'en']),
});

export interface UsageLog {
  user_id: string;
  action: string;
  model: string;
  status: string;
  latency_ms: number;
  input_bytes: number;
}

export interface HandlerDeps {
  env: (k: string) => string | undefined;
  now: () => number;
  /** The caller's user id from their JWT (anonymous narrator sessions count), or null. */
  verifyUser: (jwt: string) => Promise<string | null>;
  quotaConsume: (userId: string, limit: number) => Promise<boolean>;
  quotaRefund: (userId: string) => Promise<void>;
  /** ai_usage row (metadata only, never the text). Best effort. */
  logUsage: (row: UsageLog) => Promise<void>;
  tts: (cfg: TtsConfig) => TtsModel;
  /** WAV bytes by sha256(lang|voice|text). */
  cache: Lru<Uint8Array<ArrayBuffer>>;
}

function intEnv(deps: HandlerDeps, name: string, fallback: number, min: number, max: number): number {
  const raw = deps.env(name)?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

async function quietly(p: () => Promise<unknown>): Promise<void> {
  try {
    await p();
  } catch {
    // best effort
  }
}

export async function cacheKey(lang: string, voice: string, text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${lang}|${voice}|${text}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function audioResponse(wav: Uint8Array<ArrayBuffer>, cache: 'hit' | 'miss'): Response {
  return new Response(wav, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Expose-Headers': 'x-tts-cache',
      'Content-Type': 'audio/wav',
      'Content-Length': String(wav.byteLength),
      'Cache-Control': CACHE_CONTROL,
      'x-tts-cache': cache,
    },
  });
}

export async function handle(req: Request, deps: HandlerDeps): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('bad_request');

  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')?.trim() ?? '');
  if (!m) return fail('unauthorized');
  let userId: string | null;
  try {
    userId = await deps.verifyUser(m[1]!);
  } catch {
    userId = null;
  }
  if (!userId) return fail('unauthorized');

  const raw = await readLimited(req, BODY_MAX_BYTES);
  if (raw === null) return fail('bad_request');
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('bad_request');
  }
  const parsed = TtsRequest.safeParse(body);
  if (!parsed.success) return fail('bad_request');
  const { text, lang } = parsed.data;

  const apiKey = deps.env('GEMINI_API_KEY')?.trim();
  if (!apiKey) return fail('ai_unavailable');
  const model = deps.env('GEMINI_TTS_MODEL')?.trim() || DEFAULT_TTS_MODEL;
  const voice = deps.env('GEMINI_TTS_VOICE')?.trim() || DEFAULT_TTS_VOICE;

  // Repeated questions are free: no quota, no Gemini call.
  const key = await cacheKey(lang, voice, text);
  const cached = deps.cache.get(key);
  if (cached) return audioResponse(cached, 'hit');

  const limit = intEnv(deps, 'TTS_DAILY_LIMIT', DEFAULT_TTS_DAILY_LIMIT, 1, 100_000);
  let allowed: boolean;
  try {
    allowed = await deps.quotaConsume(userId, limit);
  } catch {
    return fail('internal');
  }
  if (!allowed) return fail('quota_exceeded');

  const tts = deps.tts({ apiKey, model, voice, timeoutMs: intEnv(deps, 'GEMINI_TTS_TIMEOUT_MS', DEFAULT_TTS_TIMEOUT_MS, 1_000, 120_000) });
  const started = deps.now();
  const log = (status: string) =>
    quietly(() =>
      deps.logUsage({
        user_id: userId,
        action: 'question_tts',
        model,
        status,
        latency_ms: Math.max(0, deps.now() - started),
        input_bytes: new TextEncoder().encode(text).byteLength,
      })
    );

  try {
    const audio = await tts.synthesize(text, lang);
    const wav = audio.wav ? audio.bytes : pcmToWav(audio.bytes, { ...GEMINI_PCM, sampleRate: audio.sampleRate });
    deps.cache.set(key, wav);
    await log('ok');
    return audioResponse(wav, 'miss');
  } catch (e) {
    await log(e instanceof TtsError ? e.kind : 'error');
    await quietly(() => deps.quotaRefund(userId));
    if (!(e instanceof TtsError)) console.error('question-tts failed:', e instanceof Error ? e.name : typeof e);
    return fail('ai_unavailable');
  }
}
