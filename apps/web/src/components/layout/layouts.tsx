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

/** Mobile tab bar: route → short label key (nav.short.*), so labels fit 72px tabs at 360px without truncation. */
const MOBILE_TABS = {
  '/gia-dinh': 'nav.short.family',
  '/gia-dinh/nguoi-ke': 'nav.short.narrators',
  '/sach': 'nav.short.books',
  '/kham-pha': 'nav.short.explore',
  '/cai-dat': 'nav.short.settings',
} as const;
type MobileTab = keyof typeof MOBILE_TABS;
const isMobileTab = (to: string): to is MobileTab => to in MOBILE_TABS;

export function AppShell() {
  const t = useT('common');
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const allItems = [
    { to: '/gia-dinh', label: t('nav.family'), icon: Home, end: true },
    { to: '/gia-dinh/nguoi-ke', label: t('nav.narrators'), icon: Mic },
    { to: '/gia-dinh/thanh-vien', label: t('nav.members'), icon: Users },
    { to: '/gia-dinh/album', label: t('nav.album'), icon: Images },
    { to: '/gia-dinh/cay-gia-dinh', label: t('nav.tree'), icon: TreeDeciduous },
    { to: '/sach', label: t('nav.books'), icon: BookOpen },
    { to: '/kham-pha', label: t('nav.explore'), icon: Compass },
    { to: '/quan-tri', label: t('nav.admin'), icon: Shield },
    { to: '/cai-dat', label: t('nav.settings'), icon: Settings },
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
          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="App">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn('flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors', isActive ? 'bg-mint text-heritage-deep font-medium' : 'text-ink-soft hover:bg-mint/50')
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <LanguageSwitch />
            <button type="button" onClick={logout} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] text-ink-soft hover:bg-mint/50">
              <UserRound className="size-5" aria-hidden="true" />
              {t('nav.logout')}
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 min-w-0 items-center justify-between gap-3 border-b border-line px-4 lg:hidden">
            <Logo className="min-w-0" />
            <LanguageSwitch />
          </header>
          <main id="main" className="flex-1 px-4 py-6 pb-24 md:px-8 lg:pb-8">
            <Outlet />
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 backdrop-blur lg:hidden" aria-label="App mobile">
            {items.map(({ to, icon: Icon, end }) =>
              isMobileTab(to) ? (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn('flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center text-[12px] leading-tight', isActive ? 'text-heritage font-semibold' : 'text-ink-soft')
                  }
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{t(MOBILE_TABS[to])}</span>
                </NavLink>
              ) : null,
            )}
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
        {/* At 360px in English the wordmark + both switches don't fit: show only the mark below sm; controls never shrink. */}
        <header className="flex min-h-16 min-w-0 items-center justify-between gap-3 border-b border-line px-4 py-2 md:px-8">
          <Logo wordmark="sm" className="min-w-0" />
          <div className="flex shrink-0 items-center gap-2">
            <TextScaleSwitch />
            <LanguageSwitch />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:py-12">
          <Outlet />
        </main>
      </div>
    </RequireAuth>
  );
}
