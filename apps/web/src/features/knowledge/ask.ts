// Client for the `knowledge-ask` Edge Function ("Hỏi kinh nghiệm của người đi trước").
// Contract mirror of supabase/functions/_shared/knowledge-contract.ts — keep both in sync.
//   ask:     POST { action: 'ask', question (3..300 chars), lang } → AskResult   (anonymous, publishable key)
//   reindex: POST { action: 'reindex' } with an admin session    → ReindexResult
import { z } from 'zod';
import { env } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

export const KNOWLEDGE_FUNCTION = 'knowledge-ask';
export const QUESTION_MIN = 3;
export const QUESTION_MAX = 300;

export const normalizeQuestion = (q: string): string => q.replace(/\s+/g, ' ').trim();

const AskSource = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(['story', 'experience']),
  narrator_label: z.string(),
  topic_slug: z.string().nullable(),
  similarity: z.number(),
});
export type AskSource = z.infer<typeof AskSource>;

const AskResult = z.object({
  answer: z.string().nullable(),
  cited: z.array(z.number()).default([]),
  sources: z.array(AskSource),
  reason: z.enum(['no_sources', 'not_in_sources']).nullable(),
});
export type AskResult = z.infer<typeof AskResult>;

const ReindexResult = z.object({ embedded: z.number(), failed: z.number(), remaining: z.number() });
export type ReindexResult = z.infer<typeof ReindexResult>;

/** UI-level error kinds (each has a translated message under knowledge.ask.errors). */
export type AskErrorKind = 'rate_limited' | 'busy' | 'unavailable' | 'invalid' | 'not_configured' | 'network';

export class AskError extends Error {
  constructor(
    public kind: AskErrorKind,
    public retryAfterS: number | null = null,
  ) {
    super(kind);
  }
}

/** Maps an error response body (`{ error, scope, retry_after_s }`) to an AskError. */
export function askErrorFrom(status: number, body: unknown): AskError {
  const b = (body ?? {}) as { error?: unknown; scope?: unknown; retry_after_s?: unknown };
  const retry = typeof b.retry_after_s === 'number' && b.retry_after_s > 0 ? b.retry_after_s : null;
  if (b.error === 'quota_exceeded' || status === 429) return new AskError(b.scope === 'global' ? 'busy' : 'rate_limited', retry);
  if (b.error === 'bad_request' || status === 400) return new AskError('invalid');
  return new AskError('unavailable');
}

export function isValidQuestion(q: string): boolean {
  const n = normalizeQuestion(q).length;
  return n >= QUESTION_MIN && n <= QUESTION_MAX;
}

interface AskOptions {
  signal?: AbortSignal;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
  /** Injected in tests (defaults to VITE_SUPABASE_*). */
  config?: { url: string; key: string; configured: boolean };
}

/** Asks the published knowledge hub. Anonymous: authenticates with the publishable key only. */
export async function askElders(question: string, lang: 'vi' | 'en', opts: AskOptions = {}): Promise<AskResult> {
  const cfg = opts.config ?? { url: env.supabaseUrl, key: env.supabaseKey, configured: env.isConfigured };
  if (!cfg.configured) throw new AskError('not_configured');
  const q = normalizeQuestion(question);
  if (!isValidQuestion(q)) throw new AskError('invalid');
  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`${cfg.url.replace(/\/$/, '')}/functions/v1/${KNOWLEDGE_FUNCTION}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: cfg.key, authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ action: 'ask', question: q, lang }),
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new AskError('network');
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw askErrorFrom(res.status, body);
  const parsed = AskResult.safeParse(body);
  if (!parsed.success) throw new AskError('unavailable');
  return parsed.data;
}

/**
 * Admin only: embeds public items that have no embedding yet (≤ 200 per call). Uses the signed-in session.
 * Returns null on any failure (callers treat it as best effort, except the explicit admin button).
 */
export async function reindexKnowledge(): Promise<ReindexResult | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.functions.invoke(KNOWLEDGE_FUNCTION, { body: { action: 'reindex' } });
    if (error) return null;
    const parsed = ReindexResult.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Splits an answer into text and citation parts: "A [1]. B [2]" → ['A ', 1, '. B ', 2]. */
export function splitCitations(answer: string, max: number): (string | number)[] {
  const out: (string | number)[] = [];
  let last = 0;
  for (const m of answer.matchAll(/\[(\d{1,3})\]/g)) {
    const n = Number(m[1]);
    if (n < 1 || n > max) continue;
    if (m.index > last) out.push(answer.slice(last, m.index));
    out.push(n);
    last = m.index + m[0].length;
  }
  if (last < answer.length) out.push(answer.slice(last));
  return out;
}

/**
 * How the UI presents a result. An answer is only shown when it cites at least one returned source; anything else
 * is shown as "the sources don't answer this" (never as an unsourced AI answer — DỰ ÁN B10 / NT10).
 */
export function askOutcome(result: AskResult): 'no_sources' | 'not_in_sources' | 'answer' {
  if (result.reason === 'no_sources' || result.sources.length === 0) return 'no_sources';
  const cited = result.cited.filter((n) => n >= 1 && n <= result.sources.length);
  if (result.answer === null || !result.answer.trim() || cited.length === 0) return 'not_in_sources';
  return 'answer';
}
