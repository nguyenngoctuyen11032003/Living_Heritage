import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { CurvedCarousel } from './CurvedCarousel';
import { requestSamplePlay } from './events';
import { CAROUSEL_STORIES } from './sample-data';

/** The arched ribbon of illustrative stories (not on the homepage any more; kept for reuse). */
export function StoryRibbon({ className }: { className?: string }) {
  const t = useT('landing');
  return (
    <section aria-label={t('ui.carousel.label')} className={cn('relative pb-6 [--u:calc(min(100vw,133.333vh)/1440)]', className)}>
      <CurvedCarousel stories={CAROUSEL_STORIES} onPlay={() => requestSamplePlay()} />
    </section>
  );
}
