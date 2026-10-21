import { BadgeCheck, Check, FileText, Mic, Share2, Sparkles, UsersRound, type LucideIcon } from 'lucide-react';
import { Faq, FinalCta, OneVoiceThreeOutputs, PrimaryCta, Section } from '@/components/landing';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { PageHero } from './StaticPage';
import { useDocumentTitle, useLegalDict } from './hooks';

const ICONS: Record<'s1' | 's2' | 's3' | 's4', LucideIcon> = { s1: Mic, s2: FileText, s3: BadgeCheck, s4: Share2 };

/** /cach-hoat-dong */
export default function HowItWorksPage() {
  const t = useT('legal');
  const d = useLegalDict().how;
  useDocumentTitle(t('how.title'));
  const steps = (['s1', 's2', 's3', 's4'] as const).map((k) => ({ key: k, ...d.steps[k] }));
  return (
    <>
      <PageHero eyebrow={t('how.eyebrow')} heading={t('how.heading')} lead={t('how.lead')}>
        <PrimaryCta size="lg" />
      </PageHero>

      <Section className="!pt-4">
        <ol className="relative flex flex-col gap-6 before:absolute before:bottom-10 before:left-7 before:top-10 before:hidden before:border-l-2 before:border-dashed before:border-heritage/20 md:before:block">
          {steps.map(({ key, title, body, a, b, c }, i) => {
            const Icon = ICONS[key];
            return (
              <Reveal as="li" key={key} className="relative md:pl-24">
                <span aria-hidden="true" className={cn('absolute left-0 top-8 z-10 hidden size-14 items-center justify-center rounded-2xl ring-8 ring-cream md:inline-flex', key === 's2' ? 'bg-mint text-heritage-deep' : 'bg-heritage text-cream')}>
                  <Icon className="size-6" />
                </span>
                <div className="grid gap-6 rounded-[1.75rem] bg-paper p-6 ring-1 ring-line md:grid-cols-12 md:p-9">
                  <div className="md:col-span-5">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-terracotta">0{i + 1}</p>
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

      <Section className="bg-paper/60" labelledBy="roles-title">
        <h2 id="roles-title" className="text-center font-serif text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold text-heritage-deep">
          {t('how.rolesTitle')}
        </h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
          {([
            ['people', UsersRound, 'bg-heritage text-cream'],
            ['ai', Sparkles, 'bg-mint text-heritage-deep'],
          ] as const).map(([k, Icon, tone]) => (
            <Reveal key={k} className="rounded-[1.75rem] bg-cream p-7 ring-1 ring-line md:p-9">
              <span aria-hidden="true" className={cn('inline-flex size-12 items-center justify-center rounded-2xl', tone)}>
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-[1.25rem] font-bold text-ink">{t(`how.roles.${k}.title`)}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{t(`how.roles.${k}.body`)}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <OneVoiceThreeOutputs />
      <Faq keys={['ai', 'write', 'who']} />
      <FinalCta />
    </>
  );
}
