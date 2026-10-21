const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? '';

export const env = {
  supabaseUrl: url,
  supabaseKey: key,
  isConfigured: url.startsWith('https://') && key.length > 10,
  /** Absolute site root incl. base path, e.g. https://x.github.io/Living_Heritage/ (used for QR codes and auth redirects). */
  siteUrl: ((import.meta.env.VITE_SITE_URL as string | undefined) || `${window.location.origin}${import.meta.env.BASE_URL}`).replace(/\/?$/, '/'),
};

/** Absolute URL for an in-app path: siteHref('/nghe/abc') */
export function siteHref(path: string): string {
  return env.siteUrl + path.replace(/^\//, '');
}
