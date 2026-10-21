import { Clock3, Headphones, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { findTopic, topicStyle, type HubTopic } from '../topics';
import { bareQuote, type KnowledgeItem } from '../types';
import { TopicMotif } from './TopicMotif';

export interface KnowledgeCardProps {
  item: KnowledgeItem;
  topics: readonly HubTopic[];
  /** Larger magazine "lead story" layout. */
  featured?: boolean;
  /** Heading level for the title (default h3). */
  headingLevel?: 'h2' | 'h3';
}

/** Magazine card: topic colour band + motif, type label, the title as a serif quote, narrator, region, audio. */
export function KnowledgeCard({ item, topics, featured, headingLevel = 'h3' }: KnowledgeCardProps) {
  const t = useT('knowledge');
  const pick = usePick();
  const style = topicStyle(item.topicSlug);
  const topic = findTopic(topics, item.topicSlug);
  const Heading = headingLevel;
  const showAudio = item.audioAllowed;

  return (
    <article
      className={cn(
        'group relative flex h-full overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-line/90 transition-[transform,box-shadow] duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-[0_26px_50px_-32px_rgba(22,58,49,0.55)] focus-within:-translate-y-1 focus-within:ring-2 focus-within:ring-heritage active:scale-[0.995] motion-reduce:transform-none',
        featured ? 'flex-col md:flex-row' : 'flex-col',
      )}
    >
      <div
        className={cn('relative shrink-0 overflow-hidden', featured ? 'h-36 md:h-auto md:w-[38%]' : 'h-28')}
        style={{ backgroundColor: style.band, color: style.ink }}
      >
        <TopicMotif
          slug={item.topicSlug}
          className={cn(
            'absolute opacity-55 transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100',
            featured ? '-right-6 bottom-0 w-[115%] md:bottom-6 md:right-auto md:-left-4' : '-right-8 -bottom-4 w-[85%]',
          )}
        />
        <div className="relative flex items-start justify-between gap-3 p-5">
          <span className="text-[0.875rem] font-bold uppercase tracking-[0.1em]">{topic ? pick(topic.title) : ' '}</span>
          {featured && <span className="hidden rounded-full bg-paper/70 px-3 py-1 text-[0.875rem] font-bold uppercase tracking-[0.1em] md:inline">{t('card.featured')}</span>}
        </div>
      </div>

      <div className={cn('flex min-w-0 flex-1 flex-col', featured ? 'p-6 md:p-9' : 'p-6')}>
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-full px-3 py-1 text-[0.875rem] font-semibold',
            item.kind === 'experience' ? 'bg-heritage text-cream' : 'bg-terracotta/10 text-terracotta ring-1 ring-terracotta/25',
          )}
        >
          {t(`kinds.${item.kind}`)}
        </span>
        <span aria-hidden="true" className={cn('mt-3 block font-serif leading-none text-terracotta/80', featured ? 'text-[3.6rem]' : 'text-[2.8rem]')}>
          “
        </span>
        <Heading className={cn('-mt-4 font-serif font-semibold text-heritage-deep', featured ? 'text-[clamp(1.4rem,1.1rem+1.2vw,1.9rem)] leading-[1.3]' : 'text-[1.2rem] leading-[1.4]')}>
          <Link
            to={`/tri-thuc/${item.id}`}
            className="after:absolute after:inset-0 after:rounded-[1.75rem] after:content-[''] focus-visible:outline-none"
          >
            {bareQuote(item.title)}
          </Link>
        </Heading>
        {featured && item.summary && <p className="mt-4 line-clamp-3 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">{item.summary}</p>}

        <div className="mt-auto pt-6">
          <div className="flex flex-col gap-3 border-t border-line/80 pt-4">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-ink-soft">
              <span className="font-semibold text-ink">{item.narratorLabel}</span>
              {item.region && (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden="true" className="size-4" />
                  {t(`regions.${item.region}`)}
                </span>
              )}
              {item.decade && <span>{t('card.decade', { decade: item.decade })}</span>}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-[0.875rem]">
              {showAudio ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 font-semibold text-heritage-deep">
                  <Headphones aria-hidden="true" className="size-4" />
                  {t('card.audio')}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-ink-soft ring-1 ring-line">{t('card.textOnly')}</span>
              )}
              {showAudio && item.durationS && (
                <span className="inline-flex items-center gap-1 tabular-nums text-ink-soft">
                  <Clock3 aria-hidden="true" className="size-4" />
                  {t('card.listenFor', { time: formatDuration(item.durationS) })}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function KnowledgeCardSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className={cn('flex h-full overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-line', featured ? 'flex-col md:flex-row' : 'flex-col')}>
      <Skeleton className={cn('rounded-none', featured ? 'h-36 md:h-auto md:w-[38%]' : 'h-28')} />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="mt-4 h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="mt-6 h-4 w-1/2" />
      </div>
    </div>
  );
}
