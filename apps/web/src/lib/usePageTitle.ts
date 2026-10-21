import { useEffect } from 'react';
import { useT } from '@/i18n';

/**
 * Sets `document.title` to "<page> — <localized brand>".
 * An empty string shows the brand alone; null/undefined leaves the title untouched (e.g. while data loads).
 */
export function usePageTitle(page: string | null | undefined) {
  const brand = useT('common')('brand.name');
  useEffect(() => {
    if (page == null) return;
    document.title = page ? `${page} — ${brand}` : brand;
  }, [page, brand]);
}
