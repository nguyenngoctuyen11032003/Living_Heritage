import { ArrowDown, ArrowUpRight, Mic } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { VIDEOS } from './playback';
import { HeroVideo, LazyVideo, VideoToggle } from './videos';

/* Shared bits of the dark /sach-ky-uc page. Every user-visible string goes through t() (namespace 'legal', book.*). */

/** Small uppercase tracked label. white/60 on black is ~7:1 (white/40 would be ~3.7:1, below AA). */
export function Label({ children, className, as: As = 'p', id }: { children: ReactNode; className?: string; as?: 'p' | 'h3'; id?: string }) {
  return (
    <As id={id} className={cn('text-[0.78rem] font-medium uppercase tracking-[0.2em] text-mb/60', className)}>
      {children}
    </As>
  );
}

/** Max-width container with the site's gutters; long words break so 200% text never widens the page. */
export function Wrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 wrap-anywhere sm:px-6 lg:px-8', className)}>{children}</div>;
}

/** The one primary action: a white pill inside a glass ring → /ke-chuyen. */
export function PrimaryPill({ className }: { className?: string }) {
  const tl = useT('landing');
  return (
    <span className={cn('liquid-glass inline-flex max-w-full rounded-full p-1.5', className)}>
      <Link
        to="/ke-chuyen"
        className="inline-flex min-h-12 min-w-0 items-center gap-3 rounded-full bg-mb py-1.5 pl-1.5 pr-6 text-left font-semibold leading-snug text-mb-bg transition-colors hover:bg-mb/85"
      >
        <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-mb-bg text-mb">
          <Mic className="size-4" />
        </span>
        {tl('cta.primary')}
      </Link>
    </span>
  );
}

const glassButton = 'liquid-glass inline-flex min-h-12 max-w-full items-center gap-2 rounded-full px-6 py-2 text-mb transition-colors hover:bg-mb/10';

/** 1 — full-viewport hero over the crossfading background clip. The page's only h1. */
export function MbHero() {
  const t = useT('legal');
  // -mt pulls the hero under the transparent dark SiteHeader (4.5rem); the extra top padding keeps the content clear of it.
  return (
    <section aria-labelledby="mb-hero-title" className="relative isolate -mt-[4.5rem] flex min-h-[100svh] flex-col overflow-hidden bg-mb-bg">
      {/* Fallback while the clip loads, when it fails, and under reduced motion before the first frame. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_75%_95%,var(--mb-fb1)_0%,transparent_70%),radial-gradient(55%_50%_at_10%_15%,var(--mb-fb2)_0%,transparent_70%)]" />
      <HeroVideo src={VIDEOS.hero} className="-z-10" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(var(--mb-bg-rgb)/var(--mb-wash-top))_0%,rgb(var(--mb-bg-rgb)/var(--mb-wash-mid))_30%,rgb(var(--mb-bg-rgb)/var(--mb-wash-low))_68%,rgb(var(--mb-bg-rgb))_100%)]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(var(--mb-bg-rgb)/var(--mb-wash-side))_0%,rgb(var(--mb-bg-rgb)/var(--mb-wash-side2))_55%,transparent_80%)]" />
      <Wrap className="flex flex-1 flex-col justify-end pb-6 pt-[calc(4.5rem+3.5rem)] md:pb-8 md:pt-[calc(4.5rem+5rem)]">
        <Label>{t('book.eyebrow')}</Label>
        <h1 id="mb-hero-title" className="mb-display mt-5 max-w-6xl text-balance text-[clamp(3rem,9vw,7.5rem)] text-mb">
          {t('book.hero.titleA')} <em className="italic text-mb/70">{t('book.hero.titleB')}</em>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-[1.05rem] leading-relaxed text-mb/80 md:text-[1.15rem]">{t('book.hero.lead')}</p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <PrimaryPill />
          <a href="#lam-sach" className={glassButton}>
            {t('book.hero.secondary')}
            <ArrowDown aria-hidden="true" className="size-4 shrink-0" />
          </a>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-mb/10 pt-5 md:mt-12">
          <p className="max-w-md text-[0.82rem] leading-relaxed text-mb/60">{t('book.hero.videoNote')}</p>
          <VideoToggle showLabel />
        </div>
      </Wrap>
    </section>
  );
}

/** 2 — what a memory book is. */
export function MbAbout() {
  const t = useT('legal');
  return (
    <section aria-labelledby="mb-about-title" className="mb-cv bg-mb-bg py-24 md:py-36">
      <Wrap>
        <Reveal y={20}>
          <Label>{t('book.about.label')}</Label>
          <h2 id="mb-about-title" className="mb-display mt-6 max-w-5xl text-balance text-[clamp(2.3rem,5.6vw,5rem)] text-mb">
            {t('book.about.titleA')} <em className="italic text-mb/60">{t('book.about.titleB')}</em>
          </h2>
          <p className="mt-8 max-w-2xl text-pretty text-[1.05rem] leading-relaxed text-mb/70 md:text-[1.15rem]">{t('book.about.body')}</p>
        </Reveal>
      </Wrap>
    </section>
  );
}

/** Rounded video frame with the gradient fallback and its pause toggle. */
function VideoFrame({ src, className, toggleClass = 'right-4 top-4', children, zoom }: { src: string; className?: string; toggleClass?: string; children?: ReactNode; zoom?: boolean }) {
  return (
    <div className={cn('relative isolate overflow-hidden bg-[radial-gradient(80%_80%_at_30%_20%,var(--mb-fr1)_0%,var(--mb-fr2)_70%)]', className)}>
      <div className={cn('absolute inset-0', zoom && 'transition-transform duration-700 ease-out group-hover:scale-105')}>
        <LazyVideo src={src} />
      </div>
      {children}
      <VideoToggle className={cn('absolute', toggleClass)} />
    </div>
  );
}

/** 3 — featured clip with the "read and listen" card and the knowledge-hub link. */
export function MbFeatured() {
  const t = useT('legal');
  return (
    <section aria-labelledby="mb-featured-title" className="mb-cv bg-mb-bg pb-24 md:pb-36">
      <Wrap>
        <Reveal y={20} className="relative">
          <VideoFrame src={VIDEOS.featured} className="aspect-video rounded-3xl">
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          </VideoFrame>
          <div className="mt-4 flex flex-col gap-4 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:flex-row md:items-end md:justify-between md:p-8 lg:p-10">
            <div className="liquid-glass mb-media max-w-lg rounded-3xl bg-black/35 p-6 md:pointer-events-auto md:p-7">
              <h2 id="mb-featured-title" className="text-[0.78rem] font-medium uppercase tracking-[0.2em] text-white/70">
                {t('book.featured.label')}
              </h2>
              <p className="mt-3 text-pretty leading-relaxed text-white/85">{t('book.featured.body')}</p>
            </div>
            <Link to="/kham-pha" className={cn(glassButton, 'mb-media self-start bg-black/35 md:pointer-events-auto md:self-auto')}>
              {t('book.featured.explore')}
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}

const STEPS = ['s1', 's2', 's3', 's4', 's5'] as const;

/** How a book is made (anchor target of the hero's secondary button). */
export function MbSteps() {
  const t = useT('legal');
  return (
    <section id="lam-sach" aria-labelledby="mb-steps-title" className="mb-cv scroll-mt-24 bg-mb-bg py-24 md:py-36">
      <Wrap>
        <Reveal y={20}>
          <Label>{t('book.stepsLabel')}</Label>
          <h2 id="mb-steps-title" className="mb-display mt-5 text-balance text-[clamp(2.3rem,5.6vw,5rem)] text-mb">
            {t('book.stepsTitle')}
          </h2>
        </Reveal>
        <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((k, i) => (
            <Reveal as="li" key={k} y={20} delay={i * 0.05} className="liquid-glass flex flex-col rounded-3xl p-6 md:p-7">
              <span aria-hidden="true" className="mb-display text-[3rem] text-mb/30">
                0{i + 1}
              </span>
              <h3 className="mt-6 text-[1.1rem] font-semibold leading-snug text-mb">
                <span className="sr-only">{i + 1}. </span>
                {t(`book.steps.${k}.title`)}
              </h3>
              <p className="mt-2 text-[0.98rem] leading-relaxed text-mb/70">{t(`book.steps.${k}.body`)}</p>
            </Reveal>
          ))}
        </ol>
      </Wrap>
    </section>
  );
}

const QR_POINTS = ['a', 'b', 'c'] as const;

/** 4 — "Voice × Paper": how the QR codes behave and what is not promised (B9). */
export function MbPhilosophy() {
  const t = useT('legal');
  return (
    <section aria-labelledby="mb-philo-title" className="mb-cv bg-mb-bg py-24 md:py-36">
      <Wrap>
        <Reveal y={20}>
          <h2 id="mb-philo-title" className="mb-display text-balance text-[clamp(2.8rem,8vw,7rem)] text-mb">
            {t('book.philosophy.titleA')} <em className="italic text-mb/60">×</em> {t('book.philosophy.titleB')}
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 items-center gap-10 md:grid-cols-2 lg:gap-16">
          <Reveal y={20}>
            <VideoFrame src={VIDEOS.philosophy} className="aspect-[4/3] rounded-3xl" toggleClass="bottom-4 right-4" />
          </Reveal>
          <Reveal y={20} delay={0.08} className="flex flex-col gap-8">
            <div>
              <Label as="h3">{t('book.philosophy.qrTitle')}</Label>
              <p className="mt-4 text-pretty text-[1.05rem] leading-relaxed text-mb/80">{t('book.philosophy.qrBody')}</p>
              <ol className="mt-5 flex flex-col gap-3">
                {QR_POINTS.map((k, i) => (
                  <li key={k} className="flex gap-4 leading-relaxed text-mb/75">
                    <span aria-hidden="true" className="liquid-glass inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.85rem] font-semibold text-mb">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{t(`book.qr.${k}`)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div aria-hidden="true" className="h-px bg-mb/10" />
            <div>
              <Label as="h3">{t('book.philosophy.limitsTitle')}</Label>
              <p className="mt-4 text-pretty text-[1.05rem] leading-relaxed text-mb/80">{t('book.philosophy.limitsBody')}</p>
            </div>
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}

const FORMATS = [
  { key: 'read', to: '/bat-dau', src: VIDEOS.read, planned: false },
  { key: 'print', to: '/goi-dich-vu', src: VIDEOS.print, planned: true },
] as const;

/** 5 — the two outputs: what exists (chapter reader) and what is only planned (printed hardcover). */
export function MbFormats() {
  const t = useT('legal');
  return (
    <section aria-labelledby="mb-formats-title" className="mb-cv bg-mb-bg py-24 md:py-36">
      <Wrap>
        <Reveal y={20} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 id="mb-formats-title" className="mb-display max-w-3xl text-balance text-[clamp(2.3rem,5.6vw,5rem)] text-mb">
            {t('book.formats.title')}
          </h2>
          <Label className="md:pb-3">{t('book.formats.label')}</Label>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {FORMATS.map((f, i) => (
            <Reveal as="article" key={f.key} y={20} delay={i * 0.08} className="group liquid-glass flex flex-col rounded-3xl p-3">
              <VideoFrame src={f.src} className="aspect-video rounded-[1.25rem]" zoom />
              <div className="flex flex-1 flex-col p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-3 py-1 text-[0.8rem] font-medium ring-1',
                      f.planned ? 'mb-tag-planned' : 'text-mb/80 ring-mb/25',
                    )}
                  >
                    {t(`book.formats.${f.key}.tag`)}
                  </span>
                  <Link
                    to={f.to}
                    aria-label={t(`book.formats.${f.key}.link`)}
                    className="liquid-glass inline-flex size-12 shrink-0 items-center justify-center rounded-full text-mb transition-colors hover:bg-mb/10"
                  >
                    <ArrowUpRight aria-hidden="true" className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <h3 className="mb-display mt-6 text-[clamp(1.8rem,3vw,2.5rem)] text-mb">{t(`book.formats.${f.key}.title`)}</h3>
                <p className="mt-3 text-pretty leading-relaxed text-mb/70">{t(`book.formats.${f.key}.body`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

/** Closing call to action (kept from the previous page). */
export function MbCta() {
  const t = useT('legal');
  return (
    <section aria-labelledby="mb-cta-title" className="mb-cv bg-mb-bg px-4 py-16 sm:px-6 md:py-28">
      <Reveal y={20} className="liquid-glass mx-auto max-w-5xl rounded-[2.5rem] bg-[radial-gradient(60%_80%_at_50%_0%,rgba(216,180,106,0.16),transparent_70%)] px-6 py-16 text-center wrap-anywhere md:px-16 md:py-24">
        <h2 id="mb-cta-title" className="mb-display text-balance text-[clamp(2.4rem,6vw,5rem)] text-mb">
          {t('book.ctaTitle')}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-[1.05rem] leading-relaxed text-mb/70 md:text-[1.15rem]">{t('book.ctaBody')}</p>
        <div className="mt-10 flex justify-center">
          <PrimaryPill />
        </div>
      </Reveal>
    </section>
  );
}
