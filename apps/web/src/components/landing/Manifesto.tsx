import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Reveal, WordsPullUp, WordsPullUpMultiStyle } from '@/components/motion';
import { useT } from '@/i18n';

/** Cream pill with a dark circular arrow; the circle scales and the arrow nudges on hover (transform only, no layout). */
export function CreamPillLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group/pill inline-flex min-h-14 items-center gap-3 rounded-full bg-night-ink py-1.5 pl-6 pr-1.5 font-semibold text-night transition-colors duration-300 hover:bg-white"
    >
      {children}
      <span aria-hidden="true" className="inline-flex size-11 items-center justify-center rounded-full bg-night text-night-ink transition-transform duration-300 group-hover/pill:scale-110">
        <ArrowRight className="size-4 transition-transform duration-300 group-hover/pill:translate-x-0.5" />
      </span>
    </Link>
  );
}

/**
 * Dark cinematic manifesto: giant wordmark, statement and closing paragraph.
 * The paragraph fades in once (B15) instead of brightening with scroll, so it is fully readable wherever it sits.
 */
export function Manifesto() {
  const t = useT('landing');
  return (
    <section aria-labelledby="manifesto-title" className="px-2 py-2 hyphens-auto wrap-anywhere sm:px-3">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-night text-night-ink">
        <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.15] mix-blend-overlay" />
        {/* Soft glow as a radial gradient: same look as a 120px blur filter, without re-rasterising a huge filtered layer. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-56 -top-56 -z-10 size-[54rem]"
          style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--heritage) 35%, transparent) 45%, transparent)' }}
        />

        <div className="mx-auto max-w-[96rem] px-5 pb-20 pt-14 sm:px-8 md:px-12 md:pb-28 md:pt-20">
          <WordsPullUp
            as="p"
            text={t('manifesto.wordmark')}
            className="font-sans text-[19vw] font-semibold leading-[1.06] tracking-[-0.06em] text-night-ink 2xl:text-[18rem]"
            stagger={0.1}
            suffix={
              <sup aria-hidden="true" className="ml-[0.04em] align-super text-[0.32em] font-normal text-mint-fixed">
                *
              </sup>
            }
          />

          <div className="mt-10 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-12">
            <p className="font-hand text-[1.6rem] leading-tight text-mint-fixed md:col-span-4 md:text-[1.9rem]">* {t('footer.tagline')}</p>
            <Reveal className="md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8">
              <p className="text-pretty text-[1.08rem] leading-relaxed text-night-ink/85 md:text-[1.15rem]">{t('manifesto.intro')}</p>
              <div className="mt-8">
                <CreamPillLink to="/cach-hoat-dong">{t('manifesto.cta')}</CreamPillLink>
              </div>
            </Reveal>
          </div>

          <div className="mt-24 border-t border-white/10 pt-16 md:mt-32 md:pt-24">
            <WordsPullUpMultiStyle
              as="h2"
              className="max-w-5xl text-balance text-[clamp(2rem,5vw,4.2rem)] font-semibold leading-display tracking-[-0.03em]"
              stagger={0.06}
              segments={[
                { text: t('manifesto.statementA'), className: 'text-night-ink/55' },
                { text: t('manifesto.statementB') },
                { text: t('manifesto.statementC'), className: 'font-serif font-normal italic text-mint-fixed' },
                { text: t('manifesto.statementD') },
                { text: t('manifesto.statementE'), className: 'font-serif font-normal italic text-mint-fixed' },
              ]}
            />
            <span id="manifesto-title" className="sr-only">
              {t('manifesto.wordmark')}
            </span>
            <Reveal>
              <p className="mt-12 max-w-4xl text-pretty text-[1.3rem] leading-[1.6] text-night-ink md:mt-16 md:text-[1.75rem] md:leading-[1.55]">{t('manifesto.reveal')}</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
