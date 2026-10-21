import { linkStatus } from '@/features/narrators/linkStatus';

export interface LinkLike {
  id: string;
  narrator_id: string;
  created_at: string;
  expires_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
}

/**
 * Links that still give access: not revoked, and either still claimable (not expired) or already bound to a device
 * (a claimed device keeps working after the link's expiry until someone revokes it). Newest first.
 */
export function activeLinks<T extends LinkLike>(links: T[], now = Date.now()): T[] {
  return links
    .filter((l) => {
      const s = linkStatus(l, now);
      return s === 'active' || s === 'claimed';
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
