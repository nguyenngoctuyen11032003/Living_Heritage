// Gemini generateContent REST client (spec 1 §8). Pure apart from the injected runtime, so retries,
// timeouts and the breaker are unit-tested with a fake fetch. The API key travels only in the
// `x-goog-api-key` header, never in the URL, a log line or an error message.
import type { Breaker } from './breaker.ts';
import {
  DRAFT_SCHEMA,
  type DraftInput,
  draftSystem,
  draftUser,
  type Lang,
  SUGGEST_SCHEMA,
  type SuggestInput,
  suggestSystem,
  suggestUser,
  TRANSCRIBE_SYSTEM,
  transcribeUser,
} from './prompts.ts';

export type GeminiErrorKind =
  | 'circuit_open'
  | 'timeout'
  | 'rate_limited'
  | 'unavailable'
  | 'bad_request'
  | 'blocked'
  | 'network'
  | 'invalid_output';

/** Kinds that say the upstream is unhealthy (they feed the breaker). */
const UPSTREAM: ReadonlySet<GeminiErrorKind> = new Set<GeminiErrorKind>(['timeout', 'rate_limited', 'unavailable', 'network']);

export class GeminiError extends Error {
  kind: GeminiErrorKind;
  status: number | null;
  /** Short upstream error message (Gemini's error.message, never request content), for diagnostics. */
  detail: string | null;

  constructor(kind: GeminiErrorKind, status: number | null = null, detail: string | null = null) {
    super(`gemini ${kind}${status === null ? '' : ` (${status})`}`);
    this.name = 'GeminiError';
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }
}

/** Gemini error bodies look like {error: {message}}; keep a short single-line message. */
export function upstreamDetail(body: string): string | null {
  try {
    const msg = (JSON.parse(body) as { error?: { message?: unknown } }).error?.message;
    return typeof msg === 'string' && msg.trim() ? msg.replace(/\s+/g, ' ').trim().slice(0, 240) : null;
  } catch {
    return null;
  }
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  /** Per-attempt timeout (ms). */
  timeoutMs: number;
  /** Optional second model tried once when the primary stays overloaded (429 / 5xx / network) after all retries. */
  fallbackModel?: string;
  /** Optional dedicated model for transcription (e.g. a speech model); drafting and suggestions use `model`. */
  transcribeModel?: string;
}

export interface GeminiRuntime {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  breaker: Breaker;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface GenResult<T> {
  value: T;
  usage: Usage;
}

/** What the handler needs from the model. JSON results come back unvalidated (the handler runs zod). */
export interface AiModel {
  readonly model: string;
  /** `lang` = the narrator's language, sent as a hint (the transcript stays in the language actually spoken). */
  transcribe(audio: Uint8Array, mime: string | null, lang?: Lang): Promise<GenResult<string>>;
  draft(input: DraftInput): Promise<GenResult<unknown>>;
  suggest(input: SuggestInput): Promise<GenResult<unknown>>;
}

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
/**
 * Retries after the first attempt for 429 / 5xx / network errors (never for timeouts: audio calls are long).
 * Google answers overload ("high demand") with 503 for a few seconds: back off 1s, 2s, 4s (+ jitter) instead of retrying at once.
 */
export const MAX_RETRIES = 3;
export const backoffMs = (retry: number, jitter: number): number => 1_000 * 2 ** retry + Math.floor(jitter * 500);
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const BLOCK_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION']);

/** Base64 without a dependency; chunked so large audio does not overflow the argument limit. */
export function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let s = '';
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

/** `audio/webm;codecs=opus` → `audio/webm`; empty → `audio/webm`. */
export function baseMime(mime: string | null | undefined): string {
  const m = (mime ?? '').split(';')[0]!.trim().toLowerCase();
  return m || 'audio/webm';
}

type GenerateResponse = {
  candidates?: { content?: { parts?: unknown }; finishReason?: unknown }[];
  promptFeedback?: { blockReason?: unknown };
  usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown; thoughtsTokenCount?: unknown };
};

/** Structure of a response that carried no usable text (block reason, finish reason, part kinds). Never includes content. */
export function describeEmpty(res: unknown): string {
  const r = res as GenerateResponse | null;
  const bits: string[] = [];
  const reason = r?.promptFeedback?.blockReason;
  if (typeof reason === 'string') bits.push(`blockReason=${reason.slice(0, 40)}`);
  const cands = Array.isArray(r?.candidates) ? r!.candidates! : [];
  bits.push(`candidates=${cands.length}`);
  const first = cands[0];
  if (typeof first?.finishReason === 'string') bits.push(`finish=${first.finishReason.slice(0, 40)}`);
  const parts = first?.content?.parts;
  if (Array.isArray(parts)) {
    const kinds = parts.map((p) => (p && typeof p === 'object' ? Object.keys(p).sort().join('+') : typeof p));
    bits.push(`parts=[${kinds.slice(0, 6).join(',')}]`);
  } else {
    bits.push('parts=none');
  }
  return bits.join(' ');
}

/** Text of the first candidate (thought parts skipped), or null when blocked / empty. */
export function responseText(res: unknown): string | null {
  const r = res as GenerateResponse | null;
  if (!r || typeof r !== 'object' || r.promptFeedback?.blockReason) return null;
  const first = Array.isArray(r.candidates) ? r.candidates[0] : undefined;
  if (!first) return null;
  if (typeof first.finishReason === 'string' && BLOCK_FINISH_REASONS.has(first.finishReason)) return null;
  const parts = first.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .filter((p) => p && typeof p === 'object' && !(p as { thought?: unknown }).thought)
    .map((p) => String((p as { text?: unknown }).text ?? ''))
    .join('');
  return text.trim() ? text : null;
}

function usageOf(res: unknown): Usage {
  const u = (res as GenerateResponse | null)?.usageMetadata;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return { input_tokens: n(u?.promptTokenCount), output_tokens: n(u?.candidatesTokenCount) + n(u?.thoughtsTokenCount) };
}

type Attempt =
  | { ok: true; text: string; usage: Usage }
  | { ok: false; kind: GeminiErrorKind; status: number | null; retryable: boolean; detail?: string | null };

async function attempt(cfg: GeminiConfig, rt: GeminiRuntime, body: unknown): Promise<Attempt> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    let res: Response;
    let text: string;
    try {
      res = await rt.fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(cfg.model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      text = await res.text();
    } catch {
      return ctrl.signal.aborted
        ? { ok: false, kind: 'timeout', status: null, retryable: false }
        : { ok: false, kind: 'network', status: null, retryable: true };
    }
    if (!res.ok) {
      const status = res.status;
      const detail = upstreamDetail(text);
      if (status === 429) return { ok: false, kind: 'rate_limited', status, retryable: true, detail };
      if (status >= 500) return { ok: false, kind: 'unavailable', status, retryable: RETRYABLE_STATUS.has(status), detail };
      return { ok: false, kind: 'bad_request', status, retryable: false, detail };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, kind: 'unavailable', status: res.status, retryable: false };
    }
    const out = responseText(parsed);
    return out === null
      ? { ok: false, kind: 'blocked', status: res.status, retryable: false, detail: describeEmpty(parsed) }
      : { ok: true, text: out, usage: usageOf(parsed) };
  } finally {
    clearTimeout(timer);
  }
}

/** One logical call: breaker gate, ≤ MAX_RETRIES retries with jittered backoff, breaker bookkeeping. */
export async function generate(cfg: GeminiConfig, rt: GeminiRuntime, body: unknown): Promise<{ text: string; usage: Usage }> {
  if (!rt.breaker.canRequest()) throw new GeminiError('circuit_open');
  for (let retry = 0;; retry++) {
    const r = await attempt(cfg, rt, body);
    if (r.ok) {
      rt.breaker.onSuccess();
      return { text: r.text, usage: r.usage };
    }
    if (!r.retryable || retry >= MAX_RETRIES) {
      rt.breaker.onFailure(UPSTREAM.has(r.kind));
      throw new GeminiError(r.kind, r.status, r.detail ?? null);
    }
    await rt.sleep(backoffMs(retry, rt.random()));
  }
}

/** JSON mode output; tolerates a stray Markdown fence. */
export function parseJson(text: string): unknown {
  const t = text.trim().replace(/^`{3}(?:json)?\s*/i, '').replace(/\s*`{3}$/, '');
  try {
    return JSON.parse(t);
  } catch {
    throw new GeminiError('invalid_output');
  }
}

/**
 * Model-family tuning (latency + stability):
 * - Gemini 3: keep the default temperature (lower values can make it loop) and use a low thinking level.
 * - Gemini 2.5: no thinking budget for these mechanical tasks, keep our temperature.
 */
/** Speech models (transcribe / tts) accept neither thinking settings nor a system instruction. */
export const isSpeechModel = (model: string): boolean => /transcribe|tts/.test(model);

export function tuning(model: string, temperature: number): Record<string, unknown> {
  // Speech models (transcribe / tts) take no thinking settings.
  if (isSpeechModel(model)) return { temperature };
  if (/^gemini-3/.test(model)) return { thinkingConfig: { thinkingLevel: 'low' } };
  if (/^gemini-2.5/.test(model)) return { temperature, thinkingConfig: { thinkingBudget: 0 } };
  return { temperature };
}

/** Kinds that mean "the model is busy", where another model may still answer. */
const BUSY: ReadonlySet<GeminiErrorKind> = new Set<GeminiErrorKind>(['rate_limited', 'unavailable', 'network']);

/** generate() on the primary model; on a busy failure and a configured fallback, one more try on the fallback model. */
export async function generateWithFallback(
  cfg: GeminiConfig,
  rt: GeminiRuntime,
  build: (model: string) => unknown,
): Promise<{ text: string; usage: Usage }> {
  try {
    return await generate(cfg, rt, build(cfg.model));
  } catch (e) {
    const fb = cfg.fallbackModel?.trim();
    if (!(e instanceof GeminiError) || !BUSY.has(e.kind) || !fb || fb === cfg.model) throw e;
    return await generate({ ...cfg, model: fb }, rt, build(fb));
  }
}

export function createGemini(cfg: GeminiConfig, rt: GeminiRuntime): AiModel {
  return {
    model: cfg.model,

    async transcribe(audio, mime, lang) {
      const data = toBase64(audio);
      const build = (model: string) => {
        // Speech models reject systemInstruction ("Developer instruction is not enabled for this model"):
        // fold the instructions into the user turn for them.
        const folded = isSpeechModel(model);
        const text = folded
          ? `${TRANSCRIBE_SYSTEM}

${transcribeUser(lang)}`
          : transcribeUser(lang);
        return {
          ...(folded ? {} : { systemInstruction: { parts: [{ text: TRANSCRIBE_SYSTEM }] } }),
          contents: [{ role: 'user', parts: [{ text }, { inline_data: { mime_type: baseMime(mime), data } }] }],
          generationConfig: { ...tuning(model, 0), maxOutputTokens: 32_768 },
        };
      };
      const primary = cfg.transcribeModel?.trim() || cfg.model;
      const r = await generateWithFallback({ ...cfg, model: primary }, rt, build);
      return { value: r.text.trim(), usage: r.usage };
    },

    async draft(input) {
      const build = (model: string) => ({
        systemInstruction: { parts: [{ text: draftSystem(input.lang) }] },
        contents: [{ role: 'user', parts: [{ text: draftUser(input) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: DRAFT_SCHEMA,
          ...tuning(model, 0.4),
          maxOutputTokens: 16_384,
        },
      });
      const r = await generateWithFallback(cfg, rt, build);
      return { value: parseJson(r.text), usage: r.usage };
    },

    async suggest(input) {
      const build = (model: string) => ({
        systemInstruction: { parts: [{ text: suggestSystem(input.lang) }] },
        contents: [{ role: 'user', parts: [{ text: suggestUser(input) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SUGGEST_SCHEMA,
          ...tuning(model, 0.7),
          maxOutputTokens: 2_048,
        },
      });
      const r = await generateWithFallback(cfg, rt, build);
      return { value: parseJson(r.text), usage: r.usage };
    },
  };
}
