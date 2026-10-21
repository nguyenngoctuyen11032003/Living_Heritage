// Maps database RPC / PostgREST errors (short snake_case codes in `error.message`) to `family.errors.*` keys.

export const FAMILY_ERROR_CODES = [
  'not_authenticated',
  'forbidden',
  'not_found',
  'anonymous_not_allowed',
  'invalid_name',
  'invalid_email',
  'invalid_role',
  'invalid_ttl',
  'invite_not_found',
  'invite_used',
  'invite_expired',
  'invite_email_mismatch',
  'link_not_found',
  'link_expired',
  'link_revoked',
  'link_already_claimed',
  'network',
  'unknown',
] as const;
export type FamilyErrorCode = (typeof FAMILY_ERROR_CODES)[number];

const KNOWN = new Set<string>(FAMILY_ERROR_CODES);

/** Extracts a known error code from a Supabase/PostgREST error (or anything thrown). */
export function rpcErrorCode(err: unknown): FamilyErrorCode {
  if (!err) return 'unknown';
  const e = (typeof err === 'object' ? err : { message: String(err) }) as { message?: unknown; code?: unknown; details?: unknown };
  const message = typeof e.message === 'string' ? e.message.trim() : '';
  if (KNOWN.has(message)) return message as FamilyErrorCode;
  // A code may be embedded in a longer message, e.g. "ERROR: link_expired".
  const embedded = FAMILY_ERROR_CODES.find((c) => c !== 'unknown' && c !== 'network' && new RegExp(`\\b${c}\\b`).test(message));
  if (embedded) return embedded;
  if (e.code === '42501' || /row-level security|permission denied/i.test(message)) return 'forbidden';
  if (e.code === 'PGRST116') return 'not_found';
  if (/invalid input syntax for type uuid/i.test(message)) return 'not_found';
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)) return 'network';
  return 'unknown';
}
