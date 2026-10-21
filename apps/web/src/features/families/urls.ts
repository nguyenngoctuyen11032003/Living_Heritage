import { siteHref } from '@/lib/env';

/** Absolute invite URL shown to the owner/manager once: `${site}moi/<token>`. */
export function inviteUrl(token: string): string {
  return siteHref(`/moi/${encodeURIComponent(token.trim())}`);
}
