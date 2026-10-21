import { useT } from '@/i18n';
import { LegalDoc, PageHero } from './StaticPage';
import { useDocumentTitle, useLegalDict } from './hooks';

/** /quyen-rieng-tu */
export default function PrivacyPage() {
  const t = useT('legal');
  const d = useLegalDict();
  useDocumentTitle(t('privacy.title'));
  return (
    <>
      <PageHero eyebrow={t('privacy.eyebrow')} heading={t('privacy.heading')} lead={t('privacy.lead')} meta />
      <LegalDoc sections={d.privacy.sections} />
    </>
  );
}
