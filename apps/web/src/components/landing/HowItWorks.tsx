import { BadgeCheck, FileText, Mic, Share2, type LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { ArrowLink, Section, SectionHeading } from './shared';

const STEPS: Array<{ key: 's1' | 's2' | 's3' | 's4'; icon: LucideIcon; who: 'person' | 'ai' }> = [
  { key: 's1', icon: Mic, who: 'person' },
  { key: 's2', icon: FileText, who: 'ai' },
  { key: 's3', icon: BadgeCheck, who: 'person' },
  { key: 's4', icon: Share2, who: 'person' },
];

/** Block 6 — four numbered steps. `showLink` adds the link to the detailed page. */
export function HowItWorks({ showLink = true, headingLevel = 2 }: { showLink?: boolean; headingLevel?: 2 | 3 }) {
  const t = useT('landing');
  const H = headingLevel === 2 ? 'h3' : 'h4';
  return (
    <Section id="cach-hoat-dong" labelledBy="how-title" className="bg-paper/60">
      <SectionHeading id="how-title" eyebrow={t('how.eyebrow')} title={t('how.title')} lead={t('how.lead')} aside={showLink ? <ArrowLink to="/cach-hoat-dong">{t('how.cta')}</ArrowLink> : undefined} />
      <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-6">
        <span aria-hidden="true" className="pointer-events-none absolute left-[12%] right-[12%] top-[3.25rem] hidden border-t-2 border-dashed border-heritage/20 lg:block" />
        {STEPS.map(({ key, icon: Icon, who }, i) => (
          <Reveal as="li" key={key} delay={i * 0.1} className="relative">
            <div className="flex h-full flex-col rounded-[1.75rem] bg-cream p-6 ring-1 ring-line md:p-7">
              <div className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 inline-flex size-14 items-center justify-center rounded-2xl ring-4 ring-cream',
                    who === 'ai' ? 'bg-mint text-heritage-deep' : 'bg-heritage text-cream',
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <span className="font-serif text-[2.6rem] font-semibold leading-none text-heritage/15" aria-hidden="true">
                  0{i + 1}
                </span>
              </div>
              <H className="mt-6 text-[1.2rem] font-bold leading-snug text-ink">
                <span className="sr-only">{i + 1}. </span>
                {t(`how.steps.${key}.title`)}
              </H>
              <p className="mt-2 leading-relaxed text-ink-soft">{t(`how.steps.${key}.body`)}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
