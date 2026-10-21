import { useEffect } from 'react';
import { MbAbout, MbCta, MbFaq, MbFeatured, MbFormats, MbHero, MbPhilosophy, MbShowcase, MbSteps, VideoPlaybackProvider } from '@/components/memory-book';
import { useLocale, useT } from '@/i18n';
import { useDocumentTitle } from './hooks';

const INSTRUMENT_SERIF = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap';

/**
 * Instrument Serif (display face of this page) has no Vietnamese glyphs, so it is only fetched for English; Vietnamese
 * headings use the bundled Noto Serif (see memory-book.css).
 */
function useInstrumentSerif(enabled: boolean) {
  useEffect(() => {
    if (!enabled || document.getElementById('font-instrument-serif')) return;
    const link = document.createElement('link');
    link.id = 'font-instrument-serif';
    link.rel = 'stylesheet';
    link.href = INSTRUMENT_SERIF;
    document.head.appendChild(link);
  }, [enabled]);
}

/** /sach-ky-uc — cinematic marketing page (light and dark) for memory books. */
export default function MemoryBookPage() {
  const t = useT('legal');
  const { locale } = useLocale();
  useDocumentTitle(t('book.title'));
  useInstrumentSerif(locale === 'en');
  return (
    <VideoPlaybackProvider>
      <div className="mb-page bg-mb-bg text-mb">
        <MbHero />
        <MbAbout />
        <MbFeatured />
        <MbShowcase />
        <MbSteps />
        <MbPhilosophy />
        <MbFormats />
        <MbCta />
        <MbFaq keys={['who', 'delete', 'paid']} />
      </div>
    </VideoPlaybackProvider>
  );
}
