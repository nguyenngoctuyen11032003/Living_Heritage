// Gemini for knowledge-ask: embeddings (embedContent / batchEmbedContents REST) and the grounded answer
// (generateContent, via the ai-process client so retries, timeouts and the circuit breaker behave the same).
// The API key travels only in the `x-goog-api-key` header.
import {
  GEMINI_BASE_URL,
  GeminiError,
  type GeminiErrorKind,
  type GeminiRuntime,
  generate,
  parseJson,
} from '../../ai-process/lib/gemini.ts';
import { ANSWER_SCHEMA, answerSystem, answerUser, type Lang, type PromptSource } from './prompts.ts';

export const EMBED_DIM = 768;
/** gemini-embedding-001 accepts at most 100 requests per batch call. */
export const EMBED_BATCH = 50;

export type EmbedTask = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT';

export interface KnowledgeAiConfig {
  apiKey: string;
  /** generateContent model (GEMINI_MODEL). */
  model: string;
  /** Embedding model (GEMINI_EMBED_MODEL). */
  embedModel: string;
  timeoutMs: number;
}

export interface AnswerInput {
  lang: Lang;
  question: string;
  sources: PromptSource[];
}

/** What the handler needs; the JSON answer comes back unvalidated (the handler runs zod). */
export interface KnowledgeAi {
  /** One unit-length 768-d vector per text, in order. */
  embed(texts: string[], task: EmbedTask): Promise<number[][]>;
  answer(input: AnswerInput): Promise<unknown>;
}

const UPSTREAM: ReadonlySet<GeminiErrorKind> = new Set<GeminiErrorKind>(['timeout', 'rate_limited', 'unavailable', 'network']);
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** Scales to unit length (cosine is scale-free, but stored vectors stay comparable across models/dims). */
export function normalize(v: number[]): number[] {
  const len = Math.hypot(...v);
  return len > 0 ? v.map((x) => x / len) : v;
}

function asVector(v: unknown): number[] {
  const values = (v as { values?: unknown } | null)?.values;
  if (!Array.isArray(values) || values.length !== EMBED_DIM || !values.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    throw new GeminiError('invalid_output');
  }
  return normalize(values as number[]);
}

/** POST JSON with breaker gate, timeout and one jittered retry on 429 / 5xx / network. */
async function postJson(cfg: KnowledgeAiConfig, rt: GeminiRuntime, url: string, body: unknown): Promise<unknown> {
  if (!rt.breaker.canRequest()) throw new GeminiError('circuit_open');
  for (let retry = 0;; retry++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
    let kind: GeminiErrorKind;
    let status: number | null = null;
    let retryable = false;
    try {
      const res = await rt.fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await res.text();
      status = res.status;
      if (res.ok) {
        try {
          const parsed = JSON.parse(text);
          rt.breaker.onSuccess();
          return parsed;
        } catch {
          kind = 'invalid_output';
        }
      } else if (status === 429) {
        kind = 'rate_limited';
        retryable = true;
      } else if (status >= 500) {
        kind = 'unavailable';
        retryable = RETRYABLE_STATUS.has(status);
      } else {
        kind = 'bad_request';
      }
    } catch {
      kind = ctrl.signal.aborted ? 'timeout' : 'network';
      retryable = kind === 'network';
    } finally {
      clearTimeout(timer);
    }
    if (!retryable || retry >= 1) {
      rt.breaker.onFailure(UPSTREAM.has(kind));
      throw new GeminiError(kind, status);
    }
    await rt.sleep(400 + Math.floor(rt.random() * 800));
  }
}

export function createKnowledgeAi(cfg: KnowledgeAiConfig, rt: GeminiRuntime): KnowledgeAi {
  const modelPath = `models/${cfg.embedModel}`;
  const base = `${GEMINI_BASE_URL}/${encodeURIComponent(cfg.embedModel)}`;
  const request = (text: string, task: EmbedTask) => ({
    model: modelPath,
    content: { parts: [{ text }] },
    taskType: task,
    outputDimensionality: EMBED_DIM,
  });

  return {
    async embed(texts, task) {
      if (texts.length === 0) return [];
      if (texts.length === 1) {
        const res = await postJson(cfg, rt, `${base}:embedContent`, request(texts[0]!, task));
        return [asVector((res as { embedding?: unknown } | null)?.embedding)];
      }
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += EMBED_BATCH) {
        const chunk = texts.slice(i, i + EMBED_BATCH);
        const res = await postJson(cfg, rt, `${base}:batchEmbedContents`, { requests: chunk.map((t) => request(t, task)) });
        const list = (res as { embeddings?: unknown } | null)?.embeddings;
        if (!Array.isArray(list) || list.length !== chunk.length) throw new GeminiError('invalid_output');
        out.push(...list.map(asVector));
      }
      return out;
    },

    async answer(input) {
      const body = {
        systemInstruction: { parts: [{ text: answerSystem(input.lang) }] },
        contents: [{ role: 'user', parts: [{ text: answerUser(input.lang, input.question, input.sources) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ANSWER_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 4_096,
        },
      };
      const r = await generate({ apiKey: cfg.apiKey, model: cfg.model, timeoutMs: cfg.timeoutMs }, rt, body);
      return parseJson(r.text);
    },
  };
}
