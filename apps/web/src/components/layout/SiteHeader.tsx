// Public site header (restyled by Workstream C; export name kept).
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';

const pill = 'min-h-12 items-center whitespace-nowrap justify-center rounded-full px-5 text-[0.88rem] font-semibold transition-colors duration-200';

/** Transparent over the hero, cream + blur once the page scrolls. Logo left, nav centred, language + auth right; sheet menu on mobile. */
export function SiteHeader() {
  const t = useT('common');
  const { user, isAnonymous } = useSession();
  const reduced = useReducedMotionSafe();
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
    <motion.header
      initial={reduced ? false : { y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
      className={cn(
        'sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300',
        solid ? 'bg-cream/85 shadow-[0_1px_0_var(--line)] backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-heritage focus:px-5 focus:py-3 focus:text-cream"
      >
        {t('nav.skipToContent')}
      </a>
      <div className="mx-auto grid h-[4.5rem] max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8 xl:grid-cols-[auto_1fr_auto] 2xl:grid-cols-[1fr_auto_1fr]">
        <Logo className="whitespace-nowrap" />
        <nav className="hidden justify-center xl:flex" aria-label={t('nav.menu')}>
          <ul className="flex items-center gap-1 rounded-full bg-paper/60 p-1 ring-1 ring-line/80 backdrop-blur">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) =>
                    cn('inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-3.5 text-[0.84rem] font-medium 2xl:px-4 transition-colors', isActive ? 'bg-heritage text-cream' : 'text-ink-soft hover:bg-mint/70 hover:text-heritage-deep')
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-end gap-2">
          <div className="hidden sm:block">
            <LanguageSwitch />
          </div>
          {signedIn ? (
            <Link to="/gia-dinh" className={cn(pill, 'inline-flex bg-heritage text-cream hover:bg-heritage-deep')}>
              {t('nav.family')}
            </Link>
          ) : (
            <>
              <Link to="/dang-nhap" className={cn(pill, 'hidden bg-paper text-ink ring-1 ring-line hover:text-heritage hover:ring-heritage/50 md:inline-flex')}>
                {t('nav.login')}
              </Link>
              <Link to="/dang-ky" className={cn(pill, 'hidden bg-heritage text-cream hover:bg-heritage-deep sm:inline-flex')}>
                {t('nav.start')}
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex size-12 items-center justify-center rounded-full bg-paper ring-1 ring-line xl:hidden"
            aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label={t('nav.menu')}
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="absolute inset-x-0 top-full border-t border-line bg-cream px-4 pb-6 pt-3 shadow-[0_24px_40px_-24px_rgba(18,27,24,0.35)] xl:hidden"
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
                  <Link to="/dang-ky" className={cn(pill, 'inline-flex bg-heritage text-cream')}>
                    {t('nav.start')}
                  </Link>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[0.85rem] text-ink-soft">{t('lang.label')}</span>
                <LanguageSwitch />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
