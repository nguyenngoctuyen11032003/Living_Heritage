import { Info } from 'lucide-react';
import { Faq, Plans, Section } from '@/components/landing';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { PageHero } from './StaticPage';
import { useDocumentTitle } from './hooks';

const NOTES = ['a', 'b', 'c', 'd'] as const;

/** /goi-dich-vu */
export default function PlansPage() {
  const t = useT('legal');
  useDocumentTitle(t('plans.title'));
  return (
    <>
      <PageHero eyebrow={t('plans.eyebrow')} heading={t('plans.heading')} lead={t('plans.lead')} />
      <Plans />
      <Section labelledBy="plan-notes" className="!pb-0">
        <Reveal className="mx-auto max-w-3xl rounded-[1.75rem] bg-paper p-7 ring-1 ring-line md:p-9">
          <h2 id="plan-notes" className="flex items-center gap-3 font-serif text-[1.5rem] font-semibold text-heritage-deep">
            <Info aria-hidden="true" className="size-6 text-terracotta" />
            {t('plans.notesTitle')}
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {NOTES.map((k) => (
              <li key={k} className="flex gap-3 leading-relaxed text-ink">
                <span aria-hidden="true" className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-heritage" />
                {t(`plans.notes.${k}`)}
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>
      <Faq keys={['paid', 'delete', 'who']} />
    </>
  );
}
