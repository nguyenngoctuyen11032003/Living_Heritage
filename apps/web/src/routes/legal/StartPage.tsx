import { ArrowRight, Compass, Headphones, Library, Mic, UsersRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ArrowLink, Section } from '@/components/landing';
import { Reveal } from '@/components/motion';
import { buttonClasses } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { PageHero } from './StaticPage';
import { useDocumentTitle } from './hooks';

type RoleKey = 'tell' | 'keep' | 'learn';

/** One card per role (B5 /bat-dau): each leads straight into the matching experience. */
const START_ROLES: Array<{ key: RoleKey; icon: LucideIcon; to: string; alt?: string }> = [
  { key: 'tell', icon: Mic, to: '/ke-chuyen' },
  { key: 'keep', icon: UsersRound, to: '/dang-ky', alt: '/dang-nhap' },
  { key: 'learn', icon: Library, to: '/kham-pha' },
];

/** /bat-dau — choose a role and purpose, then go to the storytelling topics, family sign-up or the knowledge hub. */
export default function StartPage() {
  const t = useT('legal');
  useDocumentTitle(t('start.title'));
  return (
    <>
      <PageHero eyebrow={t('start.eyebrow')} heading={t('start.heading')} lead={t('start.lead')} />
      <Section labelledBy="start-roles" className="!pt-4 !pb-16 md:!pb-20">
        <h2 id="start-roles" className="sr-only">
          {t('start.rolesTitle')}
        </h2>
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
          {START_ROLES.map(({ key, icon: Icon, to, alt }, i) => (
            <Reveal as="li" key={key} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl bg-paper p-6 ring-1 ring-line md:p-7">
                <span aria-hidden="true" className={cn('inline-flex size-12 items-center justify-center rounded-2xl', key === 'tell' ? 'bg-heritage text-cream' : 'bg-mint text-heritage')}>
                  <Icon className="size-6" />
                </span>
                <p className="mt-5 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-terracotta">{t(`start.roles.${key}.who`)}</p>
                <h3 className="mt-1 font-serif text-[1.4rem] font-semibold leading-snug text-heritage-deep">{t(`start.roles.${key}.title`)}</h3>
                <p className="mt-2 flex-1 leading-relaxed text-ink-soft">{t(`start.roles.${key}.body`)}</p>
                <div className={cn('mt-6 flex flex-col', !alt && 'md:pb-14')}>
                <Link to={to} className={buttonClasses({ variant: key === 'tell' ? 'primary' : 'secondary', size: 'lg', fullWidth: true, className: 'gap-2' })}>
                  {t(`start.roles.${key}.cta`)}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                {alt && (
                  <Link to={alt} className="mt-2 inline-flex min-h-12 items-center justify-center font-semibold text-heritage underline-offset-[6px] hover:underline">
                    {t('start.signIn')}
                  </Link>
                )}
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-10 flex flex-col items-center gap-2 text-center">
          <p className="text-ink-soft">{t('start.notReady')}</p>
          <div className="flex flex-wrap justify-center gap-x-8">
            <ArrowLink to="/#chuyen-mau">
              <Headphones aria-hidden="true" className="size-4" />
              {t('start.sample')}
            </ArrowLink>
            <ArrowLink to="/trai-nghiem">
              <Compass aria-hidden="true" className="size-4" />
              {t('start.demo')}
            </ArrowLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
