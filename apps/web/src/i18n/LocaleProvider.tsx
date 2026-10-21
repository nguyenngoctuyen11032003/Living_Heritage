import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadedNamespaces, loadNamespace, loadNamespaces, NAMESPACES, type Namespace } from './dictionaries';
import { LOCALES, type Locale } from './types';

export const LOCALE_STORAGE_KEY = 'lh.locale';

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch {
    /* storage blocked */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'vi';
  return nav.startsWith('en') ? 'en' : 'vi';
}

/** The language on screen (set by LocaleProvider); before it mounts, the one it will pick. */
let active: Locale | null = null;

/** Starts downloading dictionaries in the current language, e.g. from a route's lazy() next to its page chunk. */
export function preloadNamespaces(namespaces: readonly Namespace[]): Promise<unknown> {
  return loadNamespaces(active ?? detectLocale(), namespaces).catch(() => {});
}

export function LocaleProvider({ children, initial }: { children: ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const l = initial ?? detectLocale();
    void loadNamespace(l, 'common'); // every page needs it: start the download before the first render asks
    return l;
  });
  const localeRef = useRef(locale);

  useEffect(() => {
    active = locale;
    localeRef.current = locale;
    document.documentElement.lang = locale;
    // After the first paint, fetch the rest of this language while the browser is idle: later pages render at once.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => void loadNamespaces(locale, NAMESPACES).catch(() => {}));
    return () => cancel(id);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* storage blocked */
    }
    // Load what is on screen in the new language first, then switch: the page never blanks or shows raw keys.
    const switchTo = () => setLocaleState(next);
    void loadNamespaces(next, loadedNamespaces(localeRef.current)).then(switchTo, switchTo);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
