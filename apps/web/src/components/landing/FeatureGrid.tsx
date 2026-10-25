import { ArrowRight, BookHeart, Check, Library, Lock, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { StoryScene } from '@/components/illustrations/scenes';
import { Reveal } from '@/components/motion';
import { useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { SectionHeading } from './shared';
import './landing.css';

const CARDS: Array<{ key: 'vault' | 'hub' | 'book'; icon: LucideIcon; to: string }> = [
  { key: 'vault', icon: Lock, to: '/gia-dinh' },
  { key: 'hub', icon: Library, to: '/kham-pha' },
  { key: 'book', icon: BookHeart, to: '/sach-ky-uc' },
];
const ITEMS = ['a', 'b', 'c', 'd'] as const;

/** Animated waveform over a warm porch scene (CSS keyframes over SVG, no video). */
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
            // CSS keyframes on transform run on the compositor (motion would drive scaleY from JS every frame).
            <span
              key={i}
              className="h-full flex-1 origin-center animate-wave rounded-full bg-night-ink/90"
              style={
                {
                  '--wave-from': h,
                  '--wave-to': Math.max(0.12, 1 - h * 0.7),
                  '--wave-dur': `${(1.4 + (i % 5) * 0.18) / 2}s`,
                  '--wave-delay': `${(i % 7) * 0.08}s`,
                  transform: `scaleY(${h})`,
                } as CSSProperties
              }
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
  return (
    <section aria-labelledby="features-title" className="cv-section px-2 py-2 hyphens-auto wrap-anywhere sm:px-3">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-night text-night-ink">
        <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.05]" />
        <div className="mx-auto max-w-[1264px] px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
          <SectionHeading id="features-title" tone="dark" eyebrow={t('features.eyebrow')} title={t('features.title')} />
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-5">
            <Reveal as="li" delay={0} className="relative min-h-[26rem] overflow-hidden rounded-[1.5rem] ring-1 ring-white/10 lg:min-h-[480px]">
              <WaveIllustration />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-serif text-[1.15rem] italic leading-snug text-night-ink">{t('features.illoCaption')}</p>
              </div>
            </Reveal>
            {CARDS.map(({ key, icon: Icon, to }, i) => (
              <Reveal as="li" key={key} delay={(i + 1) * 0.08} className="relative flex min-h-[26rem] flex-col overflow-hidden rounded-[1.5rem] bg-night-card p-6 ring-1 ring-white/8 lg:min-h-[480px] lg:p-7">
                <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 opacity-[0.05]" />
                <div className="relative flex items-start justify-between">
                  <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint/12 text-mint-fixed ring-1 ring-mint/20">
                    <Icon className="size-6" />
                  </span>
                  <span className="font-serif text-[0.95rem] text-night-ink/80" aria-hidden="true">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="relative mt-8 font-serif text-[1.5rem] font-semibold leading-snug">{t(`features.cards.${key}.title`)}</h3>
                <ul className="relative mt-5 flex flex-1 flex-col gap-3">
                  {ITEMS.map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-[0.95rem] leading-snug text-night-ink/85">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-mint-fixed" />
                      {t(`features.cards.${key}.items.${k}`)}
                    </li>
                  ))}
                </ul>
                <Link to={to} className="group/fl relative mt-6 inline-flex min-h-12 items-center gap-2 self-start font-semibold text-night-ink underline-offset-[6px] hover:underline">
                  {t('features.more')}
                  <span className="sr-only">: {t(`features.cards.${key}.title`)}</span>
                  <ArrowRight aria-hidden="true" className="size-4 -rotate-45 transition-transform duration-200 group-hover/fl:-translate-y-0.5 group-hover/fl:translate-x-0.5" />
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
