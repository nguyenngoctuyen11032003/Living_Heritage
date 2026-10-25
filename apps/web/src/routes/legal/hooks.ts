import { useEffect } from 'react';
import { useDict } from '@/i18n';

/** Typed access to the whole 'legal' dictionary for the current locale (for iterating sections). */
export function useLegalDict() {
  return useDict('legal');
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
