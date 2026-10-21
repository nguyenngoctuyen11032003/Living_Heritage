import { useLayoutEffect, useSyncExternalStore } from 'react';

// Light / dark theme for the signed-in app. The choice is remembered in localStorage; with no stored choice the
// system preference (prefers-color-scheme) wins. Applied as html[data-theme] (design/tokens.css redefines the
// colour tokens for 'dark'), but only while the app shell is mounted (useApplyTheme), so the public site keeps
// its own light/night design. One shared store, so every ThemeToggle on the page shows the same choice.

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'lh.theme';

const listeners = new Set<() => void>();
const DARK_QUERY = '(prefers-color-scheme: dark)';
/** Fallback when storage is blocked, so the toggle still works for this page view. */
let memory: Theme | null = null;

function isTheme(v: unknown): v is Theme {
  return v === 'light' || v === 'dark';
}

function systemTheme(): Theme {
  try {
    return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Stored choice, else the system preference. */
export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    /* storage blocked */
  }
  return memory ?? systemTheme();
}

/** Persist and broadcast a theme. */
export function setTheme(next: Theme): void {
  memory = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage blocked */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Follow system changes while the user has not chosen explicitly.
  let mq: MediaQueryList | undefined;
  try {
    mq = window.matchMedia?.(DARK_QUERY);
    mq?.addEventListener?.('change', listener);
  } catch {
    /* no matchMedia */
  }
  return () => {
    listeners.delete(listener);
    mq?.removeEventListener?.('change', listener);
  };
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as Theme);
  return [theme, setTheme];
}

/** Sets html[data-theme] (and the browser UI colour) for the whole site: landing, app and storyteller screens. */
export function useApplyTheme(): void {
  const [theme] = useTheme();
  // Layout effect: applied before paint. index.html sets the same attribute before any JS loads, so there is no flash.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const flip = root.dataset.theme !== undefined && root.dataset.theme !== theme;
    // Flip every colour in one frame: otherwise each transition-colors element animates (and repaints) separately.
    if (flip) root.classList.add('theme-switching');
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111A17' : '#FAF7F0');
    if (!flip) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('theme-switching');
    };
  }, [theme]);
}
