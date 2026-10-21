import { ArrowRight, BookHeart, Check, Library, Lock, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { StoryScene } from '@/components/illustrations/scenes';
import { EASE_CARD, useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { SectionHeading } from './shared';

const CARDS: Array<{ key: 'vault' | 'hub' | 'book'; icon: LucideIcon; to: string }> = [
  { key: 'vault', icon: Lock, to: '/gia-dinh' },
  { key: 'hub', icon: Library, to: '/kham-pha' },
  { key: 'book', icon: BookHeart, to: '/sach-ky-uc' },
];
const ITEMS = ['a', 'b', 'c', 'd'] as const;

/** Animated waveform over a warm porch scene (CSS/SVG + motion, no video). */
function WaveIllustration() {
  const reduced = useReducedMotionSafe();
  const bars = Array.from({ length: 28 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)));
  return (
    <div className="absolute inset-0">
      <StoryScene kind="porch" className="absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,27,24,0.92)_8%,rgba(18,27,24,0.25)_60%,rgba(18,27,24,0.1))]" />
      <div aria-hidden="true" className="absolute inset-x-6 bottom-[7.5rem] flex h-20 items-center gap-[3px]">
        {bars.map((h, i) =>
          reduced ? (
            <span key={i} className="flex-1 rounded-full bg-night-ink/90" style={{ height: `${h * 100}%` }} />
          ) : (
            <motion.span
              key={i}
              className="flex-1 origin-center rounded-full bg-night-ink/90"
              style={{ height: '100%' }}
              initial={{ scaleY: h }}
              animate={{ scaleY: [h, Math.max(0.12, 1 - h * 0.7), h] }}
              transition={{ duration: 1.4 + (i % 5) * 0.18, repeat: Infinity, ease: 'easeInOut', delay: (i % 7) * 0.08 }}
            />
          ),
        )}
      </div>
    </div>
  );
}

/** Block 8 — dark 4-column feature grid (Prisma). */
export function FeatureGrid() {
  const t = useT('landing');
  const reduced = useReducedMotionSafe();
  const item = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, scale: 0.95 },
          whileInView: { opacity: 1, scale: 1 },
          viewport: { once: true, margin: '0px 0px -10% 0px' },
          transition: { duration: 0.7, ease: EASE_CARD, delay: i * 0.15 },
        };

  return (
    <section aria-labelledby="features-title" className="px-2 py-2 sm:px-3">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-night text-night-ink">
        <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.15] mix-blend-overlay" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <SectionHeading id="features-title" tone="dark" eyebrow={t('features.eyebrow')} title={t('features.title')} />
          <ul className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-5">
            <motion.li {...item(0)} className="relative min-h-[26rem] overflow-hidden rounded-[1.5rem] ring-1 ring-white/10 lg:min-h-[480px]">
              <WaveIllustration />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[0.72rem] font-semibold text-night-ink/85 ring-1 ring-white/15 backdrop-blur">{t('features.illoTag')}</span>
                <p className="mt-3 font-serif text-[1.15rem] italic leading-snug text-night-ink">{t('features.illoCaption')}</p>
              </div>
            </motion.li>
            {CARDS.map(({ key, icon: Icon, to }, i) => (
              <motion.li key={key} {...item(i + 1)} className="relative flex min-h-[26rem] flex-col overflow-hidden rounded-[1.5rem] bg-night-card p-6 ring-1 ring-white/8 lg:min-h-[480px] lg:p-7">
                <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-overlay" />
                <div className="relative flex items-start justify-between">
                  <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint/12 text-mint ring-1 ring-mint/20">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-serif text-[0.95rem] text-night-ink/60" aria-hidden="true">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="relative mt-8 font-serif text-[1.5rem] font-semibold leading-snug">{t(`features.cards.${key}.title`)}</h3>
                <ul className="relative mt-5 flex flex-1 flex-col gap-3">
                  {ITEMS.map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-[0.95rem] leading-snug text-night-ink/85">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-mint" />
                      {t(`features.cards.${key}.items.${k}`)}
                    </li>
                  ))}
                </ul>
                <Link to={to} className="group/fl relative mt-6 inline-flex min-h-12 items-center gap-2 self-start font-semibold text-night-ink underline-offset-[6px] hover:underline">
                  {t('features.more')}
                  <span className="sr-only">: {t(`features.cards.${key}.title`)}</span>
                  <ArrowRight aria-hidden="true" className="size-4 -rotate-45 transition-transform duration-200 group-hover/fl:-translate-y-0.5 group-hover/fl:translate-x-0.5" />
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
