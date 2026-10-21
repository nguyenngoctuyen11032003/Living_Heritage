import { ArrowRight, BookOpen, CircleAlert, Lightbulb } from 'lucide-react';
import { Link } from 'react-router';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { usePick, useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { useAddress } from '@/features/storytelling/address';
import { AssistedBanner, ELDER_CONTROLS, StorytellerGate, TopicIcon } from '@/features/storytelling/components';
import { fetchTopics, useAsync, useStoryteller } from '@/features/storytelling/data';
import { elderButton, elderEmpty, useNarratorTitle } from './elder';

const EASY_SLUG = 'goi-y';

const cardClass =
  'group flex min-h-[9rem] flex-col justify-between gap-5 rounded-[1.75rem] bg-paper p-6 text-left ring-1 ring-line transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(31,77,58,0.45)] hover:ring-heritage/50 focus-visible:ring-2 focus-visible:ring-heritage motion-reduce:transform-none motion-reduce:transition-none';

export default function StorytellingHome() {
  const t = useT('narrator');
  const pick = usePick();
  const ctx = useStoryteller();
  const address = useAddress();
  const sb = getSupabase();
  const topics = useAsync(async () => (sb ? fetchTopics(sb) : []), [sb]);
  useNarratorTitle(t('titles.home'));

  if (ctx.status !== 'ready') return <StorytellerGate ctx={ctx} />;
  const { narrator, assisted, query } = ctx;

  return (
    <div className={`flex flex-col gap-10 ${ELDER_CONTROLS}`}>
      {assisted && <AssistedBanner name={narrator.display_name} />}
      <header className="flex flex-col gap-3">
        <p className="text-[1.17rem] font-medium text-heritage">
          {narrator.family_name ? t('home.family', { family: narrator.family_name }) : t('home.eyebrow')}
        </p>
        <h1 className="break-words font-serif text-[2.2rem] font-semibold leading-tight text-ink md:text-[2.75rem]">{t('home.greeting', { who: address(narrator.display_name) })}</h1>
        <p className="max-w-2xl text-[1.25rem] leading-relaxed text-ink-soft">{t('home.intro', { pronoun: t('home.pronoun') })}</p>
      </header>

      <section aria-labelledby="topics-heading" className="flex flex-col gap-5">
        <h2 id="topics-heading" className="font-serif text-[1.5rem] font-semibold leading-snug text-heritage-deep">
          {t('home.topicsLabel')}
        </h2>
        {topics.status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label={t('gate.loading')}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[9rem] rounded-[1.75rem]" />
            ))}
          </div>
        )}
        {topics.status === 'error' && (
          <EmptyState
            className={elderEmpty}
            icon={<CircleAlert />}
            title={t('gate.errorTitle')}
            description={t('gate.errorDesc')}
            action={
              <Button size="lg" className={elderButton} onClick={topics.reload}>
                {t('gate.retry')}
              </Button>
            }
          />
        )}
        {topics.status === 'ready' && topics.data.length === 0 && (
          <EmptyState
            className={elderEmpty}
            title={t('home.noTopicsTitle')}
            description={t('home.noTopicsDesc')}
            action={
              <Button size="lg" className={elderButton} onClick={topics.reload}>
                {t('home.reload')}
              </Button>
            }
          />
        )}
        {topics.status === 'ready' && topics.data.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {topics.data.slice(0, 6).map((topic) => (
              <li key={topic.id}>
                <Link to={`/ke-chuyen/chu-de/${topic.slug}${query}`} className={cardClass}>
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-mint text-heritage">
                    <TopicIcon slug={topic.slug} className="size-8" />
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-serif text-[1.6rem] font-semibold leading-snug text-ink">{pick({ vi: topic.title_vi, en: topic.title_en })}</span>
                    <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cream text-heritage ring-1 ring-line transition-colors group-hover:bg-heritage group-hover:text-cream">
                      <ArrowRight className="size-6 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            <li className="sm:col-span-2">
              <Link to={`/ke-chuyen/chu-de/${EASY_SLUG}${query}`} className={`${cardClass} bg-mint/60 sm:flex-row sm:items-center`}>
                <span className="flex items-center gap-4">
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-paper text-terracotta">
                    <Lightbulb className="size-8" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-serif text-[1.6rem] font-semibold leading-snug text-ink">{t('home.unsureTitle')}</span>
                    <span className="text-[1.17rem] leading-snug text-ink-soft">{t('home.unsureHint')}</span>
                  </span>
                </span>
                <span aria-hidden="true" className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-paper text-heritage ring-1 ring-line sm:flex">
                  <ArrowRight className="size-6" />
                </span>
              </Link>
            </li>
          </ul>
        )}
      </section>

      <Link
        to={`/ke-chuyen/cua-toi${query}`}
        className="group flex min-h-20 items-center gap-4 rounded-[1.5rem] border border-line px-5 py-4 text-heritage-deep transition-colors hover:border-heritage/50 hover:bg-paper"
      >
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-paper text-heritage ring-1 ring-line">
          <BookOpen className="size-7" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[1.35rem] font-semibold leading-snug">{t('home.myStories')}</span>
          <span className="text-[1.2rem] leading-snug text-ink-soft">{t('home.myStoriesHint')}</span>
        </span>
        <ArrowRight className="size-6 shrink-0 text-heritage" aria-hidden="true" />
      </Link>
    </div>
  );
}
