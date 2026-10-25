import { Play } from 'lucide-react';
import { useState } from 'react';
import { StoryScene } from '@/components/illustrations/scenes';
import { Reveal } from '@/components/motion';
import { Badge, QrCode } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { siteHref } from '@/lib/env';
import { ArrowLink, Section, SectionHeading } from './shared';

const SPECS = ['format', 'pages', 'qr', 'pdf'] as const;

/** CSS 3D book: the cover swings open on hover/focus (or tap) to reveal a chapter page. */
export function Book3D({ className }: { className?: string }) {
  const t = useT('landing');
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-pressed={open}
      aria-label={t('book.flip')}
      className={cn('group/book relative block [perspective:1800px] focus-visible:outline-offset-8', className)}
    >
      <div
        className={cn(
          'relative h-[22rem] w-[17rem] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] sm:h-[26rem] sm:w-[20rem]',
          '[transform:rotateX(8deg)_rotateY(-22deg)] group-hover/book:[transform:rotateX(4deg)_rotateY(-8deg)]',
          open && '[transform:rotateX(4deg)_rotateY(-8deg)]',
        )}
      >
        {/* page block */}
        <div className="absolute inset-y-1.5 left-1 right-0 rounded-r-md bg-[repeating-linear-gradient(90deg,#f3eee2_0px,#f3eee2_2px,#e7e0cf_3px)] shadow-[0_40px_60px_-30px_rgba(18,27,24,0.55)] [transform:translateZ(-18px)]" />
        {/* inner page */}
        <div className="absolute inset-y-1 left-0 right-1 flex flex-col rounded-r-md bg-paper p-6 text-left ring-1 ring-line [transform:translateZ(-2px)] sm:p-7">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-terracotta">{t('book.pageChapter')}</p>
          <div className="mt-4 h-28 overflow-hidden rounded-lg bg-[#F5EDDA] sm:h-32">
            <StoryScene kind="garden" />
          </div>
          <p className="mt-4 font-serif text-[1rem] italic leading-relaxed text-ink sm:text-[1.08rem]">{t('book.pageQuote')}</p>
          <div className="mt-auto flex items-center gap-3 border-t border-line pt-3">
            <QrCode value={siteHref('/kham-pha')} label={t('book.qrLabel')} size={44} margin={1} />
            <span className="text-[0.8125rem] leading-tight text-ink-soft">
              {t('book.qrTitle')} · {t('book.qrDuration')}
            </span>
          </div>
        </div>
        {/* cover */}
        <div
          className={cn(
            'absolute inset-0 origin-left rounded-r-md rounded-l-sm transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] [backface-visibility:hidden] [transform-style:preserve-3d]',
            'group-hover/book:[transform:rotateY(-158deg)] group-focus-visible/book:[transform:rotateY(-158deg)]',
            open && '[transform:rotateY(-158deg)]',
          )}
        >
          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-r-md rounded-l-sm bg-[#163a31] p-7 text-left text-[#e9e4d4] shadow-[inset_8px_0_14px_-8px_rgba(0,0,0,0.5)] [:root[data-theme='dark']_&]:ring-1 [:root[data-theme='dark']_&]:ring-[#d8b46a]/25">
            <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 opacity-[0.05]" />
            <div className="absolute inset-3 rounded-sm border border-[#d8b46a]/40" aria-hidden="true" />
            <p className="relative text-[0.8125rem] font-semibold uppercase tracking-[0.2em] text-[#d8b46a]">{t('manifesto.wordmark')}</p>
            <div className="relative mx-auto mt-6 size-28 overflow-hidden rounded-full ring-2 ring-[#d8b46a]/50 sm:size-32">
              <StoryScene kind="garden" />
            </div>
            <p className="relative mt-6 text-center font-serif text-[1.55rem] font-semibold leading-tight text-[#f1dca8] sm:text-[1.75rem]">{t('book.coverTitle')}</p>
            <p className="relative mt-auto text-center font-serif text-[0.9rem] italic text-[#e9e4d4]/80">{t('book.coverAuthor')}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

/** Block 10 — memory book showcase with a real QR card and planned specs. */
export function BookShowcase({ showLink = true }: { showLink?: boolean }) {
  const t = useT('landing');
  return (
    <Section id="sach-ky-uc" labelledBy="book-title">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
        <Reveal className="relative order-2 lg:order-1 lg:col-span-6">
          <div className="relative mx-auto flex max-w-xl flex-col items-center justify-center gap-8 overflow-hidden rounded-[2rem] bg-mint/70 px-6 py-12 sm:min-h-[34rem] sm:py-14">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(50%_50%_at_45%_45%,rgba(255,255,255,0.75),rgba(255,255,255,0))]" />
            <Book3D className="relative sm:-translate-x-16" />
            {/* QR card */}
            <div className="relative w-[11rem] rotate-[4deg] rounded-[1.25rem] bg-paper p-3 shadow-[0_24px_50px_-24px_rgba(18,27,24,0.45)] ring-1 ring-line sm:absolute sm:bottom-8 sm:right-5 sm:w-[10.5rem]">
              <div className="rounded-xl bg-cream p-2">
                <QrCode value={siteHref('/kham-pha')} label={t('book.qrLabel')} size={176} className="h-auto w-full" />
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-full bg-heritage text-cream">
                  <Play className="ml-0.5 size-4 fill-current" />
                </span>
                <span className="text-[0.85rem] font-semibold leading-tight text-ink">
                  {t('book.qrTitle')} · <span className="tabular-nums">{t('book.qrDuration')}</span>
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2 lg:col-span-6 lg:pl-6">
          <SectionHeading id="book-title" eyebrow={t('book.eyebrow')} title={t('book.title')} lead={t('book.lead')} />
          <Reveal delay={0.1} className="mt-10">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-ink">{t('book.specsTitle')}</h3>
              <Badge tone="warning" size="sm">
                {t('meta.planned')}
              </Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line">
              {SPECS.map((k) => (
                <div key={k} className="bg-paper p-4 sm:p-5">
                  <dt className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">{t(`book.specs.${k}.label`)}</dt>
                  <dd className="mt-1 font-semibold leading-snug text-ink">{t(`book.specs.${k}.value`)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-soft">{t('book.plannedNote')}</p>
            {showLink && (
              <div className="mt-6">
                <ArrowLink to="/sach-ky-uc">{t('book.cta')}</ArrowLink>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
