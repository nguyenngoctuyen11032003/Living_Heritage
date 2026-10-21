import { Headphones } from 'lucide-react';
import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { DrawArrow, HandNote } from '@/components/motion';
import { buttonClasses } from '@/components/ui';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { CurvedCarousel } from './CurvedCarousel';
import { requestSamplePlay } from './events';
import { CAROUSEL_STORIES } from './sample-data';
import { PrimaryCta } from './shared';

/** Absolute position in frame units on the 1440-unit stage. */
const at = (x: number, y: number, extra?: CSSProperties): CSSProperties => ({ left: `calc(var(--u) * ${x})`, top: `calc(var(--u) * ${y})`, ...extra });

/** Block 2 — Reelmark-style hero: badge, two-line headline, hand-drawn notes, curved story carousel, ringed CTA. */
export function Hero() {
  const t = useT('landing');
  const reduced = useReducedMotionSafe();
  const enter = (delay: number, from: Record<string, number | string>) =>
    reduced ? { initial: false as const } : { initial: { opacity: 0, ...from }, animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }, transition: { duration: 0.85, ease: EASE_OUT, delay } };

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate -mt-[4.5rem] overflow-hidden pb-14 pt-[4.5rem] [--u:calc(min(100vw,133.333vh)/1440)] min-[821px]:pb-[calc(var(--u)*56)]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(220,232,213,0.85),rgba(250,247,240,0)_70%)]" />

      {/* Copy */}
      <div className="relative mx-auto max-w-7xl px-4 pt-8 text-center sm:px-6 min-[821px]:pt-[calc(var(--u)*30)]">
        <motion.p {...enter(0.12, { scale: 0.85, y: 6 })} className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-[0.82rem] font-semibold text-heritage-deep ring-1 ring-heritage/10">
          <span aria-hidden="true" className="relative inline-flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-heritage/40 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-heritage" />
          </span>
          {t('hero.badge')}
        </motion.p>

        <h1
          id="hero-title"
          className="mx-auto mt-6 max-w-[22ch] text-balance font-sans text-[clamp(2.3rem,9.4vw,3.6rem)] font-bold leading-[1.1] tracking-[-0.035em] text-ink min-[821px]:mt-[calc(var(--u)*26)] min-[821px]:max-w-none min-[821px]:text-[clamp(2.6rem,calc(var(--u)*80),5.6rem)] min-[821px]:leading-[1.08]"
        >
          <motion.span {...enter(0.28, { y: 28, filter: 'blur(12px)' })} className="block pt-[0.06em]">
            {t('hero.line1')}
          </motion.span>
          <motion.span {...enter(0.42, { y: 28, filter: 'blur(12px)' })} className="block pb-[0.08em] text-heritage">
            {t('hero.line2')}
          </motion.span>
        </h1>

        <div className="relative mx-auto mt-5 max-w-[40rem] min-[821px]:mt-[calc(var(--u)*22)] min-[821px]:max-w-[calc(var(--u)*760)]">
          <motion.p {...enter(0.6, { y: 14 })} className="text-pretty text-[1.02rem] leading-relaxed text-ink-soft min-[821px]:text-[clamp(1rem,calc(var(--u)*20),1.25rem)]">
            {t('hero.sub')}
          </motion.p>
          {/* Desktop note anchored to the subline: arrow starts below the note and curls down onto the cards */}
          <div aria-hidden="true" className="pointer-events-none absolute right-full top-[-1.4em] z-20 mr-[calc(var(--u)*8)] hidden flex-col items-end min-[1100px]:flex">
            <HandNote rotate={-7} delay={reduced ? 0 : 1.5} style={{ fontSize: 'max(1.4rem, calc(var(--u) * 38))' }}>
              {t('hero.noteSpeak')}
            </HandNote>
            <DrawArrow
              immediate
              delay={reduced ? 0 : 1.25}
              duration={1.3}
              viewBox="0 0 200 220"
              className="-mr-[calc(var(--u)*90)] mt-[calc(var(--u)*4)]"
              style={{ width: 'calc(var(--u) * 190)', height: 'calc(var(--u) * 210)' }}
              d="M26 6 C 8 46, 24 92, 70 104 C 112 116, 128 82, 104 70 C 80 58, 66 98, 92 138 C 112 170, 146 190, 186 204"
              head="M168 188 L 188 205 L 162 210"
            />
          </div>
        </div>

        <HandNote rotate={-3} delay={reduced ? 0 : 1.4} className="mt-4 text-[1.6rem] min-[1100px]:hidden">
          {t('hero.noteSpeak')}
        </HandNote>
      </div>

      {/* "//" doodle on the 1440-unit stage (desktop) */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 z-10 hidden h-full w-[calc(var(--u)*1440)] -translate-x-1/2 min-[821px]:block">
        <DrawArrow
          immediate
          delay={reduced ? 0 : 1.2}
          duration={0.5}
          viewBox="0 0 60 60"
          className="absolute"
          style={at(1150, 150, { width: 'calc(var(--u) * 54)', height: 'calc(var(--u) * 54)' })}
          d="M18 50 L 32 8"
          head="M34 52 L 48 10"
          strokeWidth={2.8}
        />
      </div>

      {/* Curved carousel */}
      <motion.div
        {...(reduced ? { initial: false as const } : { initial: { opacity: 0, y: 70 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, ease: EASE_OUT, delay: 0.78 } })}
        className="mt-6 min-[821px]:-mt-[calc(var(--u)*8)]"
      >
        <CurvedCarousel stories={CAROUSEL_STORIES} onPlay={() => requestSamplePlay()} />
      </motion.div>

      {/* CTAs */}
      <motion.div
        {...(reduced ? { initial: false as const } : { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.6, ease: EASE_OUT, delay: 1.0 } })}
        className="relative mt-6 flex flex-col items-center justify-center gap-3 px-4 sm:flex-row min-[821px]:mt-[calc(var(--u)*6)]"
      >
        <span className="relative">
          <PrimaryCta />
          <span aria-hidden="true" className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 items-center min-[1100px]:flex">
            <HandNote rotate={-8} delay={reduced ? 0 : 1.8} style={{ fontSize: 'max(1.3rem, calc(var(--u) * 34))' }}>
              {t('hero.noteNoTyping')}
            </HandNote>
            <DrawArrow immediate delay={reduced ? 0 : 1.6} duration={0.6} viewBox="0 0 120 50" className="ml-1 mt-4" style={{ width: 'calc(var(--u) * 90)', height: 'calc(var(--u) * 38)' }} d="M4 34 C 30 44, 70 40, 108 18" head="M92 12 L 110 17 L 100 32" />
          </span>
        </span>
        <button type="button" onClick={requestSamplePlay} className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'gap-2.5' })}>
          <Headphones aria-hidden="true" className="size-5" />
          {t('cta.listen')}
        </button>
      </motion.div>
      <p className={cn('mt-4 text-center text-[0.8rem] text-ink-soft')}>{t('meta.illustrative')}</p>
    </section>
  );
}
