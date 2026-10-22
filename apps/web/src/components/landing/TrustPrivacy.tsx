import { Download, Lock, PenLine, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { ArrowLink, Section, SectionHeading } from './shared';

const ITEMS: Array<{ key: 'private' | 'approve' | 'piece' | 'control'; icon: LucideIcon }> = [
  { key: 'private', icon: Lock },
  { key: 'approve', icon: PenLine },
  { key: 'piece', icon: SlidersHorizontal },
  { key: 'control', icon: Download },
];

/** Block 11 — privacy & trust principles (no fake certifications). */
export function TrustPrivacy() {
  const t = useT('landing');
  return (
    <Section id="quyen-va-niem-tin" labelledBy="trust-title" className="cv-section">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionHeading id="trust-title" eyebrow={t('trust.eyebrow')} title={t('trust.title')} lead={t('trust.lead')} />
            <Reveal delay={0.1} className="mt-6">
              <ArrowLink to="/quyen-rieng-tu">{t('trust.cta')}</ArrowLink>
            </Reveal>
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7 lg:gap-5">
          {ITEMS.map(({ key, icon: Icon }, i) => (
            <Reveal as="li" key={key} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-[1.75rem] bg-paper p-6 ring-1 ring-line md:p-7">
                <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint text-heritage">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-[1.15rem] font-bold leading-snug text-ink">{t(`trust.items.${key}.title`)}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{t(`trust.items.${key}.body`)}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
