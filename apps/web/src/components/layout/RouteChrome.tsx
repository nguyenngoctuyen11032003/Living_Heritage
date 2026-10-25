import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ScrollRestoration, useLocation, useNavigation } from 'react-router';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { prefersReduced, SAME_PAGE_NAV_EVENT } from './routeScroll';

/*
 * Navigation chrome shared by the route layouts, so moving between pages behaves the same everywhere:
 * - a new page (link, header nav) opens at its top; Back/Forward return to where the reader was (ScrollRestoration);
 * - a link to the page already on screen glides back to its top (or to its #section) instead of doing nothing;
 * - a thin progress line while a lazy page chunk downloads; the new page fades in (useRouteFade in ./routeScroll).
 */


export function RouteScroll() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search) return;
      const behavior: ScrollBehavior = prefersReduced() ? 'auto' : 'smooth';
      if (url.hash && url.hash !== '#main') {
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior, block: 'start' });
        window.history.replaceState(window.history.state, '', url.href);
      } else if (!url.hash) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior });
      } else {
        return;
      }
      window.dispatchEvent(new CustomEvent(SAME_PAGE_NAV_EVENT));
    };
    // Capture phase: runs before the router's Link handler, which then sees defaultPrevented and stays put.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return <ScrollRestoration />;
}

/** Thin line under the header while the next page loads (only if it takes longer than ~150 ms). */
export function RouteProgress() {
  const t = useT('common');
  const loading = useNavigation().state === 'loading';
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle');

  useEffect(() => {
    if (loading) {
      const timer = window.setTimeout(() => setPhase('run'), 150);
      return () => window.clearTimeout(timer);
    }
    setPhase((p) => (p === 'run' ? 'done' : 'idle'));
    const timer = window.setTimeout(() => setPhase('idle'), 450);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (phase === 'idle') return null;
  return (
    <div role="progressbar" aria-label={t('nav.pageLoading')} aria-busy={phase === 'run'} className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px]">
      <div className={cn('route-progress h-full origin-left', phase === 'done' && 'route-progress--done')} />
    </div>
  );
}

/**
 * Floating "back to top" with a ring that fills as the page is read. Appears after ~1.5 screens and stays through the
 * footer (it is the page's only back-to-top control).
 */
export function BackToTop({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const t = useT('common');
  const ringRef = useRef<SVGCircleElement>(null);
  const [show, setShow] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      ringRef.current?.style.setProperty('stroke-dashoffset', String(100 - (max > 0 ? Math.min(1, y / max) : 0) * 100));
      setShow(y > window.innerHeight * 1.5);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  const dark = tone === 'dark';
  return (
    <button
      type="button"
      aria-label={t('nav.backToTop')}
      title={t('nav.backToTop')}
      tabIndex={show ? 0 : -1}
      aria-hidden={show ? undefined : true}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' });
        document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
      }}
      className={cn(
        'fixed bottom-5 right-4 z-30 inline-flex size-14 items-center justify-center rounded-full shadow-[0_12px_30px_-12px_rgba(8,12,11,0.5)] transition-[opacity,transform,background-color] duration-300 sm:bottom-6 sm:right-6',
        dark ? 'bg-[#151c1a]/90 text-night-ink ring-1 ring-white/20 backdrop-blur-md hover:bg-[#151c1a]' : 'bg-paper text-heritage ring-1 ring-line hover:bg-cream',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
        <circle cx="18" cy="18" r="16" fill="none" strokeWidth="1.5" className={dark ? 'stroke-white/15' : 'stroke-heritage/15'} />
        <circle ref={ringRef} cx="18" cy="18" r="16" fill="none" strokeWidth="1.5" pathLength={100} strokeDasharray="100" strokeDashoffset="100" strokeLinecap="round" className="stroke-current" />
      </svg>
      <ArrowUp className="size-5" />
    </button>
  );
}
