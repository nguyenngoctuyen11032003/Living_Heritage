import type { AiErrorCode } from '@lh/shared';
// Map RPC / PostgREST errors (short codes in error.message) to keys under review `errors.*`.

export const REVIEW_ERROR_CODES = [
  'not_authenticated',
  'forbidden',
  'not_found',
  'not_narrator',
  'story_not_approved',
  'invalid_fields',
  'anonymous_not_allowed',
  'topic_failed',
] as const;

export type ReviewErrorKey = (typeof REVIEW_ERROR_CODES)[number] | 'generic';

export class ReviewError extends Error {
  constructor(public code: ReviewErrorKey) {
    super(code);
  }
}

export function reviewErrorKey(e: unknown): ReviewErrorKey {
  if (e instanceof ReviewError) return e.code;
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
  return (REVIEW_ERROR_CODES as readonly string[]).includes(msg) ? (msg as ReviewErrorKey) : 'generic';
}

/** Throw a ReviewError for a supabase `{ error }` result. */
export function check(error: { message: string } | null | undefined): void {
  if (error) throw new ReviewError(reviewErrorKey(error));
}

/** Maps an ai_jobs.error value ("quota_exceeded" or "quota_exceeded: detail") to a known AI error code. */
export function jobErrorCode(error: string | null): AiErrorCode {
  const code = (error ?? '').split(/[:\s]/)[0];
  const known: AiErrorCode[] = ['unauthorized', 'forbidden', 'not_found', 'bad_request', 'quota_exceeded', 'audio_too_large', 'ai_unavailable', 'internal'];
  return (known as string[]).includes(code ?? '') ? (code as AiErrorCode) : 'internal';
}
