import { useCallback } from 'react';
import { useLocale, type Locale } from '@/i18n';

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function useDateTime() {
  const { locale } = useLocale();
  return useCallback((iso: string) => formatDateTime(iso, locale), [locale]);
}
