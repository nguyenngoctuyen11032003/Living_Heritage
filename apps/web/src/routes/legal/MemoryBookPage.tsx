import { MbAbout, MbCta, MbFaq, MbFeatured, MbFormats, MbHero, MbPhilosophy, MbShowcase, MbSteps, VideoPlaybackProvider } from '@/components/memory-book';
import { useDisplayFont } from '@/design/useDisplayFont';
import { useT } from '@/i18n';
import { useDocumentTitle } from './hooks';

/** /sach-ky-uc — cinematic marketing page (light and dark) for memory books. */
export default function MemoryBookPage() {
  const t = useT('legal');
  useDocumentTitle(t('book.title'));
  useDisplayFont();
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
