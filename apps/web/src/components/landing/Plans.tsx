import { Building2, Check, Info } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from '@/components/motion';
import { Badge, Button, ButtonLink, Dialog } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { CreamPillLink } from './Manifesto';
import { Section, SectionHeading } from './shared';

const INCLUDES = ['a', 'b', 'c'] as const;
const PLANS = [
  { key: 'trial', audience: 'family' },
  { key: 'month', audience: 'family' },
  { key: 'year', audience: 'family' },
  { key: 'book', audience: 'family' },
  { key: 'program', audience: 'org' },
  { key: 'license', audience: 'org' },
] as const;

/** Block 12 — planned pricing (clearly not charged) + organisations block. */
export function Plans({ showOrgs = true }: { showOrgs?: boolean }) {
  const t = useT('landing');
  const [selected, setSelected] = useState<(typeof PLANS)[number]['key'] | null>(null);
  return (
    <Section id="goi-dich-vu" labelledBy="plans-title" className="cv-section bg-paper/60">
      <SectionHeading id="plans-title" eyebrow={t('plans.eyebrow')} title={t('plans.title')} lead={t('plans.lead')} align="center" />
      <Reveal className="mt-6 flex justify-center">
        <Badge tone="warning" icon={<Info />}>
          {t('plans.planned')}
        </Badge>
      </Reveal>
      <ul className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        {PLANS.map((plan, i) => {
          const featured = plan.key === 'year';
          return (
            <Reveal as="li" key={plan.key} delay={i * 0.1} className="min-w-0">
              <div
                className={cn(
                  '@container relative flex h-full min-w-0 flex-col rounded-[1.75rem] p-7 md:p-8',
                  featured ? 'bg-heritage-deep text-night-ink ring-1 ring-heritage' : 'bg-paper text-ink ring-1 ring-line',
                )}
              >
                <p className={cn('text-[0.8125rem] font-semibold uppercase tracking-[0.12em]', featured ? 'text-mint-fixed' : 'text-heritage')}>{t(`plans.audience.${plan.audience}`)}</p>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <h3 className={cn('min-w-0 text-[1.1rem] font-bold leading-snug', featured ? 'text-night-ink' : 'text-ink')}>{t(`plans.${plan.key}.name`)}</h3>
                  {plan.key === 'year' && (
                    <Badge tone="mint" size="sm" className="max-w-full whitespace-normal">
                      {t('plans.year.badge')}
                    </Badge>
                  )}
                </div>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-1">
                  <span className={cn('min-w-0 font-serif text-[min(2.4rem,15cqi)] font-semibold leading-none tracking-[-0.02em] [overflow-wrap:anywhere]', featured ? 'text-night-ink' : 'text-heritage-deep')}>{t(`plans.${plan.key}.price`)}</span>
                  <span className={cn('text-[0.95rem]', featured ? 'text-night-ink/75' : 'text-ink-soft')}>{t(`plans.${plan.key}.unit`)}</span>
                </p>
                <p className={cn('mt-1 text-[0.8125rem] font-semibold uppercase tracking-[0.08em]', featured ? 'text-[#f1dca8]' : 'text-warning-fg')}>{t('meta.planned')}</p>
                <ul className={cn('mt-6 flex flex-1 flex-col gap-3 border-t pt-6', featured ? 'border-white/12' : 'border-line')}>
                  {INCLUDES.map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-[0.95rem] leading-snug">
                      <Check aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-mint-fixed' : 'text-heritage')} />
                      {t(`plans.includes.${plan.key}.${k}`)}
                    </li>
                  ))}
                </ul>
                <Button variant={featured ? 'dark-cream' : 'secondary'} size="lg" fullWidth className="mt-8" onClick={() => setSelected(plan.key)}>
                  {t('cta.interest')}
                </Button>
              </div>
            </Reveal>
          );
        })}
      </ul>

      {showOrgs && (
        <Reveal className="mt-6">
          <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-night p-7 text-night-ink md:p-10">
            <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.05]" />
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-5">
                <span aria-hidden="true" className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-mint/12 text-mint-fixed ring-1 ring-mint/20 sm:inline-flex">
                  <Building2 className="size-6" />
                </span>
                <div className="max-w-2xl">
                  <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-mint-fixed">{t('plans.orgs.eyebrow')}</p>
                  <h3 className="mt-2 font-serif text-[1.5rem] font-semibold leading-snug md:text-[1.8rem]">{t('plans.orgs.title')}</h3>
                  <p className="mt-3 leading-relaxed text-night-ink/80">{t('plans.orgs.body')}</p>
                </div>
              </div>
              <div className="shrink-0">
                <CreamPillLink to="/to-chuc">{t('plans.orgs.cta')}</CreamPillLink>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={t('plans.interestTitle')}
        description={t('plans.interestBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              {t('plans.interestLater')}
            </Button>
            <ButtonLink to={`/ket-noi?plan=${selected ?? 'year'}`}>{t('plans.interestCta')}</ButtonLink>
          </>
        }
      />
    </Section>
  );
}
