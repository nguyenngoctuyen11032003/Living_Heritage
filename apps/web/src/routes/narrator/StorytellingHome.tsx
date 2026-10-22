import { ArrowRight, BookOpen, CircleAlert, Lightbulb } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { useLocale, usePick, useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { useAddress } from '@/features/storytelling/address';
import { AssistedBanner, ELDER_CONTROLS, StorytellerGate, TopicIcon } from '@/features/storytelling/components';
import { NarratorHelp } from '@/features/storytelling/NarratorHelp';
import { fetchTopics, useAsync, useStoryteller } from '@/features/storytelling/data';

const EASY_SLUG = 'goi-y';

const cardClass =
  'group flex min-h-[8.5rem] min-w-0 flex-col justify-between gap-4 rounded-[1.75rem] bg-paper p-5 sm:p-6 text-left ring-1 ring-line transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(31,77,58,0.45)] hover:ring-heritage/50 motion-reduce:transform-none';

export default function StorytellingHome() {
  const t = useT('narrator');
  const pick = usePick();
  const { locale } = useLocale();
  const ctx = useStoryteller();
  const address = useAddress();
  const sb = getSupabase();
  const topics = useAsync(async () => (sb ? fetchTopics(sb) : []), [sb]);

  useEffect(() => {
    document.title = `${t('home.topicsLabel')} · Di Sản Sống`;
  }, [t, locale]);

  if (ctx.status !== 'ready') return <StorytellerGate ctx={ctx} />;
  const { narrator, assisted, query } = ctx;

  return (
    <div className={`flex flex-col gap-10 ${ELDER_CONTROLS}`}>
      <NarratorHelp />
      {assisted && <AssistedBanner name={narrator.display_name} />}
      <header className="flex flex-col gap-3">
        {narrator.family_name && <p className="text-[1.25rem] font-medium text-heritage">{t('home.family', { family: narrator.family_name })}</p>}
        <h1 className="font-serif text-[2.2rem] font-semibold leading-tight text-ink md:text-[2.75rem]">{t('home.greeting', { who: address(narrator.display_name) })}</h1>
        <p className="max-w-2xl text-[1.25rem] leading-relaxed text-ink-soft">{t('home.intro', { pronoun: t('home.pronoun') })}</p>
      </header>

      <section aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="sr-only">
          {t('home.topicsLabel')}
        </h2>
        {topics.status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label={t('gate.loading')}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[8.5rem] rounded-[1.75rem]" />
            ))}
          </div>
        )}
        {topics.status === 'error' && (
          <EmptyState
            icon={<CircleAlert />}
            title={t('gate.errorTitle')}
            description={t('gate.errorDesc')}
            action={
              <Button size="lg" onClick={topics.reload}>
                {t('gate.retry')}
              </Button>
            }
          />
        )}
        {topics.status === 'ready' && topics.data.length === 0 && (
          <EmptyState
            title={t('home.noTopicsTitle')}
            description={t('home.noTopicsDesc')}
            action={
              <Button size="lg" onClick={topics.reload}>
                {t('home.reload')}
              </Button>
            }
          />
        )}
        {topics.status === 'ready' && topics.data.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {topics.data.filter((tp) => tp.slug !== EASY_SLUG).slice(0, 6).map((topic) => (
              <li key={topic.id} className="min-w-0">
                <Link to={`/ke-chuyen/chu-de/${topic.slug}${query}`} className={cardClass}>
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-mint text-heritage">
                    <TopicIcon slug={topic.slug} className="size-8" />
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0 font-serif text-[1.6rem] font-semibold leading-snug text-ink [overflow-wrap:break-word] hyphens-auto">{pick({ vi: topic.title_vi, en: topic.title_en })}</span>
                    <ArrowRight className="size-6 shrink-0 text-heritage transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
            <li className="min-w-0 sm:col-span-2">
              <Link to={`/ke-chuyen/chu-de/${EASY_SLUG}${query}`} className={`${cardClass} @container bg-mint/60 sm:flex-row sm:items-center`}>
                <span className="flex min-w-0 flex-col items-start gap-4 @[16rem]:flex-row @[16rem]:items-center">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-paper text-terracotta">
                    <Lightbulb className="size-8" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-serif text-[1.6rem] font-semibold leading-snug text-ink [overflow-wrap:break-word] hyphens-auto">{t('home.unsureTitle')}</span>
                    <span className="text-[1.25rem] text-ink-soft [overflow-wrap:break-word] hyphens-auto">{t('home.unsureHint')}</span>
                  </span>
                </span>
                <ArrowRight className="hidden size-6 shrink-0 text-heritage sm:block" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        )}
      </section>

      <Link
        to={`/ke-chuyen/cua-toi${query}`}
        className="flex min-h-16 items-center gap-4 rounded-2xl px-2 text-heritage-deep underline-offset-4 hover:underline"
      >
        <BookOpen className="size-7 shrink-0" aria-hidden="true" />
        <span className="flex min-w-0 flex-col">
          <span className="text-[1.3rem] font-semibold">{t('home.myStories')}</span>
          <span className="text-[1.25rem] text-ink-soft">{t('home.myStoriesHint')}</span>
        </span>
      </Link>
    </div>
  );
}
