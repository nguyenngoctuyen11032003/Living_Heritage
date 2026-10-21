// Gemini TTS (generateContent with responseModalities ['AUDIO']) over REST. Pure apart from the injected
// fetch. The API key travels only in the `x-goog-api-key` header, never in a URL, log line or error.
import { fromBase64, isWav, sampleRateOf } from './wav.ts';

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export type Lang = 'vi' | 'en';

export interface TtsConfig {
  apiKey: string;
  model: string;
  voice: string;
  timeoutMs: number;
}

export type TtsErrorKind = 'timeout' | 'network' | 'rate_limited' | 'unavailable' | 'bad_request' | 'no_audio';

export class TtsError extends Error {
  kind: TtsErrorKind;
  status: number | null;
  constructor(kind: TtsErrorKind, status: number | null = null) {
    super(`gemini tts ${kind}${status === null ? '' : ` (${status})`}`);
    this.name = 'TtsError';
    this.kind = kind;
    this.status = status;
  }
}

/** Raw PCM (or a ready WAV) plus its sample rate. */
export interface TtsAudio {
  bytes: Uint8Array<ArrayBuffer>;
  sampleRate: number;
  /** True when Gemini already returned a RIFF/WAVE file. */
  wav: boolean;
}

export interface TtsModel {
  readonly model: string;
  readonly voice: string;
  synthesize(text: string, lang: Lang): Promise<TtsAudio>;
}

/** A short spoken-style instruction (Gemini TTS follows natural-language style prompts), then the question. */
export function ttsPrompt(text: string, lang: Lang): string {
  return lang === 'vi'
    ? `Đọc bằng tiếng Việt, giọng ấm áp, chậm rãi và rõ ràng như đang hỏi chuyện một người cao tuổi: ${text}`
    : `Read in English, in a warm, slow and clear voice, as if gently asking an elderly person: ${text}`;
}

export function ttsBody(text: string, lang: Lang, voice: string): unknown {
  return {
    contents: [{ role: 'user', parts: [{ text: ttsPrompt(text, lang) }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  };
}

type InlinePart = { inlineData?: { mimeType?: unknown; data?: unknown } };

/** The first inline audio part of the first candidate, or null. */
export function audioOf(res: unknown): TtsAudio | null {
  const r = res as { candidates?: { content?: { parts?: unknown } }[] } | null;
  const parts = r && Array.isArray(r.candidates) ? r.candidates[0]?.content?.parts : undefined;
  if (!Array.isArray(parts)) return null;
  for (const p of parts as InlinePart[]) {
    const data = p?.inlineData?.data;
    if (typeof data !== 'string' || data === '') continue;
    const mime = typeof p.inlineData?.mimeType === 'string' ? p.inlineData.mimeType : '';
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = fromBase64(data);
    } catch {
      return null;
    }
    if (bytes.byteLength === 0) return null;
    return { bytes, sampleRate: sampleRateOf(mime), wav: isWav(bytes) };
  }
  return null;
}

export function createTts(cfg: TtsConfig, rt: { fetch: typeof fetch }): TtsModel {
  return {
    model: cfg.model,
    voice: cfg.voice,
    async synthesize(text, lang) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
      try {
        let res: Response;
        let raw: string;
        try {
          res = await rt.fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(cfg.model)}:generateContent`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
            body: JSON.stringify(ttsBody(text, lang, cfg.voice)),
            signal: ctrl.signal,
          });
          raw = await res.text();
        } catch {
          throw new TtsError(ctrl.signal.aborted ? 'timeout' : 'network');
        }
        if (!res.ok) {
          if (res.status === 429) throw new TtsError('rate_limited', res.status);
          throw new TtsError(res.status >= 500 ? 'unavailable' : 'bad_request', res.status);
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new TtsError('unavailable', res.status);
        }
        const audio = audioOf(parsed);
        if (!audio) throw new TtsError('no_audio', res.status);
        return audio;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
