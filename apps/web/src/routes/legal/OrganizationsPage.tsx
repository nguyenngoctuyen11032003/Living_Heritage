import { ArrowDown, Building2, Check, Landmark, Library, School, UsersRound, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { Section, SectionHeading } from '@/components/landing';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { OrgContactForm } from './OrgContactForm';
import { PageHero, StepGrid } from './StaticPage';
import { useDocumentTitle, useLegalDict } from './hooks';

const AUDIENCES: Array<{ key: 'library' | 'museum' | 'seniors' | 'school'; icon: LucideIcon }> = [
  { key: 'library', icon: Library },
  { key: 'museum', icon: Landmark },
  { key: 'seniors', icon: UsersRound },
  { key: 'school', icon: School },
];
const PRINCIPLES = ['a', 'b', 'c', 'd'] as const;

/** /to-chuc */
export default function OrganizationsPage() {
  const t = useT('legal');
  const d = useLegalDict().orgs;
  useDocumentTitle(t('orgs.title'));
  const { hash } = useLocation();

  // Footer deep link /to-chuc#lien-he.
  useEffect(() => {
    if (hash !== '#lien-he') return;
    const timer = window.setTimeout(() => document.getElementById('lien-he')?.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <>
      <PageHero eyebrow={t('orgs.eyebrow')} heading={t('orgs.heading')} lead={t('orgs.lead')} />

      <Section labelledBy="aud-title" className="!pt-4">
        <h2 id="aud-title" className="sr-only">
          {t('orgs.audiencesTitle')}
        </h2>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map(({ key, icon: Icon }, i) => (
            <Reveal as="li" key={key} delay={i * 0.08} className="rounded-[1.75rem] bg-paper p-6 ring-1 ring-line md:p-7">
              <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint text-heritage">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-[1.15rem] font-bold text-ink">{t(`orgs.audiences.${key}.title`)}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{t(`orgs.audiences.${key}.body`)}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section labelledBy="program-title" className="bg-paper/60">
        <SectionHeading id="program-title" eyebrow={t('orgs.eyebrow')} title={t('orgs.programTitle')} />
        <Reveal className="mt-12">
          <StepGrid steps={(['s1', 's2', 's3', 's4'] as const).map((k) => d.program[k])} />
        </Reveal>
      </Section>

      <Section labelledBy="principles-title">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Reveal className="rounded-[1.75rem] bg-paper p-7 ring-1 ring-line md:p-9">
            <h2 id="principles-title" className="font-serif text-[1.6rem] font-semibold text-heritage-deep">
              {t('orgs.principlesTitle')}
            </h2>
            <ul className="mt-6 flex flex-col gap-3">
              {PRINCIPLES.map((k) => (
                <li key={k} className="flex items-start gap-3 leading-relaxed text-ink">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-heritage" />
                  {t(`orgs.principles.${k}`)}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="relative isolate overflow-hidden rounded-[1.75rem] bg-night p-7 text-night-ink md:p-9">
            <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.06]" />
            <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint/12 text-mint ring-1 ring-mint/20">
              <Building2 className="size-5" />
            </span>
            <h2 className="mt-5 font-serif text-[1.6rem] font-semibold">{t('orgs.contactTitle')}</h2>
            <p className="mt-3 leading-relaxed text-night-ink/80">{t('orgs.contactBody')}</p>
            <a href="#lien-he" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-night-ink px-6 font-semibold text-night transition-colors hover:bg-white">
              {t('orgs.contactCta')}
              <ArrowDown aria-hidden="true" className="size-4" />
            </a>
          </Reveal>
        </div>
      </Section>

      <Section id="lien-he" labelledBy="contact-title" className="bg-paper/60">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading id="contact-title" eyebrow={t('orgs.form.eyebrow')} title={t('orgs.form.title')} lead={t('orgs.form.lead')} />
          </div>
          <Reveal className="rounded-[1.75rem] bg-paper p-6 ring-1 ring-line md:p-9 lg:col-span-7">
            <OrgContactForm />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
