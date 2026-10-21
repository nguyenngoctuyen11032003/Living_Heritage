// Public site header (restyled by Workstream C; export name kept).
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { TextScaleSwitch } from './TextScaleSwitch';
import { ThemeToggle } from './ThemeToggle';

// No display class in `pill`: each use adds its own (`inline-flex`, or `hidden md:inline-flex`).
const pill = 'min-h-12 items-center whitespace-nowrap justify-center rounded-full px-5 text-[0.88rem] font-semibold transition-colors duration-200';

/**
 * Transparent over the hero, solid cream once the page scrolls (no backdrop blur: it re-filters on every scroll frame).
 * Logo left, nav centred, language + auth right; sheet menu on mobile.
 * `tone="dark"` (route-driven from SiteLayout, e.g. /sach-ky-uc): light text and controls over a dark hero, white focus
 * ring; once scrolled a translucent black bar — the only header state that uses a backdrop blur.
 */
export function SiteHeader({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  const t = useT('common');
  const { user, isAnonymous } = useSession();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lastPath, setLastPath] = useState(location.pathname);

  // Close the mobile menu on navigation.
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const links = [
    { to: '/cach-hoat-dong', label: t('nav.howItWorks') },
    { to: '/kham-pha', label: t('nav.explore') },
    { to: '/sach-ky-uc', label: t('nav.books') },
    { to: '/to-chuc', label: t('nav.organizations') },
  ];
  const signedIn = Boolean(user && !isAnonymous);
  const solid = scrolled || open;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,box-shadow] duration-200',
        dark
          ? cn('text-night-ink', solid ? 'bg-black/70 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md' : 'bg-transparent')
          : solid
            ? 'bg-cream shadow-[0_1px_0_var(--line)]'
            : 'bg-transparent',
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-heritage focus:px-5 focus:py-3 focus:text-cream"
      >
        {t('nav.skipToContent')}
      </a>
      {/*
        Breakpoints are container queries in em (em = the header's own font size), not viewport media queries, so the
        header collapses on available space: with large text (browser text-only zoom 200%) the desktop nav folds into the
        menu and the wordmark yields to the mark. At the default 18px they match the old sm/md/xl/2xl (640/768/1280/1536px).
      */}
      <div className="@container">
        <div
          className={cn(
            'mx-auto grid min-h-[4.5rem] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 lg:px-8 @min-[71em]:grid-cols-[auto_1fr_auto] @min-[85em]:grid-cols-[1fr_auto_1fr]',
            // White focus ring on the dark bar only; the cream mobile sheet keeps the default terracotta ring.
            dark && '[&_:focus-visible]:outline-white',
          )}
        >
          <Logo wordmark="container" tone={tone} className="min-w-0" />
          <nav className="hidden justify-center @min-[71em]:flex" aria-label={t('nav.menu')}>
            <ul className={cn('flex items-center gap-1 rounded-full p-1 ring-1', dark ? 'bg-white/10 ring-white/15' : 'bg-paper/80 ring-line/80')}>
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      cn('inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-3.5 text-[0.84rem] font-medium @min-[85em]:px-4 transition-colors', dark
                          ? isActive
                            ? 'bg-night-ink text-night'
                            : 'text-night-ink/85 hover:bg-white/10 hover:text-white'
                          : isActive
                            ? 'bg-heritage text-cream'
                            : 'text-ink-soft hover:bg-mint/70 hover:text-heritage-deep')
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex shrink-0 items-center justify-end gap-2">
            {/* Below sm the language choice lives in the menu. */}
            <div className="hidden @min-[36em]:block">
              <LanguageSwitch tone={tone} />
            </div>
            {/* ThemeToggle has no dark tone: recolour its pill and icon from outside for the dark header. */}
            <span className={cn('inline-flex', dark && '[&>div]:bg-white/10 [&>div]:ring-white/15 [&_button]:text-night-ink/85 [&_button:hover]:text-white')}>
              <ThemeToggle />
            </span>
            {signedIn ? (
              <Link to="/gia-dinh" className={cn(pill, 'inline-flex', dark ? 'bg-night-ink text-night hover:bg-white' : 'bg-heritage text-cream hover:bg-heritage-deep')}>
                {t('nav.family')}
              </Link>
            ) : (
              <>
                <Link
                  to="/dang-nhap"
                  className={cn(
                    pill,
                    'hidden ring-1 @min-[43em]:inline-flex',
                    dark ? 'bg-white/10 text-night-ink ring-white/20 hover:bg-white/15 hover:text-white' : 'bg-paper text-ink ring-line hover:text-heritage hover:ring-heritage/50',
                  )}
                >
                  {t('nav.login')}
                </Link>
                <Link to="/bat-dau" className={cn(pill, 'hidden @min-[36em]:inline-flex', dark ? 'bg-night-ink text-night hover:bg-white' : 'bg-heritage text-cream hover:bg-heritage-deep')}>
                  {t('nav.start')}
                </Link>
              </>
            )}
            <button
              type="button"
              className={cn(
                'inline-flex size-12 items-center justify-center rounded-full ring-1 @min-[71em]:hidden',
                dark ? 'bg-white/10 text-night-ink ring-white/20' : 'bg-paper ring-line',
              )}
              aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open && (
            <nav
              id="mobile-menu"
              aria-label={t('nav.menu')}
              className="absolute inset-x-0 top-full animate-drop-in border-t border-line bg-cream px-4 pb-6 pt-3 shadow-[0_24px_40px_-24px_rgba(18,27,24,0.35)] @min-[71em]:hidden"
            >
              <ul className="flex flex-col">
                {links.map((l) => (
                  <li key={l.to}>
                    <NavLink
                      to={l.to}
                      className={({ isActive }) =>
                        cn('flex min-h-14 items-center rounded-2xl px-4 text-[1.1rem] font-medium', isActive ? 'bg-mint text-heritage-deep' : 'text-ink hover:bg-mint/60')
                      }
                    >
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                {!signedIn && (
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/dang-nhap" className={cn(pill, 'inline-flex bg-paper text-ink ring-1 ring-line')}>
                      {t('nav.login')}
                    </Link>
                    <Link to="/bat-dau" className={cn(pill, 'inline-flex bg-heritage text-cream')}>
                      {t('nav.start')}
                    </Link>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[0.85rem] text-ink-soft">{t('lang.label')}</span>
                  <LanguageSwitch />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[0.85rem] text-ink-soft">{t('textScale.label')}</span>
                  <TextScaleSwitch />
                </div>
              </div>
            </nav>
        )}
      </div>
    </header>
  );
}
