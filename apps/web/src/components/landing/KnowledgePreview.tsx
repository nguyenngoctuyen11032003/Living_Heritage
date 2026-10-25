import { Clock3, MapPin, Search } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { StoryScene } from '@/components/illustrations/scenes';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import type { SampleItem } from '@/features/knowledge/sample-items';
import { findTopic, STATIC_TOPICS, topicStyle } from '@/features/knowledge/topics';
import { previewItems } from './sample-data';
import { ArrowLink, Section, SectionHeading } from './shared';

function KnowledgeCard({ item, featured }: { item: SampleItem; featured?: boolean }) {
  const t = useT('landing');
  const tk = useT('knowledge');
  const pick = usePick();
  const topic = findTopic(STATIC_TOPICS, item.topicSlug);
  return (
    <article className={cn('group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-line transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_-16px_rgba(22,58,49,0.45)] focus-within:-translate-y-1 active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100', featured && 'md:flex-row')}>
      <div className={cn('relative overflow-hidden', featured ? 'aspect-[4/3] md:aspect-auto md:min-h-[24rem] md:w-1/2' : 'aspect-[16/10]')}>
        <StoryScene kind={topicStyle(item.topicSlug).scene} className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className={cn('rounded-full px-3 py-1 text-[0.8125rem] font-semibold', item.kind === 'experience' ? 'bg-heritage text-cream' : 'bg-cream text-terracotta')}>
            {t(`knowledge.kinds.${item.kind}`)}
          </span>
          {topic && <span className="rounded-full bg-cream/95 px-3 py-1 text-[0.8125rem] font-semibold text-ink">{pick(topic.title)}</span>}
        </div>
      </div>
      <div className={cn('flex flex-1 flex-col p-5', featured ? 'md:w-1/2 md:justify-center md:bg-cream/60 md:p-10 lg:p-12' : 'md:p-6')}>
        <h3 className={cn('font-serif font-semibold leading-snug text-heritage-deep', featured ? 'text-[1.5rem] md:text-[2.1rem] md:leading-tight' : 'text-[1.15rem]')}>
          <Link to={`/tri-thuc/${item.id}`} className="after:absolute after:inset-0 after:rounded-[1.75rem] after:content-[''] focus-visible:outline-none">
            “{pick(item.title)}”
          </Link>
        </h3>
        {featured && <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">{pick(item.summary)}</p>}
        <p className={cn('mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-[0.8125rem] text-ink-soft', featured && 'md:mt-6 md:border-t md:border-line')}>
          <span className="font-semibold text-ink">{pick(item.narratorLabel)}</span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {tk(`regions.${item.region}`)}
          </span>
          {item.durationS !== null && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock3 aria-hidden="true" className="size-4 shrink-0" />
              {formatDuration(item.durationS)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

/** Knowledge hub preview (B6 #7): search box, six magazine cards that open their detail screen, and "see all". */
export function KnowledgePreview() {
  const t = useT('landing');
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const inputId = useId();
  const [first, ...rest] = previewItems();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/kham-pha?q=${encodeURIComponent(query)}` : '/kham-pha');
  }

  return (
    <Section id="kho-tri-thuc" labelledBy="knowledge-title" className="cv-section bg-paper/60">
      <SectionHeading id="knowledge-title" eyebrow={t('knowledge.eyebrow')} title={t('knowledge.title')} lead={t('knowledge.lead')} />
      <Reveal className="mt-8">
        <form role="search" onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-3 sm:flex-row">
          <label htmlFor={inputId} className="sr-only">
            {t('knowledge.searchLabel')}
          </label>
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
            <input
              id={inputId}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('knowledge.searchPlaceholder')}
              className="min-h-14 w-full rounded-full bg-paper pl-13 pr-5 text-[1rem] text-ink ring-1 ring-line placeholder:text-ink-soft/75 focus:outline-none focus:ring-2 focus:ring-heritage"
            />
          </div>
          <Button type="submit" size="lg">
            {t('knowledge.searchCta')}
          </Button>
        </form>
      </Reveal>
      <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {first && (
          <Reveal as="li" className="md:col-span-2 lg:row-span-2">
            <KnowledgeCard item={first} featured />
          </Reveal>
        )}
        {rest.map((item, i) => (
          <Reveal as="li" key={item.id} delay={(i % 3) * 0.08}>
            <KnowledgeCard item={item} />
          </Reveal>
        ))}
      </ul>
      <div className="mt-8 flex justify-center">
        <ArrowLink to="/kham-pha">{t('knowledge.seeAll')}</ArrowLink>
      </div>
    </Section>
  );
}
