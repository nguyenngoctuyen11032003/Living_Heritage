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
    return typeof msg === 'string' && msg.trim() ? msg.replace(/s+/g, ' ').trim().slice(0, 240) : null;
  } catch {
    return null;
  }
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  /** Per-attempt timeout (ms). */
  timeoutMs: number;
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
/** Retries after the first attempt for 429 / 5xx / network errors (never for timeouts: audio calls are long). */
export const MAX_RETRIES = 1;
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
      if (status === 429) return { ok: false, kind: 'rate_limited', status, retryable: true };
      if (status >= 500) return { ok: false, kind: 'unavailable', status, retryable: RETRYABLE_STATUS.has(status) };
      return { ok: false, kind: 'bad_request', status, retryable: false, detail: upstreamDetail(text) };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, kind: 'unavailable', status: res.status, retryable: false };
    }
    const out = responseText(parsed);
    return out === null
      ? { ok: false, kind: 'blocked', status: res.status, retryable: false }
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
    await rt.sleep(500 + Math.floor(rt.random() * 1000));
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

export function createGemini(cfg: GeminiConfig, rt: GeminiRuntime): AiModel {
  return {
    model: cfg.model,

    async transcribe(audio, mime, lang) {
      const body = {
        systemInstruction: { parts: [{ text: TRANSCRIBE_SYSTEM }] },
        contents: [{
          role: 'user',
          parts: [{ text: transcribeUser(lang) }, { inline_data: { mime_type: baseMime(mime), data: toBase64(audio) } }],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 32_768 },
      };
      const r = await generate(cfg, rt, body);
      return { value: r.text.trim(), usage: r.usage };
    },

    async draft(input) {
      const body = {
        systemInstruction: { parts: [{ text: draftSystem(input.lang) }] },
        contents: [{ role: 'user', parts: [{ text: draftUser(input) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: DRAFT_SCHEMA,
          temperature: 0.4,
          maxOutputTokens: 16_384,
        },
      };
      const r = await generate(cfg, rt, body);
      return { value: parseJson(r.text), usage: r.usage };
    },

    async suggest(input) {
      const body = {
        systemInstruction: { parts: [{ text: suggestSystem(input.lang) }] },
        contents: [{ role: 'user', parts: [{ text: suggestUser(input) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SUGGEST_SCHEMA,
          temperature: 0.7,
          maxOutputTokens: 2_048,
        },
      };
      const r = await generate(cfg, rt, body);
      return { value: parseJson(r.text), usage: r.usage };
    },
  };
}
