import { ArrowLeft, ArrowRight, FileText, Headphones, RotateCcw, SearchX } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { StoryScene } from '@/components/illustrations/scenes';
import { Reveal } from '@/components/motion';
import { AudioPlayer, Button, ButtonLink, IllustrativeBadge, Skeleton } from '@/components/ui';
import { useLocale, usePick, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { publicAudioUrl } from '../api';
import { ItemActions } from '../components/ItemActions';
import { ItemBody, SourceBox } from '../components/ItemBody';
import { KnowledgeCard } from '../components/KnowledgeCard';
import { PageState } from '../components/PageState';
import { SampleBanner } from '../components/SampleBanner';
import { TopicMotif } from '../components/TopicMotif';
import { findTopic, topicStyle, useTopics } from '../topics';
import { bareQuote, type KnowledgeItem } from '../types';
import { useKnowledgeItem } from '../useKnowledgeItem';

export default function ItemPage() {
  const { id } = useParams();
  const t = useT('knowledge');
  const tc = useT('common');
  const { status, item, related, retry } = useKnowledgeItem(id);
  const topics = useTopics();

  useEffect(() => {
    if (item) document.title = `${bareQuote(item.title)} · ${tc('brand.name')}`;
  }, [item, tc]);

  if (status === 'loading') return <ItemSkeleton />;
  if (status === 'not-configured') {
    return (
      <Shell>
        <PageState title={tc('states.notConfigured')} action={<ButtonLink to="/kham-pha">{t('states.backToHub')}</ButtonLink>} />
      </Shell>
    );
  }
  if (status === 'error') {
    return (
      <Shell>
        <div role="alert">
          <PageState
            icon={<SearchX />}
            title={t('states.itemError')}
            action={
              <Button onClick={retry} leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
                {t('states.retry')}
              </Button>
            }
          />
        </div>
      </Shell>
    );
  }
  if (status === 'not-found' || !item) {
    return (
      <Shell>
        <PageState
          icon={<SearchX />}
          title={t('states.notFoundTitle')}
          description={t('states.notFoundBody')}
          action={<ButtonLink to="/kham-pha">{t('states.backToHub')}</ButtonLink>}
        />
      </Shell>
    );
  }
  return <ItemView item={item} related={related} topics={topics} />;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">{children}</div>;
}

function ItemView({ item, related, topics }: { item: KnowledgeItem; related: KnowledgeItem[]; topics: ReturnType<typeof useTopics> }) {
  const t = useT('knowledge');
  const pick = usePick();
  const { locale } = useLocale();
  const style = topicStyle(item.topicSlug);
  const topic = findTopic(topics, item.topicSlug);
  const topicTitle = topic ? pick(topic.title) : null;
  const sb = getSupabase();
  const audioSrc = !item.sample && item.audioAllowed && item.audioPath && sb ? publicAudioUrl(sb, item.audioPath) : undefined;
  const showSamplePlayer = item.sample && item.audioAllowed && item.durationS;

  return (
    <article className="bg-cream">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line/70" style={{ backgroundColor: style.wash }}>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -left-10 w-[520px] opacity-[0.12]" style={{ color: style.ink }}>
          <TopicMotif slug={item.topicSlug} className="w-full" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 md:px-8 md:pb-14 md:pt-10">
          <Link to="/kham-pha" className="inline-flex min-h-12 items-center gap-2 rounded-full pr-3 text-[0.92rem] font-semibold text-heritage hover:text-heritage-deep">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t('detail.back')}
          </Link>
          {item.sample && <SampleBanner compact className="mt-4" />}
          <div className="mt-6 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <p className="text-[0.8rem] font-bold uppercase tracking-[0.2em]" style={{ color: style.ink }}>
                {topicTitle ? `${topicTitle} · ` : ''}
                {t(`kinds.${item.kind}`)}
              </p>
              <Reveal>
                <h1 className="mt-4 font-serif text-[2rem] font-semibold leading-[1.18] tracking-[-0.01em] text-heritage-deep sm:text-[2.5rem] md:text-[3.1rem]">
                  <span aria-hidden="true" className="text-terracotta">
                    “
                  </span>
                  {bareQuote(item.title)}
                  <span aria-hidden="true" className="text-terracotta">
                    ”
                  </span>
                </h1>
              </Reveal>
              <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[1rem] text-ink-soft">
                <span>
                  {t('detail.by')}: <strong className="font-semibold text-ink">{item.narratorLabel}</strong>
                </span>
                {item.region && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{t(`regions.${item.region}`)}</span>
                  </>
                )}
                {item.decade && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{t('card.decade', { decade: item.decade })}</span>
                  </>
                )}
                {item.publishedAt && !item.sample && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{t('detail.publishedOn', { date: formatDate(item.publishedAt, locale) })}</span>
                  </>
                )}
                {item.sample && <IllustrativeBadge />}
              </p>
              <div className="mt-8">
                <ItemActions item={item} />
              </div>
            </div>
            <div aria-hidden="true" className="relative hidden aspect-[3/4] overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-40px_rgba(22,58,49,0.6)] ring-1 ring-black/5 lg:block" style={{ backgroundColor: style.band }}>
              <StoryScene kind={style.scene} className="absolute inset-0" />
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 max-w-3xl">
          {audioSrc || showSamplePlayer ? (
            <section aria-labelledby="listen-title" className="mb-12 rounded-[1.75rem] bg-night p-5 text-night-ink shadow-[0_30px_60px_-40px_rgba(18,27,24,0.8)] md:p-7">
              <h2 id="listen-title" className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-[0.18em] text-night-ink/80">
                <Headphones aria-hidden="true" className="size-4" />
                {t('detail.listenTitle')}
              </h2>
              <AudioPlayer
                src={audioSrc}
                duration={item.durationS ?? 0}
                title={bareQuote(item.title)}
                subtitle={item.narratorLabel}
                tone="dark"
                className="mt-4"
              />
              {!item.sample && <p className="mt-3 text-[0.85rem] text-night-ink/70">{t('detail.listenHint')}</p>}
            </section>
          ) : (
            <p className="mb-10 flex items-start gap-3 rounded-2xl bg-paper px-5 py-4 text-[0.95rem] text-ink-soft ring-1 ring-line">
              {item.audioAllowed ? <Headphones aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-heritage" /> : <FileText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-heritage" />}
              {item.audioAllowed ? t('detail.audioPending') : t('detail.textOnly')}
            </p>
          )}
          <ItemBody item={item} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SourceBox item={item} topicTitle={topicTitle} />
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="border-t border-line/70 bg-paper/50">
          <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="related-title" className="font-serif text-[1.6rem] font-semibold text-heritage-deep">
                {t('detail.related')}
              </h2>
              {item.topicSlug && (
                <Link to={`/kham-pha?chu-de=${item.topicSlug}`} className="inline-flex min-h-12 items-center gap-2 font-semibold text-heritage hover:text-heritage-deep">
                  {t('detail.relatedAll')}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              )}
            </div>
            <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.id}>
                  <KnowledgeCard item={r} topics={topics} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}

function ItemSkeleton() {
  const tc = useT('common');
  return (
    <div aria-busy="true" className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      <span role="status" className="sr-only">{tc('actions.loading')}</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-8 h-12 w-full max-w-3xl" />
      <Skeleton className="mt-3 h-12 w-2/3 max-w-2xl" />
      <Skeleton className="mt-6 h-5 w-72" />
      <div className="mt-8 flex gap-3">
        <Skeleton className="h-12 w-40 rounded-full" />
        <Skeleton className="h-12 w-32 rounded-full" />
      </div>
      <Skeleton className="mt-14 h-40 w-full max-w-3xl rounded-[1.75rem]" />
      <div className="mt-10 max-w-3xl space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-4/5" />
      </div>
    </div>
  );
}
