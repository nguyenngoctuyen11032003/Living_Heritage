import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router';

/** Window event fired when a link to the current page was turned into a smooth in-page scroll (menus close on it). */
export const SAME_PAGE_NAV_EVENT = 'lh:same-page-nav';

export const prefersReduced = () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/** Fades the page in after a pathname change (not on first load). Opacity only: a transform would trap fixed children. */
export function useRouteFade(ref: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el || prefersReduced() || typeof el.animate !== 'function') return;
    const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    return () => anim.cancel();
  }, [pathname, ref]);
}
