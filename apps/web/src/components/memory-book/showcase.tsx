import { Info, Play } from 'lucide-react';
import { Book3D } from '@/components/landing';
import { Reveal } from '@/components/motion';
import { Badge, QrCode } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { siteHref } from '@/lib/env';
import { Label, Wrap } from './sections';

const SPECS = ['format', 'pages', 'qr', 'pdf'] as const;

/**
 * Dark variant of the landing BookShowcase (owned by the landing area, so copied rather than edited): the same mock-up
 * book, QR card, planned specs and "Dữ liệu minh họa" label (NT03, B9), restyled for the black page.
 */
export function MbShowcase() {
  const t = useT('landing');
  return (
    <section aria-labelledby="mb-book-title" className="bg-mb-bg py-24 md:py-36">
      <Wrap>
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
          <Reveal y={20} className="relative order-2 lg:order-1 lg:col-span-6">
            <div className="liquid-glass relative mx-auto flex max-w-xl flex-col items-center justify-center gap-8 rounded-[2rem] px-6 py-12 sm:min-h-[34rem] sm:py-14">
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(55%_50%_at_45%_45%,rgba(216,180,106,0.22),rgba(0,0,0,0)_75%)]" />
              {/* The cover, quote and "1:12" are a mock-up of a book that does not exist yet (NT03, B9). */}
              <Badge tone="warning" size="sm" icon={<Info />} className="relative z-10 max-w-full whitespace-normal text-center sm:absolute sm:left-4 sm:top-4">
                {t('book.sampleLabel')}
              </Badge>
              <Book3D className="relative sm:-translate-x-16" />
              <div className="relative w-[11rem] rotate-[4deg] rounded-[1.25rem] bg-paper p-3 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.9)] ring-1 ring-mb/20 sm:absolute sm:bottom-8 sm:right-5 sm:w-[10.5rem]">
                <div className="rounded-xl bg-cream p-2">
                  <QrCode value={siteHref('/kham-pha')} label={t('book.qrLabel')} size={176} className="h-auto w-full" />
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-heritage text-cream">
                    <Play className="ml-0.5 size-3.5 fill-current" />
                  </span>
                  <span className="text-[0.85rem] font-semibold leading-tight text-ink">
                    {t('book.qrTitle')} · <span className="tabular-nums">{t('book.qrDuration')}</span>
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal y={20} delay={0.08} className="order-1 lg:order-2 lg:col-span-6 lg:pl-6">
            <Label>{t('book.eyebrow')}</Label>
            <h2 id="mb-book-title" className="mb-display mt-5 text-balance text-[clamp(2.3rem,5vw,4.5rem)] text-mb">
              {t('book.title')}
            </h2>
            <p className="mt-6 text-pretty text-[1.05rem] leading-relaxed text-mb/75 md:text-[1.12rem]">{t('book.lead')}</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-mb">{t('book.specsTitle')}</h3>
              <Badge tone="warning" size="sm">
                {t('meta.planned')}
              </Badge>
            </div>
            <dl className="liquid-glass mt-4 grid grid-cols-2 rounded-2xl">
              {SPECS.map((k, i) => (
                <div key={k} className={cn('p-4 sm:p-5', i % 2 === 1 && 'border-l border-mb/10', i > 1 && 'border-t border-mb/10')}>
                  <dt className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-mb/60">{t(`book.specs.${k}.label`)}</dt>
                  <dd className="mt-1 font-semibold leading-snug text-mb">{t(`book.specs.${k}.value`)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[0.92rem] leading-relaxed text-mb/70">{t('book.plannedNote')}</p>
            <p className="mt-2 text-[0.85rem] text-mb/60">{t('book.qrHint')}</p>
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}
