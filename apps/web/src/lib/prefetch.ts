import { matchRoutes, type RouteObject } from 'react-router';

type RouteTable = readonly RouteObject[];

const seen = new Set<string>();

/** Forget what was prefetched (tests only). */
export function resetPrefetch(): void {
  seen.clear();
}

/** Load the lazy chunks of every route matching `pathname` (once per path). Errors are swallowed: it is only a hint. */
export function prefetchPath(routes: RouteTable, pathname: string, basename = '/'): boolean {
  const key = pathname.replace(/\/+$/, '') || '/';
  if (seen.has(key)) return false;
  seen.add(key);
  const matches = matchRoutes(routes as RouteObject[], pathname, basename);
  if (!matches) return false;
  for (const { route } of matches) {
    const lazy = route.lazy;
    if (typeof lazy !== 'function') continue;
    try {
      void Promise.resolve((lazy as () => unknown)()).catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
  return true;
}

/** Internal same-origin link path, or null for external/new-tab/download/hash-only links. */
export function internalPath(anchor: HTMLAnchorElement, origin: string): string | null {
  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || anchor.hasAttribute('download')) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return url.pathname;
}

export const IDLE_ROUTES = ['/cach-hoat-dong', '/kham-pha', '/goi-dich-vu', '/dang-nhap', '/ke-chuyen'] as const;

function slowConnection(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c && (c.saveData || c.effectiveType === '2g' || c.effectiveType === 'slow-2g'));
}

/** Start link-intent prefetching and idle prefetch of the main public routes. Returns a cleanup function. */
export function startPrefetch(routes: RouteTable, basename = '/'): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onIntent = (event: Event) => {
    const el = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(el instanceof HTMLAnchorElement)) return;
    const path = internalPath(el, window.location.origin);
    if (path) prefetchPath(routes, path, basename);
  };
  const opts = { passive: true, capture: true } as const;
  const events = ['pointerover', 'focusin', 'touchstart'] as const;
  for (const e of events) document.addEventListener(e, onIntent, opts);

  let cancel: () => void = () => undefined;
  if (!slowConnection()) {
    const run = () => {
      for (const p of IDLE_ROUTES) prefetchPath(routes, (basename === '/' ? '' : basename) + p, basename);
    };
    const start = () => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        cancelIdleCallback?: (h: number) => void;
      };
      if (w.requestIdleCallback) {
        const h = w.requestIdleCallback(run, { timeout: 4000 });
        cancel = () => w.cancelIdleCallback?.(h);
      } else {
        const h = window.setTimeout(run, 2000);
        cancel = () => window.clearTimeout(h);
      }
    };
    if (document.readyState === 'complete') start();
    else {
      const onLoad = () => start();
      window.addEventListener('load', onLoad, { once: true });
      cancel = () => window.removeEventListener('load', onLoad);
    }
  }
  return () => {
    for (const e of events) document.removeEventListener(e, onIntent, opts);
    cancel();
  };
}
