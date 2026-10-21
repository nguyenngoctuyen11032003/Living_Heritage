// Contract between the web app and the Edge Function `knowledge-ask` (Phase 3: "Hỏi kinh nghiệm của người đi trước").
// The web mirror lives in apps/web/src/features/knowledge/ask.ts (keep both in sync).
//
// POST /functions/v1/knowledge-ask
//   { action: 'ask', question: string (3..300 chars after trimming), lang: 'vi' | 'en' }
//     → 200 KnowledgeAskResponse
//     Anonymous callers are fine (publishable key). Rate limited per IP and per isolate per day.
//   { action: 'reindex' } with `Authorization: Bearer <admin user JWT>`
//     → 200 KnowledgeReindexResponse
// Errors: `{ error: AiErrorCode, message, ... }` with the matching HTTP status (see http.ts):
//   bad_request 400 · unauthorized 401 · forbidden 403 · quota_exceeded 429 (+ scope, retry_after_s) · ai_unavailable 503 · internal 500
import { z } from 'zod';
import { AiLang } from './ai-contract.ts';

export const QUESTION_MIN = 3;
export const QUESTION_MAX = 300;

/** Trims and collapses whitespace (the length rule applies to the normalized text). */
export const normalizeQuestion = (q: string): string => q.replace(/\s+/g, ' ').trim();

export const KnowledgeRequest = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('ask'),
    question: z.string().transform(normalizeQuestion).pipe(z.string().min(QUESTION_MIN).max(QUESTION_MAX)),
    lang: AiLang.default('vi'),
  }),
  z.object({ action: z.literal('reindex') }),
]);
export type KnowledgeRequest = z.input<typeof KnowledgeRequest>;

export const KnowledgeSource = z.object({
  /** public_items.id → /tri-thuc/:id */
  id: z.uuid(),
  title: z.string(),
  kind: z.enum(['story', 'experience']),
  narrator_label: z.string(),
  topic_slug: z.string().nullable(),
  /** Cosine similarity to the question, 0..1. */
  similarity: z.number(),
});
export type KnowledgeSource = z.infer<typeof KnowledgeSource>;

/**
 * - reason null: `answer` is grounded in `sources`; markers [n] refer to sources[n - 1]; `cited` lists the n used.
 * - reason 'no_sources': no public item is close enough → answer null, sources [] (never answered from general knowledge).
 * - reason 'not_in_sources': related items were found but they do not answer the question → answer null, sources = related items.
 */
export const KnowledgeAskResponse = z.object({
  answer: z.string().nullable(),
  cited: z.array(z.number().int().positive()),
  sources: z.array(KnowledgeSource),
  reason: z.enum(['no_sources', 'not_in_sources']).nullable(),
});
export type KnowledgeAskResponse = z.infer<typeof KnowledgeAskResponse>;

export const KnowledgeReindexResponse = z.object({
  /** Rows embedded by this call. */
  embedded: z.number().int(),
  /** Rows whose embedding failed (left null, retried next time). */
  failed: z.number().int(),
  /** Rows still without an embedding after this call (> 0 → call again). */
  remaining: z.number().int(),
});
export type KnowledgeReindexResponse = z.infer<typeof KnowledgeReindexResponse>;
