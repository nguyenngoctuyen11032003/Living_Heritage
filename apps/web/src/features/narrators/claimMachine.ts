// Pure state machine behind /k/:token (open a storytelling link).
//
//   checking ──SESSION(none)──▶ signing_in ──SIGNED_IN──▶ claiming ──CLAIMED──▶ done
//      │      SESSION(anonymous) ─────────────────────────▶ claiming
//      │      SESSION(family) ──▶ needs_signout ──SIGNED_OUT──▶ signing_in
//      └─ NOT_CONFIGURED / FAILED(code) ──▶ error ──RETRY──▶ checking

export type ClaimErrorCode =
  | 'link_expired'
  | 'link_revoked'
  | 'link_already_claimed'
  | 'link_not_found'
  | 'anonymous_disabled'
  | 'not_configured'
  | 'network'
  | 'unknown';

export type SessionKind = 'none' | 'anonymous' | 'family';

export type ClaimState =
  | { kind: 'checking'; attempt: number }
  | { kind: 'needs_signout'; attempt: number }
  | { kind: 'signing_in'; attempt: number }
  | { kind: 'claiming'; attempt: number }
  | { kind: 'done'; attempt: number; narratorId: string }
  | { kind: 'error'; attempt: number; code: ClaimErrorCode };

export type ClaimEvent =
  | { type: 'NOT_CONFIGURED' }
  | { type: 'SESSION'; session: SessionKind }
  | { type: 'SIGNED_OUT' }
  | { type: 'SIGNED_IN' }
  | { type: 'CLAIMED'; narratorId: string }
  | { type: 'FAILED'; code: ClaimErrorCode }
  | { type: 'RETRY' };

export const initialClaimState: ClaimState = { kind: 'checking', attempt: 0 };

export function claimReducer(state: ClaimState, event: ClaimEvent): ClaimState {
  const { attempt } = state;
  switch (event.type) {
    case 'NOT_CONFIGURED':
      return { kind: 'error', attempt, code: 'not_configured' };
    case 'SESSION':
      if (state.kind !== 'checking') return state;
      if (event.session === 'none') return { kind: 'signing_in', attempt };
      if (event.session === 'anonymous') return { kind: 'claiming', attempt };
      return { kind: 'needs_signout', attempt };
    case 'SIGNED_OUT':
      return state.kind === 'needs_signout' ? { kind: 'signing_in', attempt } : state;
    case 'SIGNED_IN':
      return state.kind === 'signing_in' ? { kind: 'claiming', attempt } : state;
    case 'CLAIMED':
      return state.kind === 'claiming' ? { kind: 'done', attempt, narratorId: event.narratorId } : state;
    case 'FAILED':
      return state.kind === 'done' ? state : { kind: 'error', attempt, code: event.code };
    case 'RETRY':
      return state.kind === 'error' && state.code !== 'not_configured' ? { kind: 'checking', attempt: attempt + 1 } : state;
  }
}

const LINK_CODES: ClaimErrorCode[] = ['link_expired', 'link_revoked', 'link_already_claimed', 'link_not_found'];

/** Maps an error from signInAnonymously() or claim_narrator_link to a ClaimErrorCode. */
export function claimErrorCode(err: unknown): ClaimErrorCode {
  if (!err) return 'unknown';
  const e = (typeof err === 'object' ? err : { message: String(err) }) as { message?: unknown; code?: unknown; name?: unknown };
  const message = typeof e.message === 'string' ? e.message : '';
  const hit = LINK_CODES.find((c) => message.includes(c));
  if (hit) return hit;
  if (e.code === 'anonymous_provider_disabled' || /anonymous sign-?ins are disabled/i.test(message)) return 'anonymous_disabled';
  if (/invalid input syntax for type uuid/i.test(message)) return 'link_not_found';
  if (e.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)) return 'network';
  return 'unknown';
}

/** Tokens from create_narrator_link are 32 URL-safe base64 chars; reject obvious garbage without a round trip. */
export function looksLikeToken(token: string | undefined): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(token);
}
