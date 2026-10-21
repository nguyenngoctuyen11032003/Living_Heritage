import { Building2, Check, Info } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from '@/components/motion';
import { Badge, Button, ButtonLink, Dialog } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { CreamPillLink } from './Manifesto';
import { Section, SectionHeading } from './shared';

const PLANS = [
  { key: 'month', includes: ['a', 'b', 'c'] },
  { key: 'year', includes: ['a', 'b', 'c', 'd'] },
  { key: 'book', includes: ['e', 'f'] },
] as const;

/** Block 12 — planned pricing (clearly not charged) + organisations block. */
export function Plans({ showOrgs = true }: { showOrgs?: boolean }) {
  const t = useT('landing');
  const [open, setOpen] = useState(false);
  return (
    <Section id="goi-dich-vu" labelledBy="plans-title" className="bg-paper/60">
      <SectionHeading id="plans-title" eyebrow={t('plans.eyebrow')} title={t('plans.title')} lead={t('plans.lead')} align="center" />
      <Reveal className="mt-6 flex justify-center">
        <Badge tone="warning" icon={<Info />}>
          {t('plans.planned')}
        </Badge>
      </Reveal>
      <ul className="mt-12 grid gap-5 lg:grid-cols-3 lg:gap-6">
        {PLANS.map((plan, i) => {
          const featured = plan.key === 'year';
          return (
            <Reveal as="li" key={plan.key} delay={i * 0.1}>
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-[1.75rem] p-7 md:p-8',
                  featured ? 'bg-heritage-deep text-night-ink ring-1 ring-heritage' : 'bg-paper text-ink ring-1 ring-line',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className={cn('text-[1.1rem] font-bold', featured ? 'text-night-ink' : 'text-ink')}>{t(`plans.${plan.key}.name`)}</h3>
                  {plan.key === 'year' && (
                    <Badge tone="mint" size="sm">
                      {t('plans.year.badge')}
                    </Badge>
                  )}
                </div>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className={cn('font-serif text-[2.4rem] font-semibold leading-none tracking-[-0.02em]', featured ? 'text-night-ink' : 'text-heritage-deep')}>{t(`plans.${plan.key}.price`)}</span>
                  <span className={cn('text-[0.95rem]', featured ? 'text-night-ink/75' : 'text-ink-soft')}>{t(`plans.${plan.key}.unit`)}</span>
                </p>
                <p className={cn('mt-1 text-[0.78rem] font-semibold uppercase tracking-[0.08em]', featured ? 'text-[#f1dca8]' : 'text-[#8a5d0c]')}>{t('meta.planned')}</p>
                <p className={cn('mt-4 leading-relaxed', featured ? 'text-night-ink/85' : 'text-ink-soft')}>{t(`plans.${plan.key}.body`)}</p>
                <ul className={cn('mt-6 flex flex-1 flex-col gap-3 border-t pt-6', featured ? 'border-white/12' : 'border-line')}>
                  {plan.includes.map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-[0.95rem] leading-snug">
                      <Check aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-mint' : 'text-heritage')} />
                      {t(`plans.includes.${k}`)}
                    </li>
                  ))}
                </ul>
                <Button variant={featured ? 'dark-cream' : 'secondary'} size="lg" fullWidth className="mt-8" onClick={() => setOpen(true)}>
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
            <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.15] mix-blend-overlay" />
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-5">
                <span aria-hidden="true" className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-mint/12 text-mint ring-1 ring-mint/20 sm:inline-flex">
                  <Building2 className="size-6" />
                </span>
                <div className="max-w-2xl">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-mint">{t('plans.orgs.eyebrow')}</p>
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
        open={open}
        onClose={() => setOpen(false)}
        title={t('plans.interestTitle')}
        description={t('plans.interestBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('plans.interestLater')}
            </Button>
            <ButtonLink to="/dang-ky">{t('plans.interestCta')}</ButtonLink>
          </>
        }
      />
    </Section>
  );
}
