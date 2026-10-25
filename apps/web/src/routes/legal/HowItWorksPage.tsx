import { BadgeCheck, Check, FileText, Mic, Share2, type LucideIcon } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { Faq, FinalCta, OneVoiceThreeOutputs, PrimaryCta, Section } from '@/components/landing';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useReducedMotionSafe } from '@/design/motion';
import { useDisplayFont } from '@/design/useDisplayFont';
import { useDocumentTitle, useLegalDict } from './hooks';
import './how-hero.css';
import '@/design/landing-body.css';

const ICONS: Record<'s1' | 's2' | 's3' | 's4', LucideIcon> = { s1: Mic, s2: FileText, s3: BadgeCheck, s4: Share2 };

const TRAIN_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261005_115944_095d91d4-030f-4e82-b42b-a388c0816d24.mp4';

/** Accent mark on the centre axis: a dashed ring around a small spoken "voice" curl. */
function AxisMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 52 52" fill="none" className="hh-mark">
      <circle cx="26" cy="26" r="23" stroke="currentColor" strokeWidth="1.6" strokeDasharray="98.3 46.3" transform="rotate(2.5 26 26)" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="26.5" cy="26.1" r="2.3" />
        <path d="M28.9 27.6C31.6 29 32.9 31.2 31.8 33.3 30.7 35.4 27.2 36.1 24.2 35.1" />
      </g>
    </svg>
  );
}

/** Left icon: dashed ring around a filled disc with a person (people decide). */
function PeopleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 35 34" className="hh-icon">
      <defs>
        <clipPath id="hh-pclip">
          <circle cx="17.5" cy="17" r="9.8" />
        </clipPath>
      </defs>
      <circle cx="17.5" cy="17" r="16.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeDasharray="3.6 3" />
      <circle cx="17.5" cy="17" r="9.8" fill="currentColor" />
      <g clipPath="url(#hh-pclip)" fill="var(--hh-cut)">
        <circle cx="17.5" cy="14" r="3" />
        <path d="M10.5 26.8c0-4.2 3.1-7 7-7s7 2.8 7 7z" />
      </g>
    </svg>
  );
}

/** Right icon: three stacked sheets with text ticks (AI drafts, people review). */
function SheetsIcon() {
  const ticks: Array<[number, number[]]> = [
    [2.5, [2.5, 5.6, 8.7, 11.8, 14.9]],
    [6.5, [2.5, 5.6, 8.7, 11.8, 14.9]],
    [15.2, [12.5, 15.6, 18.7, 21.8]],
    [20.4, [12.5, 15.6, 18.7, 21.8]],
    [30.3, [19.5, 22.6, 25.7, 28.8, 31.9]],
    [34.4, [19.5, 22.6, 25.7, 28.8, 31.9]],
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 35 38" className="hh-icon">
      <g fill="currentColor">
        <rect x="0.5" y="0.5" width="17" height="9.6" rx="0.5" />
        <rect x="10.5" y="13.5" width="13.5" height="10.9" rx="0.5" />
        <rect x="17.5" y="28.3" width="17" height="9.7" rx="0.5" />
      </g>
      <g fill="var(--hh-cut)">
        {ticks.flatMap(([y, xs]) => xs.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="1.1" height="1.9" />))}
      </g>
    </svg>
  );
}

/** Full-viewport hero: eyebrow + stacked headline on the centre axis, the two roles mirrored either side of it. */
function HowHero() {
  const t = useT('legal');
  const frame = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();
  useDisplayFont();

  // Landscape stage is 1280x800, fitted to the frame (the CSS reflows to a grid instead in portrait / on phones).
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => el.style.setProperty('--s', String(Math.min(el.clientHeight / 800, el.clientWidth / 716)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lines = ['l1', 'l2', 'l3', 'l4'] as const;
  const features = [
    { k: 'people', side: 'hh-left', Icon: PeopleIcon },
    { k: 'ai', side: 'hh-right', Icon: SheetsIcon },
  ] as const;
  return (
    <section ref={frame} aria-labelledby="how-title" className="hh-frame">
      {/* Aerial freight-train footage in both themes (decorative, muted, looping). Light theme adds a cream wash, as on /sach-ky-uc. */}
      <video
        className="hh-video"
        src={TRAIN_VIDEO}
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload={reduced ? 'metadata' : 'auto'}
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
      />
      <div aria-hidden="true" className="hh-tint" />
      <div className="hh-stage">
        <p className="hh-eyebrow">
          <span>{t('how.eyebrow')}</span>
        </p>
        <h1 id="how-title" className="hh-headline">
          {lines.map((l, i) => (
            <span key={l} className={`hh-l${i + 1}`}>
              {t(`how.hero.${l}`)}{' '}
            </span>
          ))}
        </h1>
        <AxisMark />
        {features.map(({ k, side, Icon }) => (
          <section key={k} className={`hh-feature ${side}`}>
            <Icon />
            <h2>
              <span>{t(`how.hero.${k}.t1`)}</span>
              <span>{t(`how.hero.${k}.t2`)}</span>
            </h2>
            <p>
              <span>{t(`how.hero.${k}.b1`)}</span>
              <span>{t(`how.hero.${k}.b2`)}</span>
              <span>{t(`how.hero.${k}.b3`)}</span>
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}

/** /cach-hoat-dong */
export default function HowItWorksPage() {
  const t = useT('legal');
  const d = useLegalDict().how;
  useDocumentTitle(t('how.title'));
  const steps = (['s1', 's2', 's3', 's4'] as const).map((k) => ({ key: k, ...d.steps[k] }));
  return (
    <>
      <HowHero />

      <div className="lp-body">
      <Section className="!pb-0">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-pretty text-[1.1rem] leading-relaxed text-ink-soft md:text-[1.2rem]">{t('how.lead')}</p>
          <div className="mt-8 flex justify-center">
            <PrimaryCta size="lg" />
          </div>
        </div>
      </Section>

      <Section className="!pt-4">
        <ol className="relative flex flex-col gap-6 before:absolute before:bottom-10 before:left-7 before:top-10 before:hidden before:border-l-2 before:border-dashed before:border-heritage/20 md:before:block">
          {steps.map(({ key, title, body, a, b, c }, i) => {
            const Icon = ICONS[key];
            return (
              <Reveal as="li" key={key} className="relative md:pl-24">
                <span aria-hidden="true" className={cn('absolute left-0 top-8 z-10 hidden size-14 items-center justify-center rounded-2xl ring-8 ring-cream md:inline-flex', key === 's2' ? 'bg-mint text-heritage-deep' : 'bg-heritage text-cream')}>
                  <Icon className="size-6" />
                </span>
                <div className="grid grid-cols-1 gap-6 rounded-2xl bg-paper p-6 ring-1 ring-line md:grid-cols-12 md:p-9">
                  <div className="md:col-span-5">
                    <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-terracotta">0{i + 1}</p>
                    <h2 className="mt-2 font-serif text-[1.7rem] font-semibold leading-snug text-heritage-deep">{title}</h2>
                    <p className="mt-3 leading-relaxed text-ink-soft">{body}</p>
                  </div>
                  <ul className="flex flex-col gap-3 md:col-span-7 md:border-l md:border-line md:pl-8">
                    {[a, b, c].map((item) => (
                      <li key={item} className="flex items-start gap-3 leading-relaxed text-ink">
                        <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-heritage" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </Section>

      <OneVoiceThreeOutputs />
      <Faq keys={['ai', 'write', 'who']} />
      <FinalCta />
      </div>
    </>
  );
}
