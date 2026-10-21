import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { BookShowcase, Faq, FeatureGrid, FinalCta, Hero, HowItWorks, KnowledgePreview, Manifesto, OneVoiceThreeOutputs, Plans, SampleStory, StoryRibbon, TrustPrivacy, ValueTrio } from '@/components/landing';
import { useT } from '@/i18n';

/** '/' — the 13-block bilingual homepage (spec §6.1). Header and footer come from SiteLayout. */
export default function LandingPage() {
  const tc = useT('common');
  const t = useT('landing');
  const { hash } = useLocation();

  useEffect(() => {
    document.title = `${tc('brand.name')} — ${t('footer.tagline')}`;
  }, [tc, t]);

  // Deep links such as /#chuyen-mau or /#cau-hoi (footer).
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <>
      <Hero />
      <StoryRibbon />
      <SampleStory />
      <Manifesto />
      <ValueTrio />
      <HowItWorks />
      <OneVoiceThreeOutputs />
      <FeatureGrid />
      <KnowledgePreview />
      <BookShowcase />
      <TrustPrivacy />
      <Plans />
      <Faq />
      <FinalCta />
    </>
  );
}
