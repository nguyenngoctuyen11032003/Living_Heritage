import { Compass, Headphones, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { StoryScene } from '@/components/illustrations/scenes';
import { HandNote } from '@/components/motion';
import { buttonClasses, IllustrativeBadge } from '@/components/ui';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { usePick, useT } from '@/i18n';
import { formatDuration } from '@/lib/format';
import { CurvedCarousel } from './CurvedCarousel';
import { requestSamplePlay } from './events';
import { CAROUSEL_STORIES, SAMPLE_STORY } from './sample-data';
import { PrimaryCta } from './shared';

/**
 * B15 entrance: fade + rise ≤20 px in 350 ms, once; nothing under reduced motion (content is in the DOM from the start).
 * fade=false rises without fading: the h1 is the LCP element, and the browser does not count invisible text as painted.
 */
function useEnter() {
  const reduced = useReducedMotionSafe();
  return (delay: number, y = 16, fade = true) =>
    reduced ? { initial: false as const } : { initial: fade ? { opacity: 0, y } : { y }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: EASE_OUT, delay } };
}

/** Small "nghe thử" card: plays the 58 s sample in the sample-story block (same handler as the secondary CTA). */
function ListenCard() {
  const t = useT('landing');
  const pick = usePick();
  return (
    <button
      type="button"
      onClick={requestSamplePlay}
      className="group flex w-full max-w-[25rem] items-center gap-4 rounded-[1.5rem] bg-paper p-3 pr-5 text-left shadow-[0_24px_50px_-28px_rgba(18,27,24,0.55)] ring-1 ring-line transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
    >
      <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-heritage text-cream transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100">
        <Play className="ml-0.5 size-5 fill-current" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-terracotta">{t('hero.listenCard')}</span>
        <span className="mt-0.5 block font-serif text-[1.08rem] font-semibold leading-snug text-heritage-deep">{pick(SAMPLE_STORY.title)}</span>
        <span className="mt-0.5 block text-[0.85rem] text-ink-soft">
          {pick(SAMPLE_STORY.narrator)} · <span className="whitespace-nowrap tabular-nums">{formatDuration(SAMPLE_STORY.duration)}</span>
        </span>
      </span>
    </button>
  );
}

/**
 * Block 2 — hero (B6). From 1024 px: two columns — introduction, primary/secondary CTAs and the demo link on the left;
 * the narrator illustration with a small listen card on the right. Phones stack text → buttons → image → listen card.
 * Fixed aspect ratios keep the layout stable while it loads (no CLS).
 */
export function Hero() {
  const t = useT('landing');
  const reduced = useReducedMotionSafe();
  const enter = useEnter();

  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-[4.5rem] overflow-hidden pb-16 pt-[4.5rem] hyphens-auto wrap-anywhere lg:pb-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_30%_0%,rgba(220,232,213,0.85),rgba(250,247,240,0)_70%)]" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:pt-14">
        {/* Introduction */}
        <div className="text-center lg:col-span-6 lg:text-left xl:col-span-7">
          <motion.p {...enter(0.05, 6)} className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-[0.82rem] font-semibold text-heritage-deep ring-1 ring-heritage/10">
            <span aria-hidden="true" className="relative inline-flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-heritage/40 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-heritage" />
            </span>
            {t('hero.badge')}
          </motion.p>

          <h1
            id="hero-title"
            className="mx-auto mt-6 max-w-[22ch] text-balance font-sans text-[clamp(2.3rem,9.4vw,3.6rem)] font-bold leading-display tracking-[-0.035em] text-ink lg:mx-0 lg:max-w-none lg:text-[clamp(3.2rem,4.6vw,4.6rem)]"
          >
            <motion.span {...enter(0.05, 12, false)} className="block pt-[0.06em]">
              {t('hero.line1')}
            </motion.span>
            <motion.span {...enter(0.1, 12, false)} className="block pb-[0.08em] text-heritage">
              {t('hero.line2')}
            </motion.span>
          </h1>

          <motion.p {...enter(0.22, 14)} className="mx-auto mt-5 max-w-[40rem] text-pretty text-[1.05rem] leading-relaxed text-ink-soft lg:mx-0 lg:text-[1.2rem]">
            {t('hero.sub')}
          </motion.p>

          <HandNote rotate={-3} delay={reduced ? 0 : 0.5} className="mt-5 text-[1.6rem] lg:text-[1.8rem]">
            {t('hero.noteSpeak')}
          </HandNote>

          <motion.div {...enter(0.25, 12)} className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
            <PrimaryCta />
            <button type="button" onClick={requestSamplePlay} className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'gap-2.5 whitespace-nowrap' })}>
              <Headphones aria-hidden="true" className="size-5" />
              {t('cta.listen')}
            </button>
          </motion.div>

          {/* Tertiary: the in-memory demo (no account). A plain text link so the start button stays the one primary action. */}
          <motion.p {...enter(0.3, 8)} className="mt-3">
            <Link to="/trai-nghiem" className="inline-flex min-h-12 items-center gap-2 px-2 text-[0.95rem] font-semibold text-heritage underline underline-offset-[6px] hover:text-heritage-deep lg:px-0">
              <Compass aria-hidden="true" className="size-4" />
              {t('cta.demo')}
            </Link>
          </motion.p>
        </div>

        {/* Narrator illustration + listen card */}
        <motion.div {...enter(0.2, 20)} className="relative mx-auto w-full max-w-md lg:col-span-6 lg:max-w-none xl:col-span-5">
          <figure className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-mint ring-1 ring-line sm:aspect-[5/4] xl:aspect-[4/5]">
            <StoryScene kind="porch" className="absolute inset-0" />
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,27,24,0.35),rgba(18,27,24,0)_45%)]" />
            <IllustrativeBadge className="absolute left-4 top-4" />
            <figcaption className="sr-only">{t('hero.imageAlt')}</figcaption>
          </figure>
          {/* Phones: below the image (text → buttons → image → listen card). Desktop: overlapping the image's lower edge. */}
          <div className="relative mt-4 flex justify-center lg:justify-start xl:absolute xl:-bottom-8 xl:-left-10 xl:mt-0 xl:block">
            <ListenCard />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** The arched ribbon of illustrative stories, now its own band below the hero so it never competes with the start button. */
export function StoryRibbon() {
  const t = useT('landing');
  return (
    <section aria-label={t('ui.carousel.label')} className="relative pb-6 [--u:calc(min(100vw,133.333vh)/1440)]">
      <CurvedCarousel stories={CAROUSEL_STORIES} onPlay={() => requestSamplePlay()} />
    </section>
  );
}
