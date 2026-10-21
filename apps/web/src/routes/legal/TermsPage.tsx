import { useT } from '@/i18n';
import { LegalDoc, PageHero } from './StaticPage';
import { useDocumentTitle, useLegalDict } from './hooks';

/** /dieu-khoan */
export default function TermsPage() {
  const t = useT('legal');
  const d = useLegalDict();
  useDocumentTitle(t('terms.title'));
  return (
    <>
      <PageHero eyebrow={t('terms.eyebrow')} heading={t('terms.heading')} lead={t('terms.lead')} meta />
      <LegalDoc sections={d.terms.sections} />
    </>
  );
}
