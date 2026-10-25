import { ArrowDown, ArrowRight, Building2, Check, Landmark, Library, Mail, Phone, School, UsersRound, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { Section, SectionHeading } from '@/components/landing';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_LABEL } from '@/lib/contact';
import { OrgContactForm } from './OrgContactForm';
import { StepGrid } from './StaticPage';
import { useDocumentTitle, useLegalDict } from './hooks';
import { useReducedMotionSafe } from '@/design/motion';
import { useDisplayFont } from '@/design/useDisplayFont';
import './org-hero.css';
import '@/design/landing-body.css';

const AUDIENCES: Array<{ key: 'library' | 'museum' | 'seniors' | 'school'; icon: LucideIcon }> = [
  { key: 'library', icon: Library },
  { key: 'museum', icon: Landmark },
  { key: 'seniors', icon: UsersRound },
  { key: 'school', icon: School },
];
const PRINCIPLES = ['a', 'b', 'c'] as const;
const NEXT_STEPS = ['a', 'b', 'c'] as const;

const HERO_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204103_f607742e-09da-4cf5-bb06-4e67b0a531de.mp4';

/** Full-viewport hero over looping footage; the last words of the heading are set in italics. */
function OrgHero() {
  const t = useT('legal');
  const reduced = useReducedMotionSafe();
  const words = t('orgs.heading').split(' ');
  const cut = Math.max(1, words.length - 3);
  return (
    <section aria-labelledby="org-title" className="oh">
      <video className="oh__video" src={HERO_VIDEO} autoPlay={!reduced} muted loop playsInline preload={reduced ? 'metadata' : 'auto'} disablePictureInPicture aria-hidden="true" tabIndex={-1} />
      <div aria-hidden="true" className="oh__wash" />
      <div className="oh__inner">
        <p className="oh__eyebrow">
          <i aria-hidden="true" />
          {t('orgs.eyebrow')}
          <i aria-hidden="true" />
        </p>
        <h1 id="org-title" className="oh__title">
          {words.slice(0, cut).join(' ')} <em>{words.slice(cut).join(' ')}</em>
        </h1>
        <p className="oh__lead">{t('orgs.lead')}</p>
        <div className="oh__actions">
          <a href="#lien-he" className="oh__btn oh__btn--solid">
            {t('orgs.contactCta')}
            <ArrowRight aria-hidden="true" />
          </a>
          <a href="#chuong-trinh" className="oh__btn oh__btn--ghost">
            {t('orgs.programTitle')}
          </a>
        </div>
      </div>
    </section>
  );
}

/** /to-chuc */
export default function OrganizationsPage() {
  const t = useT('legal');
  const d = useLegalDict().orgs;
  useDocumentTitle(t('orgs.title'));
  useDisplayFont();
  const { hash } = useLocation();

  // Footer deep link /to-chuc#lien-he.
  useEffect(() => {
    if (hash !== '#lien-he') return;
    const timer = window.setTimeout(() => document.getElementById('lien-he')?.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <>
      <OrgHero />

      <div className="lp-body">
      <Section labelledBy="aud-title" className="!pt-4">
        <h2 id="aud-title" className="sr-only">
          {t('orgs.audiencesTitle')}
        </h2>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map(({ key, icon: Icon }, i) => (
            <Reveal as="li" key={key} delay={i * 0.08} className="rounded-2xl bg-paper p-6 ring-1 ring-line md:p-7">
              <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint text-heritage">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 text-[1.15rem] font-bold text-ink">{t(`orgs.audiences.${key}.title`)}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{t(`orgs.audiences.${key}.body`)}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section id="chuong-trinh" labelledBy="program-title" className="bg-paper/60">
        <SectionHeading id="program-title" eyebrow={t('orgs.eyebrow')} title={t('orgs.programTitle')} />
        <Reveal className="mt-12">
          <StepGrid steps={(['s1', 's2', 's3', 's4'] as const).map((k) => d.program[k])} />
        </Reveal>
      </Section>

      <Section labelledBy="principles-title">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Reveal className="rounded-2xl bg-paper p-7 ring-1 ring-line md:p-9">
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
          <Reveal delay={0.1} className="lp-dark-card relative isolate overflow-hidden rounded-2xl bg-night p-7 text-night-ink md:p-9">
            <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.06]" />
            <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/10 text-mint-fixed ring-1 ring-white/15">
              <Building2 className="size-6" />
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
            <Reveal className="mt-8">
              <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{t('orgs.form.channelsTitle')}</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {[
                  { href: `tel:${CONTACT_PHONE}`, icon: Phone, label: t('orgs.form.call'), value: CONTACT_PHONE_LABEL },
                  { href: `mailto:${CONTACT_EMAIL}`, icon: Mail, label: t('orgs.form.email'), value: CONTACT_EMAIL },
                ].map(({ href, icon: Icon, label, value }) => (
                  <li key={href}>
                    <a href={href} className="group flex min-h-16 items-center gap-3 rounded-2xl bg-paper p-3 pr-4 ring-1 ring-line transition-colors hover:bg-mint/50">
                      <span aria-hidden="true" className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-heritage text-cream">
                        <Icon className="size-6" />
                      </span>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="text-[0.78rem] font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
                        <span className="mt-1 text-[1rem] [overflow-wrap:anywhere] font-semibold text-ink group-hover:text-heritage-deep">{value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.08} className="mt-8">
              <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{t('orgs.form.nextTitle')}</h3>
              <ol className="mt-3 flex flex-col gap-3">
                {NEXT_STEPS.map((k, i) => (
                  <li key={k} className="flex items-start gap-3 leading-relaxed text-ink">
                    <span aria-hidden="true" className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-mint text-[0.8rem] font-bold text-heritage-deep">{i + 1}</span>
                    {t(`orgs.form.next.${k}`)}
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
          <Reveal className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7 md:p-9 lg:col-span-7">
            <OrgContactForm />
          </Reveal>
        </div>
      </Section>
      </div>
    </>
  );
}
