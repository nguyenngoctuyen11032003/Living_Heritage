// knowledge-ask: answers a visitor's question ONLY from published public items (retrieval-augmented, cited),
// and lets an admin (re)build the embedding index. Every side effect arrives through `deps`, so handler_test.ts
// drives the whole flow with fakes. Contract: ../_shared/knowledge-contract.ts.
import { z } from 'zod';
import type { AiErrorCode } from '../_shared/ai-contract.ts';
import { preflight } from '../_shared/cors.ts';
import { fail, json, readLimited } from '../_shared/http.ts';
import { type KnowledgeAskResponse, type KnowledgeReindexResponse, KnowledgeRequest } from '../_shared/knowledge-contract.ts';
import { GeminiError } from '../ai-process/lib/gemini.ts';
import type { KnowledgeAi, KnowledgeAiConfig } from './lib/ai.ts';
import type { AdminCheck, KnowledgeDb, MatchRow, UnembeddedRow } from './lib/db.ts';
import type { DailyCap, RateLimiter } from './lib/limits.ts';
import { clientIp } from './lib/limits.ts';
import { documentText, groundCitations } from './lib/prompts.ts';

export interface KnowledgeDeps {
  env: (k: string) => string | undefined;
  now: () => number;
  /** service_role data access (public_items + match_public_items). */
  db: () => KnowledgeDb;
  /** Is this bearer token a signed-in admin? (anon key + JWT → auth.getUser + rpc is_admin) */
  checkAdmin: (jwt: string) => Promise<AdminCheck>;
  ai: (cfg: KnowledgeAiConfig) => KnowledgeAi;
  /** Per-IP limiter for `ask` (one per isolate). */
  limiter: RateLimiter;
  /** Global daily cap for `ask` (one per isolate). */
  dailyCap: DailyCap;
}

export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const DEFAULT_EMBED_MODEL = 'gemini-embedding-001';
export const DEFAULT_TIMEOUT_MS = 25_000;
export const MATCH_LIMIT = 6;
export const DEFAULT_MIN_SIMILARITY = 0.55;
/** Rows embedded lazily on each question (self-healing index). */
export const LAZY_EMBED_LIMIT = 20;
/** Rows embedded per reindex call. */
export const REINDEX_LIMIT = 200;
export const RATE_LIMIT_PER_MIN = 10;
export const DEFAULT_DAILY_CAP = 1_000;
const BODY_MAX_BYTES = 4 * 1024;
const ANSWER_MAX_CHARS = 2_000;

type Req = z.output<typeof KnowledgeRequest>;

const AnswerOut = z.object({ answered: z.boolean(), answer: z.string(), cited: z.array(z.number()).default([]) });

function intEnv(deps: KnowledgeDeps, name: string, fallback: number, min: number, max: number): number {
  const raw = deps.env(name)?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function numEnv(deps: KnowledgeDeps, name: string, fallback: number, min: number, max: number): number {
  const raw = deps.env(name)?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function codeOf(e: unknown): AiErrorCode {
  return e instanceof GeminiError ? 'ai_unavailable' : 'internal';
}

function aiConfig(deps: KnowledgeDeps): KnowledgeAiConfig | null {
  const apiKey = deps.env('GEMINI_API_KEY')?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: deps.env('GEMINI_MODEL')?.trim() || DEFAULT_MODEL,
    embedModel: deps.env('GEMINI_EMBED_MODEL')?.trim() || DEFAULT_EMBED_MODEL,
    timeoutMs: intEnv(deps, 'KNOWLEDGE_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, 1_000, 120_000),
  };
}

/** Embeds up to `limit` rows that have no embedding yet; failures leave the row for the next call. */
export async function embedPending(
  deps: KnowledgeDeps,
  db: KnowledgeDb,
  ai: KnowledgeAi,
  limit: number,
): Promise<{ embedded: number; failed: number }> {
  const rows = await db.listUnembedded(limit);
  let embedded = 0;
  let failed = 0;
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk: UnembeddedRow[] = rows.slice(i, i + CHUNK);
    let vectors: number[][];
    try {
      vectors = await ai.embed(chunk.map((r) => documentText(r)), 'RETRIEVAL_DOCUMENT');
    } catch (e) {
      failed += chunk.length;
      // An unhealthy upstream will not get better within this request.
      if (e instanceof GeminiError) {
        failed += rows.length - i - chunk.length;
        break;
      }
      continue;
    }
    const nowIso = new Date(deps.now()).toISOString();
    for (let j = 0; j < chunk.length; j++) {
      try {
        if (await db.saveEmbedding(chunk[j]!, vectors[j]!, nowIso)) embedded++;
      } catch {
        failed++;
      }
    }
  }
  return { embedded, failed };
}

function toSource(m: MatchRow) {
  return {
    id: m.id,
    title: m.title,
    kind: m.kind,
    narrator_label: m.narrator_label,
    topic_slug: m.topic_slug,
    similarity: Math.round(m.similarity * 1000) / 1000,
  };
}

async function ask(deps: KnowledgeDeps, req: Request, body: Extract<Req, { action: 'ask' }>): Promise<Response> {
  const cfg = aiConfig(deps);
  if (!cfg) return fail('ai_unavailable');

  const hit = deps.limiter.take(clientIp(req));
  if (!hit.ok) return fail('quota_exceeded', { scope: 'ip', retry_after_s: Math.ceil(hit.retryAfterMs / 1000) });
  if (!deps.dailyCap.take()) return fail('quota_exceeded', { scope: 'global', retry_after_s: null });

  const ai = deps.ai(cfg);
  const db = deps.db();

  let query: number[];
  try {
    [query] = (await ai.embed([body.question], 'RETRIEVAL_QUERY')) as [number[]];
  } catch (e) {
    if (e instanceof GeminiError && e.kind === 'circuit_open') deps.dailyCap.refund();
    return fail(codeOf(e));
  }

  // Self-healing index: newly published / edited items get embedded by the next visitor's question.
  try {
    await embedPending(deps, db, ai, LAZY_EMBED_LIMIT);
  } catch {
    // best effort: searching what is already indexed is still correct
  }

  const minSimilarity = numEnv(deps, 'KNOWLEDGE_MIN_SIMILARITY', DEFAULT_MIN_SIMILARITY, 0, 1);
  const matches = await db.match(query, MATCH_LIMIT, minSimilarity);
  if (matches.length === 0) {
    const out: KnowledgeAskResponse = { answer: null, cited: [], sources: [], reason: 'no_sources' };
    return json(200, out);
  }

  const sources = matches.map(toSource);
  let raw: unknown;
  try {
    raw = await ai.answer({ lang: body.lang, question: body.question, sources: matches });
  } catch (e) {
    return fail(codeOf(e));
  }
  const parsed = AnswerOut.safeParse(raw);
  if (!parsed.success) return fail('ai_unavailable');

  const grounded = groundCitations(parsed.data.answer.slice(0, ANSWER_MAX_CHARS), matches.length);
  // Not answered, or an answer that cites nothing: never shown (it could only come from general knowledge).
  if (!parsed.data.answered || grounded.cited.length === 0 || grounded.text === '') {
    const out: KnowledgeAskResponse = { answer: null, cited: [], sources, reason: 'not_in_sources' };
    return json(200, out);
  }
  const out: KnowledgeAskResponse = { answer: grounded.text, cited: grounded.cited, sources, reason: null };
  return json(200, out);
}

async function reindex(deps: KnowledgeDeps, req: Request): Promise<Response> {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')?.trim() ?? '');
  if (!m) return fail('unauthorized');
  const who = await deps.checkAdmin(m[1]!);
  if (who === 'invalid') return fail('unauthorized');
  if (who !== 'admin') return fail('forbidden');

  const cfg = aiConfig(deps);
  if (!cfg) return fail('ai_unavailable');
  const db = deps.db();
  const { embedded, failed } = await embedPending(deps, db, deps.ai(cfg), REINDEX_LIMIT);
  const remaining = await db.countUnembedded();
  const out: KnowledgeReindexResponse = { embedded, failed, remaining };
  if (embedded === 0 && failed > 0) return fail('ai_unavailable', out);
  return json(200, out);
}

export async function handle(req: Request, deps: KnowledgeDeps): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('bad_request');

  const text = await readLimited(req, BODY_MAX_BYTES);
  if (text === null) return fail('bad_request');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail('bad_request');
  }
  const parsed = KnowledgeRequest.safeParse(body);
  if (!parsed.success) return fail('bad_request');

  try {
    switch (parsed.data.action) {
      case 'ask':
        return await ask(deps, req, parsed.data);
      case 'reindex':
        return await reindex(deps, req);
    }
  } catch (e) {
    console.error('knowledge-ask failed:', e instanceof Error ? e.name : typeof e);
    return fail(codeOf(e));
  }
}
