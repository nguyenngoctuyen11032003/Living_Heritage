import { useEffect } from 'react';
import { useLocale } from '@/i18n';

const INSTRUMENT_SERIF = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap';

/**
 * Display serif of the cinematic marketing pages (/sach-ky-uc, /cach-hoat-dong, /kham-pha, /to-chuc). Instrument Serif
 * has no Vietnamese glyphs (no U+1EA0–U+1EF1), so it is only fetched for English; Vietnamese headings use the bundled
 * Noto Serif (see `.mb-display` and design/landing-body.css).
 */
export function useDisplayFont() {
  const { locale } = useLocale();
  const enabled = locale === 'en';
  useEffect(() => {
    if (!enabled || typeof document === 'undefined' || document.getElementById('font-instrument-serif')) return;
    const link = document.createElement('link');
    link.id = 'font-instrument-serif';
    link.rel = 'stylesheet';
    link.href = INSTRUMENT_SERIF;
    document.head.appendChild(link);
  }, [enabled]);
}
