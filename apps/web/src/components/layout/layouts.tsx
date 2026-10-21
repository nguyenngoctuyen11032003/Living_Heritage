// Route layouts (lead-owned). See routes/types.ts for which area routes go where.
import { BookOpen, Compass, Home, Images, Mic, Settings, Shield, TreeDeciduous, Users, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useT } from '@/i18n';
import { RequireAuth } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { TextScaleSwitch } from './TextScaleSwitch';

export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

/** Admin flag for showing the admin entry (the admin page itself re-checks on the server). */
function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    void getSupabase()?.rpc('is_admin').then(({ data }) => alive && setAdmin(data === true));
    return () => {
      alive = false;
    };
  }, []);
  return admin;
}

const MOBILE_TABS = ['/gia-dinh', '/gia-dinh/nguoi-ke', '/sach', '/kham-pha', '/cai-dat'] as const;

export function AppShell() {
  const t = useT('common');
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const allItems: Array<{ to: string; label: string; tab?: string; icon: typeof Home; end?: boolean }> = [
    { to: '/gia-dinh', label: t('nav.family'), tab: t('tabs.family'), icon: Home, end: true },
    { to: '/gia-dinh/nguoi-ke', label: t('nav.narrators'), tab: t('tabs.narrators'), icon: Mic },
    { to: '/gia-dinh/thanh-vien', label: t('nav.members'), icon: Users },
    { to: '/gia-dinh/album', label: t('nav.album'), icon: Images },
    { to: '/gia-dinh/cay-gia-dinh', label: t('nav.tree'), icon: TreeDeciduous },
    { to: '/sach', label: t('nav.books'), tab: t('tabs.books'), icon: BookOpen },
    { to: '/kham-pha', label: t('nav.explore'), tab: t('tabs.explore'), icon: Compass },
    { to: '/quan-tri', label: t('nav.admin'), icon: Shield },
    { to: '/cai-dat', label: t('nav.settings'), tab: t('tabs.settings'), icon: Settings },
  ];
  const items = allItems.filter((i) => i.to !== '/quan-tri' || isAdmin);
  async function logout() {
    await getSupabase()?.auth.signOut();
    navigate('/');
  }
  return (
    <RequireAuth>
      <div className="flex min-h-dvh bg-cream">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-paper/60 px-4 py-5 lg:flex">
          <Logo />
          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label={t('nav.appNav')}>
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn('flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.875rem] leading-snug transition-colors', isActive ? 'bg-mint font-semibold text-heritage-deep' : 'text-ink-soft hover:bg-mint/50 hover:text-heritage-deep')
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <LanguageSwitch />
            <button type="button" onClick={logout} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.875rem] text-ink-soft transition-colors hover:bg-mint/50 hover:text-heritage-deep">
              <UserRound className="size-5" aria-hidden="true" />
              {t('nav.logout')}
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-cream/90 px-4 backdrop-blur md:px-8 lg:hidden">
            <Logo />
            <LanguageSwitch />
          </header>
          <main id="main" className="flex-1 px-4 py-6 pb-24 md:px-8 lg:pb-8">
            <Outlet />
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 backdrop-blur lg:hidden" aria-label={t('nav.appNav')}>
            {items.filter((i) => (MOBILE_TABS as readonly string[]).includes(i.to)).map(({ to, label, tab, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5 text-center text-[0.78rem] leading-tight transition-colors',
                    isActive ? 'font-semibold text-heritage before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full before:bg-heritage' : 'text-ink-soft hover:text-heritage',
                  )
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                <span aria-hidden="true" className="line-clamp-2 max-w-full hyphens-auto break-words">{tab ?? label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </RequireAuth>
  );
}

/** Storytelling mode: minimal chrome (back, language, text size), large type. */
export function NarratorShell() {
  return (
    <RequireAuth allowAnonymous>
      <div className="narrator-mode flex min-h-dvh flex-col bg-cream">
        <header className="flex min-h-16 items-center justify-between gap-2 border-b border-line px-4 py-2 md:px-8">
          <Logo compact />
          <div className="flex items-center gap-2">
            <TextScaleSwitch />
            <LanguageSwitch size="lg" />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:py-12">
          <Outlet />
        </main>
      </div>
    </RequireAuth>
  );
}
