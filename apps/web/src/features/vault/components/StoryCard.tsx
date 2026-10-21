import { CalendarDays, Clock3, Mic } from 'lucide-react';
import { Link } from 'react-router';
import { StoryScene } from '@/components/illustrations/scenes';
import { useLocale, usePick, useT } from '@/i18n';
import { formatDate, formatDuration } from '@/lib/format';
import { buildExcerpt } from '../excerpt';
import { StoryStatusBadge } from '../external';
import { VisibilityLabel } from './VisibilityLabel';
import { topicVisual } from '../topics';
import type { NarratorLite, TopicLite, VaultStory } from '../types';

export interface StoryCardProps {
  story: VaultStory;
  narrator?: NarratorLite;
  topic?: TopicLite;
  durationS?: number | null;
}

export function StoryCard({ story, narrator, topic, durationS }: StoryCardProps) {
  const t = useT('vault');
  const pick = usePick();
  const { locale } = useLocale();
  const visual = topicVisual(topic?.slug);
  const excerpt = buildExcerpt(story);
  const title = story.title.trim() || t('card.untitled');
  const topicLabel = topic ? pick({ vi: topic.title_vi, en: topic.title_en }) : t(`kind.${story.kind}`);

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-[1.5rem] bg-paper ring-1 ring-line/80 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-heritage hover:shadow-[0_18px_40px_-24px_rgba(22,58,49,0.45)]">
      <div className="relative h-32 overflow-hidden" style={{ background: visual.band }}>
        <StoryScene kind={visual.scene} className="opacity-90 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        <span className="absolute left-4 top-4 rounded-full bg-paper/95 px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-heritage-deep shadow-sm">
          {topicLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif text-[1.25rem] font-semibold leading-snug text-heritage-deep">
          <Link to={`/cau-chuyen/${story.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {title}
          </Link>
        </h3>
        {excerpt ? (
          <p className="line-clamp-3 font-serif italic leading-relaxed text-ink-soft">“{excerpt}”</p>
        ) : (
          <p className="text-[0.95rem] text-ink-soft/80">{t('card.noText')}</p>
        )}
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem] text-ink-soft">
            <li className="inline-flex items-center gap-1.5">
              <Mic className="size-4" aria-hidden="true" />
              {narrator ? narrator.pen_name || narrator.display_name : t('card.unknownNarrator')}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              <time dateTime={story.created_at}>{formatDate(story.created_at, locale)}</time>
            </li>
            {durationS != null && durationS > 0 && (
              <li className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" aria-hidden="true" />
                <span>{t('card.duration', { d: formatDuration(durationS) })}</span>
              </li>
            )}
          </ul>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StoryStatusBadge size="sm" editStatus={story.edit_status} visibility={story.visibility} />
            {story.visibility !== 'public' && <VisibilityLabel visibility={story.visibility} />}
          </div>
        </div>
      </div>
    </article>
  );
}
