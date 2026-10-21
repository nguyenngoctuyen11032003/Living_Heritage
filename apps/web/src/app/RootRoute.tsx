import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useLocale, useT } from '@/i18n';

/** Localized fallback for <title> and <meta name="description">: "<brand> — <tagline>". */
function useDefaultDocumentTitle() {
  const t = useT('common');
  const { locale } = useLocale();
  const { pathname } = useLocation();
  // Layout effect: runs before the pages' passive effects, so a page's own title (`${page} — ${brand}`) always wins,
  // while pages that set none no longer inherit the previous page's title.
  useLayoutEffect(() => {
    document.title = `${t('brand.name')} — ${t('brand.tagline')}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('brand.description'));
  }, [t, locale, pathname]);
}

/** Root route element: resets the document title on every navigation and locale change. */
export function RootRoute() {
  useDefaultDocumentTitle();
  return <Outlet />;
}
