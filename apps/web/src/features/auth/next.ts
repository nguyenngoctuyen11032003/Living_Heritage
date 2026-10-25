import { siteHref } from '@/lib/env';

export const DEFAULT_AFTER_LOGIN = '/gia-dinh';

/**
 * Sanitises a `?next=` value: only same-site absolute paths ("/x…") are allowed, never protocol-relative
 * ("//evil") or backslash tricks, so the redirect cannot leave the app.
 */
export function safeNext(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) < 32) return fallback;
  // Never bounce back into the auth pages themselves: a signed-in user would loop between them.
  if (/^\/(dang-nhap|dang-ky)(?:[/?#]|$)/.test(value)) return fallback;
  return value;
}

/** `/dang-nhap?next=…` with the next path encoded. */
export function loginHref(next?: string | null, base = '/dang-nhap'): string {
  const safe = next ? safeNext(next, '') : '';
  return safe ? `${base}?next=${encodeURIComponent(safe)}` : base;
}

/** Absolute auth callback URL (used for signup confirmation and password reset emails). */
export function callbackUrl(next: string): string {
  return siteHref(`/auth/callback?next=${encodeURIComponent(safeNext(next))}`);
}

/** Minimum password length for signup and reset. */
export const MIN_PASSWORD = 8;
