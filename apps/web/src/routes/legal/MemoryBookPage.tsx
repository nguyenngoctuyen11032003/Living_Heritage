import { QrCode as QrIcon } from 'lucide-react';
import { BookShowcase, Faq, PrimaryCta, Section, SectionHeading } from '@/components/landing';
import { DrawArrow, Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { PageHero, StepGrid } from './StaticPage';
import { useDocumentTitle, useLegalDict } from './hooks';

const QR_POINTS = ['a', 'b', 'c'] as const;

/** /sach-ky-uc — marketing page for memory books. */
export default function MemoryBookPage() {
  const t = useT('legal');
  const d = useLegalDict().book;
  useDocumentTitle(t('book.title'));
  return (
    <>
      <PageHero eyebrow={t('book.eyebrow')} heading={t('book.heading')} lead={t('book.lead')} />
      <BookShowcase showLink={false} />

      <Section labelledBy="book-steps" className="bg-paper/60">
        <SectionHeading id="book-steps" eyebrow={t('book.eyebrow')} title={t('book.stepsTitle')} />
        <Reveal className="mt-12">
          <StepGrid steps={(['s1', 's2', 's3', 's4'] as const).map((k) => d.steps[k])} />
        </Reveal>
      </Section>

      <Section labelledBy="qr-title">
        <Reveal className="mx-auto grid max-w-5xl gap-8 rounded-[2rem] bg-paper p-7 ring-1 ring-line md:grid-cols-12 md:p-10">
          <div className="md:col-span-5">
            <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint text-heritage">
              <QrIcon className="size-5" />
            </span>
            <h2 id="qr-title" className="mt-5 font-serif text-[1.8rem] font-semibold leading-snug text-heritage-deep">
              {t('book.qrTitle')}
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">{t('book.qrBody')}</p>
          </div>
          <ol className="flex flex-col gap-4 md:col-span-7 md:border-l md:border-line md:pl-8">
            {QR_POINTS.map((k, i) => (
              <li key={k} className="flex gap-4 leading-relaxed text-ink">
                <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-heritage text-[0.85rem] font-bold text-cream">
                  {i + 1}
                </span>
                <span className="pt-1">{t(`book.qr.${k}`)}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </Section>

      <Section labelledBy="book-cta" className="!pt-0">
        <Reveal className="mx-auto max-w-3xl text-center">
          <DrawArrow viewBox="0 0 80 40" className="mx-auto mb-4 h-10 w-20" d="M6 30 C 22 4, 52 4, 74 26" head="M60 26 L 75 27 L 72 12" />
          <h2 id="book-cta" className="text-balance font-serif text-[clamp(1.9rem,4.4vw,3rem)] font-semibold leading-[1.2] text-heritage-deep">
            {t('book.ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">{t('book.ctaBody')}</p>
          <div className="mt-8 flex justify-center">
            <PrimaryCta />
          </div>
        </Reveal>
      </Section>
      <Faq keys={['who', 'delete', 'paid']} />
    </>
  );
}
