import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

/** Page header for static pages: eyebrow, h1, lead, optional draft/updated meta. */
export function PageHero({ eyebrow, heading, lead, meta, children }: { eyebrow: string; heading: string; lead: string; meta?: boolean; children?: ReactNode }) {
  const t = useT('legal');
  const reduced = useReducedMotionSafe();
  const rise = (delay: number) => (reduced ? { initial: false as const } : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: EASE_OUT, delay } });
  return (
    <section className="relative isolate -mt-[4.5rem] overflow-hidden pb-14 pt-[calc(4.5rem+3.5rem)] md:pb-20 md:pt-[calc(4.5rem+5.5rem)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_60%_at_50%_0%,rgba(220,232,213,0.9),rgba(250,247,240,0)_75%)]" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.p {...rise(0.05)} className="inline-flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-terracotta">
          <span aria-hidden="true" className="h-px w-6 bg-terracotta/60" />
          {eyebrow}
          <span aria-hidden="true" className="h-px w-6 bg-terracotta/60" />
        </motion.p>
        <motion.h1 {...rise(0.12)} className="mt-5 text-balance font-serif text-[clamp(2rem,5.4vw,4rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-heritage-deep">
          {heading}
        </motion.h1>
        <motion.p {...rise(0.2)} className="mx-auto mt-6 max-w-2xl text-pretty text-[1.08rem] leading-relaxed text-ink-soft md:text-[1.15rem]">
          {lead}
        </motion.p>
        {meta && (
          <motion.div {...rise(0.28)} className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="warning">{t('common.draft')}</Badge>
            <Badge tone="outline">{t('common.updated')}</Badge>
          </motion.div>
        )}
        {children && <motion.div {...rise(0.32)} className="mt-8 flex flex-wrap justify-center gap-3">{children}</motion.div>}
      </div>
    </section>
  );
}

type DocSection = { title: string; body: string } & Partial<Record<'a' | 'b' | 'c' | 'd' | 'e', string>>;

/** Long-form legal document with a sticky table of contents. */
export function LegalDoc({ sections }: { sections: Record<string, DocSection> }) {
  const t = useT('legal');
  const entries = Object.entries(sections);
  const toc = (
    <ol className="flex flex-col">
      {entries.map(([id, s], i) => (
        <li key={id}>
          <a href={`#${id}`} className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 text-[0.92rem] leading-snug text-ink-soft transition-colors hover:bg-mint/60 hover:text-heritage-deep">
            <span aria-hidden="true" className="w-5 shrink-0 text-right text-[0.8rem] font-semibold tabular-nums text-heritage/70">{i + 1}</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-24 sm:px-6 md:pb-32 lg:grid-cols-12 lg:gap-12 lg:px-8">
      <nav aria-label={t('common.toc')} className="lg:col-span-4">
        {/* Phones and tablets: collapsed, so the document starts right away. */}
        <details className="group rounded-[1.5rem] bg-paper ring-1 ring-line lg:hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[1.5rem] px-5 text-[0.95rem] font-semibold text-heritage-deep [&::-webkit-details-marker]:hidden">
            {t('common.toc')}
            <ChevronDown aria-hidden="true" className="size-5 text-ink-soft transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line px-3 pb-3 pt-2">{toc}</div>
        </details>
        <div className="hidden rounded-[1.5rem] bg-paper p-5 ring-1 ring-line lg:sticky lg:top-28 lg:block">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">{t('common.toc')}</p>
          <div className="mt-3">{toc}</div>
        </div>
      </nav>
      <div className="min-w-0 lg:col-span-8">
        <p className="max-w-[44rem] rounded-2xl bg-[#fbecc8]/60 p-4 text-[0.95rem] leading-relaxed text-[#5c400b] ring-1 ring-[#ecd28f] md:p-5">{t('common.pilotNote')}</p>
        {entries.map(([id, s], i) => {
          const items = (['a', 'b', 'c', 'd', 'e'] as const).map((k) => s[k]).filter((x): x is string => Boolean(x));
          return (
            <section key={id} id={id} aria-labelledby={`${id}-h`} className="max-w-[44rem] scroll-mt-28 border-b border-line py-10 last:border-b-0">
              <h2 id={`${id}-h`} className="flex items-baseline gap-3 font-serif text-[clamp(1.35rem,3.6vw,1.55rem)] font-semibold leading-[1.3] text-heritage-deep">
                <span className="shrink-0 font-sans text-[0.95rem] font-semibold tabular-nums text-terracotta">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              <p className="mt-4 text-[1.04rem] leading-[1.75] text-ink">{s.body}</p>
              {items.length > 0 && (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {items.map((item) => (
                    <li key={item} className="flex gap-3 text-[1.02rem] leading-relaxed text-ink">
                      <span aria-hidden="true" className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-heritage" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Numbered step cards used by several static pages. */
export function StepGrid({ steps, cols = 4, className }: { steps: Array<{ title: string; body: string }>; cols?: 2 | 4; className?: string }) {
  return (
    <ol className={cn('grid gap-5 sm:grid-cols-2', cols === 4 && 'lg:grid-cols-4', className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="flex flex-col rounded-[1.75rem] bg-paper p-6 ring-1 ring-line md:p-7">
          <span aria-hidden="true" className="font-serif text-[2.4rem] font-semibold leading-none text-heritage/20">
            0{i + 1}
          </span>
          <h3 className="mt-4 text-[1.15rem] font-semibold leading-snug text-ink">
            <span className="sr-only">{i + 1}. </span>
            {s.title}
          </h3>
          <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
