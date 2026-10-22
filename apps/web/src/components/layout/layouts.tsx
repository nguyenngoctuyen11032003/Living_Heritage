// Route layouts (lead-owned). See routes/types.ts for which area routes go where.
import { BookOpen, ChevronDown, ChevronsLeft, ChevronsRight, Compass, Home, Images, Languages, LogOut, Menu, Mic, Moon, Settings, Shield, Sun, TreeDeciduous, Users } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatches, useNavigate } from 'react-router';
import { Dialog } from '@/components/ui/Dialog';
import { UserAvatar } from '@/features/settings/UserAvatar';
import { useLocale, useT } from '@/i18n';
import { avatarUrl, useMyProfile } from '@/lib/myProfile';
import { RequireAuth, useSession } from '@/lib/session';
import { useApplyTheme, useTheme } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { useDisplayFont } from '@/design/useDisplayFont';
import { DisplayMenu } from './DisplayMenu';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo, LogoMark } from './Logo';
import { NarratorHelpSlotContext } from './narratorHelpContext';
import { BackToTop, RouteProgress, RouteScroll } from './RouteChrome';
import { useRouteFade } from './routeScroll';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { ThemeToggle } from './ThemeToggle';

/** First focusable element of the AppShell and NarratorShell (SiteHeader renders its own). */
function SkipLink() {
  const t = useT('common');
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-heritage focus:px-5 focus:py-3 focus:text-cream"
    >
      {t('nav.skipToContent')}
    </a>
  );
}

/**
 * The homepage and the four cinematic marketing pages share the /sach-ky-uc dark treatment (black page, cream/white header and controls).
 * Opt in with a route `handle: { headerTone: 'dark' }` or here.
 */
const DARK_HEADER_PATHS = new Set(['/', '/sach-ky-uc', '/cach-hoat-dong', '/kham-pha', '/to-chuc']);

function useHeaderTone(): 'light' | 'dark' {
  const { pathname } = useLocation();
  const matches = useMatches();
  const fromHandle = matches.some((m) => (m.handle as { headerTone?: string } | undefined)?.headerTone === 'dark');
  const [theme] = useTheme();
  // The dark hero only exists in the dark theme; the light theme gets a cream hero under the normal header.
  return theme === 'dark' && (fromHandle || DARK_HEADER_PATHS.has(pathname.replace(/\/+$/, '') || '/')) ? 'dark' : 'light';
}

export function SiteLayout() {
  const tone = useHeaderTone();
  const mainRef = useRef<HTMLElement>(null);
  useDisplayFont();
  useRouteFade(mainRef);
  useEffect(() => {
    if (tone !== 'dark') return;
    document.documentElement.dataset.pageTone = 'dark';
    return () => {
      delete document.documentElement.dataset.pageTone;
    };
  }, [tone]);
  return (
    <div className="flex min-h-dvh flex-col">
      <RouteScroll />
      <RouteProgress />
      <SiteHeader tone={tone} />
      <main ref={mainRef} id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <BackToTop tone={tone} />
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

/**
 * Mobile tab bar: route → short label key (nav.short.*), so labels fit 72px tabs at 360px without truncation.
 * The fifth tab is "Thêm / More", a sheet listing every section (members, album, tree, settings, admin…).
 */
const MOBILE_TABS = {
  '/gia-dinh': 'nav.short.family',
  '/gia-dinh/nguoi-ke': 'nav.short.narrators',
  '/sach': 'nav.short.books',
  '/kham-pha': 'nav.short.explore',
} as const;
type MobileTab = keyof typeof MOBILE_TABS;
const isMobileTab = (to: string): to is MobileTab => to in MOBILE_TABS;

/** Full name from the profile row, else from sign-up / OAuth metadata. Never the email. */
function fullNameOf(profileName: string | null | undefined, meta: Record<string, unknown> | undefined): string | null {
  for (const v of [profileName, meta?.display_name, meta?.full_name, meta?.name]) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

const menuRow = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[0.78rem] text-ink transition-colors hover:bg-mint/60';

/**
 * Sidebar account button: photo + full name + email, with a chevron. Clicking it opens a menu ABOVE the button
 * (profile & settings, language, light/dark, log out). Closes on outside click, Escape, or navigation.
 */
function SidebarAccount({ onLogout, collapsed }: { onLogout: () => void; collapsed: boolean }) {
  const t = useT('common');
  const { user } = useSession();
  const profile = useMyProfile();
  const { locale, setLocale } = useLocale();
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const menuId = useId();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const fullName = fullNameOf(profile?.displayName, user.user_metadata);
  const dark = theme === 'dark';
  return (
    <div ref={rootRef} className="relative">
      {open && (
        <div
          id={menuId}
          aria-label={t('account.menu')}
          className={cn('absolute bottom-full z-40 mb-2 rounded-2xl bg-paper p-1.5 shadow-[0_12px_32px_-8px_rgba(22,58,49,0.25)] ring-1 ring-line', collapsed ? 'left-0 w-64' : 'inset-x-0')}
        >
          <NavLink to="/cai-dat" className={menuRow}>
            <Settings className="size-[18px] shrink-0 text-ink-soft" aria-hidden="true" />
            {t('account.settings')}
          </NavLink>
          <div className="flex min-h-11 items-center gap-3 px-3 text-[0.78rem] text-ink">
            <Languages className="size-[18px] shrink-0 text-ink-soft" aria-hidden="true" />
            <span className="flex-1">{t('lang.label')}</span>
            <div role="group" aria-label={t('lang.label')} className="flex rounded-full bg-heritage/8 p-0.5 text-[12px] font-semibold ring-1 ring-line">
              {(['vi', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  lang={l}
                  aria-pressed={locale === l}
                  title={t(`lang.${l}`)}
                  onClick={() => setLocale(l)}
                  className={cn(
                    'min-h-7 min-w-9 rounded-full px-2 uppercase transition-colors',
                    locale === l ? 'bg-heritage text-cream' : 'text-ink-soft hover:text-heritage',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button type="button" role="switch" aria-checked={dark} onClick={() => setTheme(dark ? 'light' : 'dark')} className={menuRow}>
            {dark ? <Moon className="size-[18px] shrink-0 text-ink-soft" aria-hidden="true" /> : <Sun className="size-[18px] shrink-0 text-ink-soft" aria-hidden="true" />}
            <span className="flex-1 text-left">{t('account.darkMode')}</span>
            <span className={cn('relative block h-6 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-line transition-colors', dark ? 'bg-heritage' : 'bg-ink-soft/25')} aria-hidden="true">
              <span className={cn('absolute top-1 left-1 block size-4 rounded-full bg-white shadow-sm transition-transform duration-200', dark && 'translate-x-5')} />
            </span>
          </button>
          <div className="mx-3 my-1 h-px bg-line" />
          <button type="button" onClick={onLogout} className={cn(menuRow, 'hover:bg-terracotta/10 hover:text-terracotta')}>
            <LogOut className="size-[18px] shrink-0" aria-hidden="true" />
            {t('nav.logout')}
          </button>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? (fullName ?? user.email ?? undefined) : undefined}
        className={cn('flex min-h-14 w-full min-w-0 items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-mint/50', collapsed && 'justify-center px-0', open && 'bg-mint/60')}
      >
        <UserAvatar src={avatarUrl(profile?.avatarPath)} name={fullName ?? user.email} seed={user.id} size="sm" className="size-10" />
        <span className={cn('min-w-0 flex-1 flex-col leading-tight', collapsed ? 'sr-only' : 'flex')}>
          <span className={cn('truncate text-[0.85rem] font-semibold', fullName ? 'text-ink' : 'text-heritage')}>{fullName ?? t('account.addName')}</span>
          {user.email && <span className="mt-0.5 truncate text-[12.5px] text-ink-soft">{user.email}</span>}
        </span>
        {!collapsed && <ChevronDown className={cn('size-4 shrink-0 text-ink-soft transition-transform', open && 'rotate-180')} aria-hidden="true" />}
      </button>
    </div>
  );
}

const SIDEBAR_KEY = 'lh.sidebar';
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

export function AppShell() {
  const t = useT('common');
  const [collapsed, setCollapsed] = useState(readCollapsed);
  function toggleSidebar() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? 'open' : 'collapsed');
      } catch {
        /* storage blocked */
      }
      return !c;
    });
  }
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  useApplyTheme();
  useDisplayFont();
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
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  // The More tab is "current" on the sections that live only in the sheet (members, album, tree, admin, settings).
  const inMore = items.some(({ to }) => !isMobileTab(to) && (pathname === to || pathname.startsWith(`${to}/`)));
  async function logout() {
    setMoreOpen(false);
    await getSupabase()?.auth.signOut();
    navigate('/');
  }
  return (
    <RequireAuth>
      <RouteScroll />
      <RouteProgress />
      <SkipLink />
      <div className="flex min-h-dvh bg-cream">
        <aside className={cn('sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-paper/60 py-5 lg:flex', collapsed ? 'w-[76px] px-3' : 'w-64 px-4')}>
          {collapsed ? (
            <Link to="/" aria-label={t('brand.name')} className="flex min-h-11 items-center justify-center text-heritage">
              <LogoMark />
            </Link>
          ) : (
            <Logo />
          )}
          <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label={t('nav.appNav')}>
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn('flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.85rem] transition-colors', collapsed && 'justify-center px-0', isActive ? 'bg-mint text-heritage-deep font-medium' : 'text-ink-soft hover:bg-mint/50')
                }
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {!collapsed && label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4">
            <SidebarAccount onLogout={logout} collapsed={collapsed} />
            <button
              type="button"
              onClick={toggleSidebar}
              aria-expanded={!collapsed}
              aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
              title={collapsed ? t('nav.expand') : undefined}
              className={cn('mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[0.78rem] text-ink-soft transition-colors hover:bg-mint/50 hover:text-ink', collapsed && 'justify-center px-0')}
            >
              {collapsed ? <ChevronsRight className="size-[18px]" aria-hidden="true" /> : <ChevronsLeft className="size-[18px]" aria-hidden="true" />}
              {!collapsed && t('nav.collapse')}
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Below sm: mark-only logo + one labelled "Hiển thị" button (language, theme), so it stays one row at every text size. */}
          <header className="flex min-h-14 min-w-0 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-1.5 lg:hidden">
            <Logo wordmark="sm" className="min-w-0" />
            <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
              <DisplayMenu className="sm:hidden" />
              <div className="hidden items-center gap-2 sm:flex">
                <LanguageSwitch />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main id="main" className="flex-1 px-4 py-6 pb-24 md:px-8 lg:pb-8">
            <Outlet />
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper lg:hidden" aria-label={t('nav.appNav')}>
            {items.map(({ to, icon: Icon, end }) =>
              isMobileTab(to) ? (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn('flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center text-[0.7rem] leading-tight', isActive ? 'text-heritage font-semibold' : 'text-ink-soft')
                  }
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="max-w-full text-balance break-words">{t(MOBILE_TABS[to])}</span>
                </NavLink>
              ) : null,
            )}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                'flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center text-[0.7rem] leading-tight',
                inMore ? 'text-heritage font-semibold' : 'text-ink-soft',
              )}
            >
              <Menu className="size-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full text-balance break-words">{t('nav.short.more')}</span>
            </button>
          </nav>
          <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.moreTitle')} size="sm">
            <nav aria-label={t('nav.moreTitle')} className="pb-2">
              <ul className="flex flex-col gap-1">
                {items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        cn('flex min-h-12 items-center gap-3 rounded-xl px-3 text-[1rem]', isActive ? 'bg-mint font-semibold text-heritage-deep' : 'text-ink hover:bg-mint/50')
                      }
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      {label}
                    </NavLink>
                  </li>
                ))}
                <li className="mt-1 border-t border-line pt-2">
                  <button type="button" onClick={logout} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-[1rem] text-ink hover:bg-mint/50">
                    <LogOut className="size-5 shrink-0" aria-hidden="true" />
                    {t('nav.logout')}
                  </button>
                </li>
              </ul>
            </nav>
          </Dialog>
        </div>
      </div>
    </RequireAuth>
  );
}

/**
 * Storytelling mode: minimal chrome, large type (B3: only back, topic and help — no landing/pricing links).
 * The logo goes to /ke-chuyen, not the landing page. Pages put their Help control in the header with <NarratorHelpSlot>.
 */
export function NarratorShell() {
  useApplyTheme();
  useDisplayFont();
  const [helpSlot, setHelpSlot] = useState<HTMLElement | null>(null);
  return (
    <RequireAuth allowAnonymous>
      <RouteScroll />
      <RouteProgress />
      <SkipLink />
      <div className="narrator-mode flex min-h-dvh flex-col bg-cream">
        {/*
          One row at 360px (vi and en): mark-only logo, the page's labelled Help button (NarratorHelpSlot) and, below sm,
          a single labelled "Hiển thị / Display" button that holds language + theme. From sm up the switches sit inline.
          flex-wrap stays as a last resort for very large text.
        */}
        <header className="flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-x-[8px] gap-y-2 border-b border-line px-[16px] py-2 sm:gap-x-3 md:px-8">
          <Logo wordmark="sm" to="/ke-chuyen" className="min-w-0" />
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-[8px]">
            {/* Below sm the slotted Help button is held to a compact (still ≥48px, labelled) size so the header stays one row. */}
            <span ref={setHelpSlot} className="flex items-center empty:hidden max-sm:[&_button]:min-h-[48px] max-sm:[&_button]:gap-[6px] max-sm:[&_button]:px-[12px] max-sm:[&_button]:text-[17px] max-sm:[&_svg]:size-[20px]" />
            <DisplayMenu className="sm:hidden" />
            <div className="hidden items-center gap-2 sm:flex">
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:py-12">
          <NarratorHelpSlotContext.Provider value={helpSlot}>
            <Outlet />
          </NarratorHelpSlotContext.Provider>
        </main>
      </div>
    </RequireAuth>
  );
}
