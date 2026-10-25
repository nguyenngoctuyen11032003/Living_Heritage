import { ArrowRight, ArrowUpRight, BadgeCheck, Compass, FileText, Headphones, Mic, Share2, type LucideIcon } from 'lucide-react';
import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { HeroVideo, Label, LazyVideo, PrimaryPill, Wrap } from '@/components/memory-book';
import { BlurWords, Magnet, Reveal, ScrollText } from '@/components/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { requestSamplePlay } from './events';
import './home.css';

/*
 * Homepage sections in the liquid-glass cinema style of /sach-ky-uc (same kit: crossfading hero clip, lazy clips,
 * one page-wide pause toggle, .liquid-glass surfaces, .mb-display serif). Each block previews one of the four
 * marketing pages and links through, so the homepage reads as their summary. Render inside
 * <VideoPlaybackProvider> and an `.mb-page` wrapper (routes/landing/LandingPage.tsx).
 */

const CLIPS = {
  hero: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4',
  /** Same footage as the /cach-hoat-dong hero. */
  how: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261005_115944_095d91d4-030f-4e82-b42b-a388c0816d24.mp4',
  people: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4',
  /** The /kham-pha, /sach-ky-uc and /to-chuc hero clips, one per service card. */
  explore: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4',
  book: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4',
  org: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204103_f607742e-09da-4cf5-bb06-4e67b0a531de.mp4',
} as const;

const glassButton = 'liquid-glass inline-flex min-h-12 max-w-full items-center gap-2 rounded-full px-6 py-2 text-mb transition-colors hover:bg-mb/10';
const glassCircle = 'liquid-glass inline-flex size-14 items-center justify-center rounded-full text-mb/80 transition-all hover:bg-mb/5 hover:text-mb';

/** Rounded frame: gradient fallback, a lazy looping clip. */
function ClipFrame({ src, className, zoom, children }: { src: string; className?: string; zoom?: boolean; children?: ReactNode }) {
  return (
    <div className={cn('relative isolate overflow-hidden bg-[radial-gradient(80%_80%_at_30%_20%,var(--mb-fr1)_0%,var(--mb-fr2)_70%)]', className)}>
      <div className={cn('absolute inset-0', zoom && 'transition-transform duration-700 ease-out group-hover:scale-105')}>
        <LazyVideo src={src} />
      </div>
      {children}
    </div>
  );
}

/** Knowledge-hub search as a glass pill (the /kham-pha highlight): submits to /kham-pha?q=… */
function HeroSearch() {
  const tk = useT('knowledge');
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    void navigate(term ? `/kham-pha?q=${encodeURIComponent(term)}` : '/kham-pha');
  };
  return (
    <form role="search" aria-label={tk('hero.searchLabel')} onSubmit={onSubmit} className="liquid-glass flex w-full max-w-xl items-center gap-3 rounded-full py-2 pl-6 pr-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={tk('hero.searchLabel')}
        placeholder={tk('hero.searchPlaceholder')}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-[1rem] text-mb outline-none placeholder:text-mb/70 [&::-webkit-search-cancel-button]:hidden"
      />
      <button type="submit" aria-label={tk('hero.searchCta')} className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-mb text-mb-bg transition-colors hover:bg-mb/85">
        <ArrowRight aria-hidden="true" className="size-5" />
      </button>
    </form>
  );
}

/**
 * 1 — full-viewport hero: crossfading background clip, centred display headline, the knowledge search pill, the
 * introduction, the one primary action, and a row of glass circles (sample story, demo, pause video).
 */
export function HomeHero() {
  const t = useT('landing');
  // -mt pulls the hero under the transparent SiteHeader (4.5rem), as on the four marketing pages.
  return (
    <section aria-labelledby="hero-title" className="home-hero relative isolate -mt-[4.5rem] flex min-h-[100svh] flex-col overflow-hidden bg-mb-bg">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_75%_95%,var(--mb-fb1)_0%,transparent_70%),radial-gradient(55%_50%_at_10%_15%,var(--mb-fb2)_0%,transparent_70%)]" />
      <HeroVideo src={CLIPS.hero} className="-z-10" />
      <div aria-hidden="true" className="home-hero__wash absolute inset-0 -z-10" />

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-[calc(4.5rem+2.5rem)] text-center wrap-anywhere sm:px-6">
        {/* Words rise out of a blur on load (the photo-archive intro, without a blocking splash). */}
        <h1 id="hero-title" className="mb-display mt-4 max-w-6xl text-balance text-[clamp(2.7rem,7vw,6.6rem)] text-mb">
          <BlurWords immediate delay={0.1} segments={[{ text: t('hero.line1'), breakAfter: true }, { text: t('hero.line2'), className: 'italic text-mb' }]} />
        </h1>
        <Reveal y={20} delay={0.12} className="mt-8 flex w-full justify-center">
          <HeroSearch />
        </Reveal>
        <Reveal y={20} delay={0.18}>
          <p className="mx-auto mt-5 max-w-2xl text-pretty px-4 text-[0.98rem] leading-relaxed text-mb md:text-[1.05rem]">{t('hero.sub')}</p>
        </Reveal>
        <Reveal y={20} delay={0.24} className="mt-7">
          <Magnet padding={70} strength={5}>
            <PrimaryPill />
          </Magnet>
        </Reveal>
      </div>

      <div className="relative flex flex-col items-center gap-3 pb-8">
        <ul aria-label={t('home.hero.shortcuts')} className="flex justify-center gap-4">
          <li>
            <button type="button" onClick={requestSamplePlay} aria-label={t('cta.listen')} title={t('cta.listen')} className={glassCircle}>
              <Headphones aria-hidden="true" className="size-5" />
            </button>
          </li>
          <li>
            <Link to="/trai-nghiem" aria-label={t('cta.demo')} title={t('cta.demo')} className={glassCircle}>
              <Compass aria-hidden="true" className="size-5" />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** 2 — what Living Heritage is (label + large serif statement, italic second half). */
export function HomeAbout() {
  const t = useT('landing');
  return (
    <section aria-labelledby="home-about-title" className="relative overflow-hidden bg-mb-bg px-0 pb-8 pt-14 md:pb-10 md:pt-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.03)_0%,transparent_70%)]" />
      <Wrap className="relative max-w-[1264px] text-center">
        <Reveal y={20}>
          <Label>{t('home.about.label')}</Label>
        </Reveal>
        <Reveal y={40} delay={0.1} duration={0.8}>
          <h2 id="home-about-title" className="mb-display mx-auto mt-5 max-w-5xl text-balance text-[clamp(2.3rem,6vw,5.2rem)] text-mb">
            {t('home.about.titleA')} <br className="hidden md:block" />
            <em className="italic text-mb/75">{t('home.about.titleB')}</em>
          </h2>
        </Reveal>
        {/* Lights up glyph by glyph as the reader scrolls through it. */}
        <ScrollText text={t('manifesto.reveal')} className="mx-auto mt-8 max-w-3xl text-pretty text-[clamp(1.15rem,2vw,1.5rem)] font-medium leading-relaxed text-mb" />
      </Wrap>
    </section>
  );
}

/** 3 — featured clip (the /cach-hoat-dong footage) with a glass card: the how-it-works promise and its page. */
export function HomeFeatured() {
  const t = useT('landing');
  const tl = useT('legal');
  return (
    <section aria-labelledby="home-featured-title" className="bg-mb-bg pb-12 pt-4 md:pb-20 md:pt-8">
      <Wrap className="max-w-[1264px]">
        <Reveal y={60} duration={0.9} className="relative">
          <GrowOnScroll>
            <ClipFrame src={CLIPS.how} className="aspect-[4/5] rounded-3xl sm:aspect-video">
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-transparent" />
            </ClipFrame>
          </GrowOnScroll>
          <div className="mt-4 flex flex-col gap-4 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:flex-row md:items-end md:justify-between md:p-10">
            <div className="liquid-glass mb-media max-w-md rounded-2xl bg-night/75 p-6 md:pointer-events-auto md:p-8">
              <p className="text-[0.8125rem] font-medium uppercase tracking-[0.2em] text-white/90">{t('home.featured.label')}</p>
              <h2 id="home-featured-title" className="mb-display mt-3 text-[1.6rem] text-white md:text-[1.9rem]">
                {tl('how.heading')}
              </h2>
              <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-white/92 md:text-base">{tl('how.lead')}</p>
            </div>
            <Link to="/cach-hoat-dong" className={cn(glassButton, 'mb-media self-start bg-night/75 px-8 transition-transform hover:scale-105 active:scale-95 md:pointer-events-auto md:self-auto')}>
              {t('home.featured.cta')}
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}

/** Scales a block from 0.9 to 1 as it rises to the middle of the screen (static under reduced motion). */
function GrowOnScroll({ children }: { children: ReactNode }) {
  return <div className="grow-on-scroll origin-center">{children}</div>;
}

const STEPS: Array<{ k: 's1' | 's2' | 's3' | 's4'; icon: LucideIcon }> = [
  { k: 's1', icon: Mic },
  { k: 's2', icon: FileText },
  { k: 's3', icon: BadgeCheck },
  { k: 's4', icon: Share2 },
];

/** One sticky card of the stack: it pins below the header and shrinks a little as the cards after it slide over. */
function StepCard({ i }: { i: number }) {
  const t = useT('landing');
  const { k, icon: Icon } = STEPS[i]!;
  const target = 1 - (STEPS.length - 1 - i) * 0.04;
  return (
    // Every <li> is sticky inside the one <ol>, each pinning 28px lower, so the cards pile up instead of scrolling away.
    <li className="sticky mb-[14vh] last:mb-0" style={{ top: `calc(6.5rem + ${i * 28}px)` }}>
      <div
        style={{ '--i': i / STEPS.length, '--target': target } as CSSProperties}
        className="home-step-card flex min-h-[19rem] origin-top flex-col justify-between gap-10 rounded-[2rem] p-6 sm:p-8 md:min-h-[22rem] md:rounded-[2.5rem] md:p-10"
      >
        <div className="flex items-start justify-between gap-6">
          <span aria-hidden="true" className="mb-display text-[clamp(3.5rem,9vw,7rem)] leading-none text-mb/25">
            0{i + 1}
          </span>
          <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-mb text-mb-bg md:size-16">
            <Icon className="size-6" />
          </span>
        </div>
        <div className="max-w-xl">
          <h3 className="mb-display text-[clamp(1.7rem,3vw,2.5rem)] text-mb">
            <span className="sr-only">{i + 1}. </span>
            {t(`how.steps.${k}.title`)}
          </h3>
          <p className="mt-3 text-pretty text-[1.02rem] leading-relaxed text-mb/80 md:text-[1.1rem]">{t(`how.steps.${k}.body`)}</p>
        </div>
      </div>
    </li>
  );
}

/**
 * 4 — the four steps (summary of /cach-hoat-dong) as a stack of sticky cards: on wide screens the heading holds on the
 * left while each step slides over the previous one, which shrinks slightly behind it.
 */
export function HomeSteps() {
  const t = useT('landing');
  return (
    <section id="cach-hoat-dong" aria-labelledby="home-steps-title" className="scroll-mt-24 bg-mb-bg pb-12 md:pb-20">
      <Wrap className="grid max-w-[1264px] grid-cols-1 gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-12">
        <div>
          <Reveal y={30} duration={0.7} className="flex flex-col gap-6 md:sticky md:top-28">
            <Label>{t('home.steps.label')}</Label>
            <h2 id="home-steps-title" className="mb-display text-balance text-[clamp(2rem,3.9vw,3.1rem)] text-mb">
              {t('how.title')}
            </h2>
            <p className="max-w-md text-pretty text-[1.02rem] leading-relaxed text-mb/80">{t('how.lead')}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/trai-nghiem" className={glassButton}>
                {t('how.try')}
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
              <Link to="/cach-hoat-dong" className={cn(glassButton, 'bg-transparent')}>
                {t('how.cta')}
                <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            </div>
          </Reveal>
        </div>
        <ol className="home-steps-list relative">
          {STEPS.map(({ k }, i) => (
            <StepCard key={k} i={i} />
          ))}
        </ol>
      </Wrap>
    </section>
  );
}

/** 5 — "Con người × AI" (the /cach-hoat-dong hero promise): clip left, the two roles right. */
export function HomePhilosophy() {
  const t = useT('landing');
  const tl = useT('legal');
  const roles = [
    { k: 'people', title: `${tl('how.hero.people.t1')} ${tl('how.hero.people.t2')}` },
    { k: 'ai', title: `${tl('how.hero.ai.t1')} ${tl('how.hero.ai.t2')}` },
  ] as const;
  return (
    <section aria-labelledby="home-philo-title" className="overflow-hidden bg-mb-bg py-12 md:py-20">
      <Wrap className="max-w-[1264px]">
        <Reveal y={40} duration={0.8}>
          <h2 id="home-philo-title" className="mb-display mb-8 text-balance text-[clamp(2.6rem,7vw,6rem)] text-mb md:mb-12">
            {t('home.philosophy.titleA')} <em className="italic text-mb/65">×</em> {t('home.philosophy.titleB')}
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
          <Reveal y={0} duration={0.8}>
            <ClipFrame src={CLIPS.people} className="aspect-[4/3] rounded-3xl" />
          </Reveal>
          <Reveal y={0} delay={0.1} duration={0.8} className="flex flex-col gap-8">
            {roles.map(({ k, title }, i) => (
              <div key={k} className="flex flex-col gap-8">
                {i > 0 && <div aria-hidden="true" className="h-px w-full bg-mb/10" />}
                <div>
                  <Label as="h3">{title}</Label>
                  <p className="mt-4 text-pretty text-[1.05rem] leading-relaxed text-mb/75 md:text-[1.15rem]">
                    {tl(`how.hero.${k}.b1`)} {tl(`how.hero.${k}.b2`)} {tl(`how.hero.${k}.b3`)}
                  </p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}

/** 6 — "What we do": one glass card per page — knowledge hub, memory books, organizations — each with its hero clip. */
export function HomeServices() {
  const t = useT('landing');
  const cards = [
    { k: 'explore', to: '/kham-pha', src: CLIPS.explore, body: t('knowledge.lead') },
    { k: 'book', to: '/sach-ky-uc', src: CLIPS.book, body: t('book.lead') },
    { k: 'org', to: '/to-chuc', src: CLIPS.org, body: t('plans.orgs.body') },
  ] as const;
  return (
    <section aria-labelledby="home-services-title" className="relative overflow-hidden bg-mb-bg py-12 md:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(255_255_255/0.02)_0%,transparent_60%)]" />
      <Wrap className="relative max-w-[1264px]">
        <Reveal y={30} duration={0.7} className="flex items-end justify-between gap-4">
          <h2 id="home-services-title" className="mb-display max-w-3xl text-balance text-[clamp(2rem,4.6vw,3.6rem)] text-mb">
            {t('home.services.title')}
          </h2>
          <Label className="hidden pb-3 md:block">{t('home.services.label')}</Label>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal as="article" key={c.k} y={50} delay={i * 0.15} duration={0.8} className="group liquid-glass flex flex-col overflow-hidden rounded-3xl">
              <ClipFrame src={c.src} className="aspect-video" zoom>
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/60 to-transparent" />
              </ClipFrame>
              <div className="flex flex-1 flex-col p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[0.8125rem] font-medium uppercase tracking-[0.2em] text-mb/75">{t(`home.services.${c.k}.tag`)}</span>
                  <Link
                    to={c.to}
                    aria-label={t(`home.services.${c.k}.link`)}
                    className="liquid-glass inline-flex size-12 shrink-0 items-center justify-center rounded-full text-mb transition-colors hover:bg-mb/10"
                  >
                    <ArrowUpRight aria-hidden="true" className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <h3 className="mb-display mt-6 text-[clamp(1.5rem,2.4vw,2rem)] text-mb">{t(`home.services.${c.k}.title`)}</h3>
                <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-mb/75">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

/** Closing call to action in a glass panel. */
export function HomeCta() {
  const t = useT('landing');
  return (
    <section aria-labelledby="home-cta-title" className="bg-mb-bg py-12 md:py-20">
      <Wrap className="max-w-[1264px]">
      <Reveal y={20} className="liquid-glass rounded-[2.5rem] bg-[radial-gradient(60%_80%_at_50%_0%,rgba(216,180,106,0.16),transparent_70%)] px-6 py-12 text-center wrap-anywhere md:px-16 md:py-16">
        <h2 id="home-cta-title" className="mb-display text-balance text-[clamp(2.4rem,6vw,5rem)] text-mb">
          {t('final.title')}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-[1.05rem] leading-relaxed text-mb/80 md:text-[1.15rem]">{t('final.body')}</p>
        <div className="mt-8 flex justify-center">
          <PrimaryPill />
        </div>
      </Reveal>
      </Wrap>
    </section>
  );
}
