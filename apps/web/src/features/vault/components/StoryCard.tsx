import { CalendarDays, Clock3 } from 'lucide-react';
import { Link } from 'react-router';
import { StoryScene } from '@/components/illustrations/scenes';
import { topicStyle } from '@/features/knowledge/topics';
import { useStoryCover } from '@/features/media/hooks';
import { useLocale, usePick, useT } from '@/i18n';
import { formatDate, formatDuration } from '@/lib/format';
import { buildExcerpt } from '../excerpt';
import { StoryStatusBadge } from '../external';
import { NarratorAvatar } from './NarratorAvatar';
import { VisibilityLabel } from './VisibilityLabel';
import type { NarratorLite, TopicLite, VaultStory } from '../types';

export interface StoryCardProps {
  story: VaultStory;
  narrator?: NarratorLite;
  topic?: TopicLite;
  durationS?: number | null;
  /** When the source was recorded (recording.created_at); the story date is used until it is known. */
  recordedAt?: string | null;
}

export function StoryCard({ story, narrator, topic, durationS, recordedAt }: StoryCardProps) {
  const t = useT('vault');
  const pick = usePick();
  const { locale } = useLocale();
  const style = topicStyle(topic?.slug);
  const excerpt = buildExcerpt(story);
  const title = story.title.trim() || t('card.untitled');
  // First story photo as cover once the card nears the viewport (batched); the topic illustration otherwise.
  const cover = useStoryCover<HTMLDivElement>(story.id);
  const topicLabel = topic ? pick({ vi: topic.title_vi, en: topic.title_en }) : t(`kind.${story.kind}`);
  // The family vault is private: show the name the family uses (as in the filter and the detail page), not the pen name.
  const narratorName = narrator ? narrator.display_name : t('card.unknownNarrator');
  const recorded = recordedAt || story.created_at;

  return (
    <article className="group relative flex w-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] bg-paper ring-1 ring-line/80 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-heritage hover:shadow-[0_18px_40px_-24px_rgba(22,58,49,0.45)]">
      {/* Topic colour band: photo cover when the story has one, the topic scene otherwise. */}
      <div ref={cover.ref} className="relative h-32 overflow-hidden" style={{ background: style.band }}>
        {cover.url ? (
          <img
            src={cover.url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-2/5 opacity-95">
            <StoryScene kind={style.scene} className="transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          </div>
        )}
        <span
          className="absolute left-4 top-4 max-w-[55%] truncate rounded-full bg-paper/95 px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] shadow-sm"
          style={{ color: style.ink }}
        >
          {topicLabel}
        </span>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1" style={{ background: style.ink, opacity: 0.35 }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif text-[1.25rem] font-semibold leading-snug break-words text-heritage-deep">
          <Link to={`/cau-chuyen/${story.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {title}
          </Link>
        </h3>
        {excerpt ? (
          <p className="line-clamp-3 font-serif italic leading-relaxed text-ink-soft">“{excerpt}”</p>
        ) : (
          <p className="text-[0.95rem] text-ink-soft">{t('card.noText')}</p>
        )}
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-cream py-1 pl-1 pr-3 ring-1 ring-line/70">
            <NarratorAvatar id={narrator?.id ?? story.narrator_id} name={narratorName} size="sm" />
            <span className="truncate text-[0.88rem] font-semibold text-ink">{narratorName}</span>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem] text-ink-soft">
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              <span className="sr-only">{t('card.recorded')} </span>
              <time dateTime={recorded}>{formatDate(recorded, locale)}</time>
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
