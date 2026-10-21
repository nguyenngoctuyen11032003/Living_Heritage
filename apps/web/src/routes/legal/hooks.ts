import { useEffect } from 'react';
import { useDict, useT } from '@/i18n';

/** Typed access to the whole 'legal' dictionary for the current locale (for iterating sections). */
export function useLegalDict() {
  return useDict('legal');
}

export function useDocumentTitle(title: string) {
  const tc = useT('common');
  useEffect(() => {
    document.title = `${title} — ${tc('brand.name')}`;
  }, [title, tc]);
}
