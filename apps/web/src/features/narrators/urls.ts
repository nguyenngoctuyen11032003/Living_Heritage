import { siteHref } from '@/lib/env';

/** Absolute storytelling-link URL for a raw token from create_narrator_link: `${site}k/<token>`. */
export function narratorLinkUrl(token: string): string {
  return siteHref(`/k/${encodeURIComponent(token.trim())}`);
}

/** In-app path for assisted storytelling by a family editor on this device. */
export function assistedTellPath(narratorId: string): string {
  return `/ke-chuyen?narrator=${encodeURIComponent(narratorId)}`;
}

/** localStorage key holding the narrator id claimed on this device (read by the storytelling pages). */
export const NARRATOR_ID_KEY = 'lh.narratorId';
