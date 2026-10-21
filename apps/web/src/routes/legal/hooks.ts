import { useEffect } from 'react';
import { dictionaries } from '@/i18n/dictionaries';
import { useLocale, useT } from '@/i18n';

/** Typed access to the whole 'legal' dictionary for the current locale (for iterating sections). */
export function useLegalDict() {
  const { locale } = useLocale();
  return dictionaries[locale].legal;
}

export function useDocumentTitle(title: string) {
  const tc = useT('common');
  useEffect(() => {
    document.title = `${title} — ${tc('brand.name')}`;
  }, [title, tc]);
}
