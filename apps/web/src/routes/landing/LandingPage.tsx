import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { CursorDot, Faq, HomeAbout, HomeCta, HomeFeatured, HomeHero, HomePhilosophy, HomeServices, HomeSteps, KnowledgePreview, MemorySphere, SampleStory, TopicMarquee, TrustPrivacy } from '@/components/landing';
import { VideoPlaybackProvider } from '@/components/memory-book';
import { useDisplayFont } from '@/design/useDisplayFont';
import { useT } from '@/i18n';
import '@/design/landing-body.css';

/**
 * '/' — the bilingual homepage, in the liquid-glass cinema style of /sach-ky-uc (same palette in light and dark, same
 * dark header). Motion is layered, one idea per section: blur-in hero words, a scroll-lit manifesto, the topic
 * marquee, a growing featured clip, the sticky step stack and the draggable memory sphere. It summarises the four marketing pages in nav order: how it works (featured clip, four steps,
 * people × AI), then the sample story, one card each for the knowledge hub, memory books and organizations, the live
 * knowledge preview, trust and FAQ. The site-token sections sit in `.lp-body` so the dark theme remaps them to the
 * cinema palette. Header and footer come from SiteLayout.
 */
export default function LandingPage() {
  const tc = useT('common');
  const t = useT('landing');
  const { hash } = useLocation();
  useDisplayFont();

  useEffect(() => {
    document.title = tc('brand.name');
  }, [tc, t]);

  // Deep links such as /#chuyen-mau or /#cau-hoi (footer).
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <VideoPlaybackProvider>
      <div className="mb-page bg-mb-bg text-mb">
        <HomeHero />
        <HomeAbout />
        <TopicMarquee />
        <HomeFeatured />
        <HomeSteps />
        <HomePhilosophy />
        <MemorySphere />
        <div className="lp-body">
          <SampleStory />
        </div>
        <HomeServices />
        <div className="lp-body">
          <KnowledgePreview />
          <TrustPrivacy />
          <Faq />
        </div>
        <HomeCta />
      </div>
      <CursorDot />
    </VideoPlaybackProvider>
  );
}
