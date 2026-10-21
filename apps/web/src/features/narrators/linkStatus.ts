import type { NarratorLink } from './hooks';

export type LinkStatus = 'active' | 'claimed' | 'expired' | 'revoked';

/** Display status of a narrator_links row. Revoked wins; a claimed link stays usable by its device even after expiry. */
export function linkStatus(l: Pick<NarratorLink, 'revoked_at' | 'claimed_at' | 'expires_at'>, now = Date.now()): LinkStatus {
  if (l.revoked_at) return 'revoked';
  if (l.claimed_at) return 'claimed';
  if (new Date(l.expires_at).getTime() <= now) return 'expired';
  return 'active';
}
