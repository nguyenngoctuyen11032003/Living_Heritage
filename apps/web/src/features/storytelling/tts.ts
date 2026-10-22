// "Nghe câu hỏi" voice: prefer the server voice (Edge Function `question-tts`, Gemini TTS → audio/wav),
// fall back to the browser's speechSynthesis. The decision and the per-session cache are pure and tested.
import { AiErrorCode, type AiErrorCode as AiErrorCodeT } from '@lh/shared';

export const TTS_FUNCTION = 'question-tts';
export const TTS_MAX_CHARS = 400;

export type VoiceLang = 'vi' | 'en';
export type VoiceSource = 'server' | 'browser' | 'none';
export type TtsFailure = AiErrorCodeT | 'network' | 'not_audio';

export class TtsError extends Error {
  constructor(public code: TtsFailure) {
    super(code);
    this.name = 'TtsError';
  }
}

/** Failures that will not get better by asking again in this session. */
const STICKY: ReadonlySet<TtsFailure> = new Set<TtsFailure>(['quota_exceeded', 'unauthorized', 'forbidden', 'bad_request']);
/** Transient failures tolerated before the server voice is given up for the session. */
export const MAX_TRANSIENT_FAILURES = 2;

export interface VoiceInputs {
  /** Supabase configured and a text the server accepts. */
  serverPossible: boolean;
  serverDisabled: boolean;
  speechSupported: boolean;
}

/** Which voice to use for the next "Nghe câu hỏi". */
export function decideVoice({ serverPossible, serverDisabled, speechSupported }: VoiceInputs): VoiceSource {
  if (serverPossible && !serverDisabled) return 'server';
  return speechSupported ? 'browser' : 'none';
}

/** After a failed server attempt: is there still a voice to try right now? */
export function fallbackAfterFailure(speechSupported: boolean): VoiceSource {
  return speechSupported ? 'browser' : 'none';
}

export const voiceKey = (lang: VoiceLang, text: string) => `${lang}|${text.replace(/\s+/g, ' ').trim()}`;

/** Text the server will take (1..400 chars after whitespace is collapsed). */
export function serverAccepts(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 0 && t.length <= TTS_MAX_CHARS;
}

/**
 * Per-session audio cache: question → object URL (revoked by `clear()` when the session screen unmounts),
 * plus in-flight requests (two taps never fetch twice) and the "server voice gave up" flag.
 */
export interface AudioCache {
  get(key: string): string | undefined;
  /** Fetch once per key; resolves to the object URL. */
  load(key: string, fetchBlob: () => Promise<Blob>): Promise<string>;
  readonly serverDisabled: boolean;
  recordFailure(code: TtsFailure): void;
  clear(): void;
}

export function createAudioCache(urls: { create: (b: Blob) => string; revoke: (u: string) => void } = {
  create: (b) => URL.createObjectURL(b),
  revoke: (u) => URL.revokeObjectURL(u),
}): AudioCache {
  const ready = new Map<string, string>();
  const inflight = new Map<string, Promise<string>>();
  let transient = 0;
  let disabled = false;
  let generation = 0;

  return {
    get: (key) => ready.get(key),
    load(key, fetchBlob) {
      const have = ready.get(key);
      if (have) return Promise.resolve(have);
      const running = inflight.get(key);
      if (running) return running;
      const gen = generation;
      const p = fetchBlob().then(
        (blob) => {
          if (inflight.get(key) === p) inflight.delete(key);
          const url = urls.create(blob);
          // Cleared while loading: do not leak an URL nobody will revoke.
          if (gen !== generation) {
            urls.revoke(url);
            throw new TtsError('network');
          }
          ready.set(key, url);
          transient = 0;
          return url;
        },
        (e: unknown) => {
          if (inflight.get(key) === p) inflight.delete(key);
          throw e;
        },
      );
      inflight.set(key, p);
      return p;
    },
    get serverDisabled() {
      return disabled;
    },
    recordFailure(code) {
      if (STICKY.has(code)) disabled = true;
      else if (++transient >= MAX_TRANSIENT_FAILURES) disabled = true;
    },
    clear() {
      generation++;
      for (const url of ready.values()) urls.revoke(url);
      ready.clear();
      inflight.clear();
    },
  };
}

export interface TtsTransport {
  url: string;
  apiKey: string;
  getToken: () => Promise<string | null>;
  fetch: typeof fetch;
}

/** POST {text, lang} to question-tts with the session token; resolves to the audio blob. */
export async function fetchQuestionAudio(text: string, lang: VoiceLang, tr: TtsTransport, signal?: AbortSignal): Promise<Blob> {
  const token = await tr.getToken();
  if (!token) throw new TtsError('unauthorized');
  let res: Response;
  try {
    res = await tr.fetch(`${tr.url.replace(/\/$/, '')}/functions/v1/${TTS_FUNCTION}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, apikey: tr.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ text, lang }),
      signal,
    });
  } catch {
    throw new TtsError('network');
  }
  if (!res.ok) {
    let code: TtsFailure = res.status === 429 ? 'quota_exceeded' : res.status === 401 ? 'unauthorized' : 'ai_unavailable';
    try {
      const parsed = AiErrorCode.safeParse(((await res.json()) as { error?: unknown }).error);
      if (parsed.success) code = parsed.data;
    } catch {
      /* not JSON */
    }
    throw new TtsError(code);
  }
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('audio/')) throw new TtsError('not_audio');
  const blob = await res.blob();
  if (blob.size === 0) throw new TtsError('not_audio');
  return blob;
}

export const errorCode = (e: unknown): TtsFailure => (e instanceof TtsError ? e.code : 'network');
