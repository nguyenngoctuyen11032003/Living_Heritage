// Phase 0 shell. Workstream C restyles this file (keep the exported name and props).
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';

export function SiteHeader() {
  const t = useT('common');
  const { user, isAnonymous } = useSession();
  const [open, setOpen] = useState(false);
  const links = [
    { to: '/cach-hoat-dong', label: t('nav.howItWorks') },
    { to: '/kham-pha', label: t('nav.explore') },
    { to: '/sach-ky-uc', label: t('nav.books') },
    { to: '/to-chuc', label: t('nav.organizations') },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-full focus:bg-heritage focus:px-4 focus:py-2 focus:text-cream">
        {t('nav.skipToContent')}
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-8">
        <Logo />
        <nav className="hidden flex-1 justify-center gap-7 text-[15px] lg:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('text-ink-soft transition-colors hover:text-heritage', isActive && 'text-heritage font-medium')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LanguageSwitch className="hidden sm:inline-flex" />
          {user && !isAnonymous ? (
            <Link to="/gia-dinh" className="rounded-full bg-heritage px-4 py-2 text-[15px] font-medium text-cream hover:bg-heritage-deep">
              {t('nav.family')}
            </Link>
          ) : (
            <>
              <Link to="/dang-nhap" className="hidden rounded-full bg-paper px-4 py-2 text-[15px] font-medium text-ink ring-1 ring-line hover:ring-heritage sm:inline-block">
                {t('nav.login')}
              </Link>
              <Link to="/dang-ky" className="rounded-full bg-heritage px-4 py-2 text-[15px] font-medium text-cream hover:bg-heritage-deep">
                {t('nav.start')}
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full ring-1 ring-line lg:hidden"
            aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line bg-cream px-4 py-4 lg:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-lg hover:bg-mint/60">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <LanguageSwitch className="mt-3" />
        </nav>
      )}
    </header>
  );
}
