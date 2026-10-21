import { ArrowLeft, BookOpen, CircleAlert, CircleCheck, Clock } from 'lucide-react';
import { Badge, Button, ButtonLink, EmptyState, Skeleton } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { AssistedBanner, ELDER_CONTROLS, StorytellerGate } from '@/features/storytelling/components';
import { fetchMyStories, useAsync, useStoryteller, type MyStory } from '@/features/storytelling/data';
import { elderButton, elderEmpty, useNarratorTitle } from './elder';

export default function MyStoriesPage() {
  const t = useT('narrator');
  const ctx = useStoryteller();
  useNarratorTitle(t('titles.mine'));
  if (ctx.status !== 'ready') return <StorytellerGate ctx={ctx} />;
  return (
    <div className={`flex flex-col gap-8 ${ELDER_CONTROLS}`}>
      {ctx.assisted && <AssistedBanner name={ctx.narrator.display_name} />}
      <ButtonLink to={`/ke-chuyen${ctx.query}`} variant="ghost" size="lg" className="-ml-3 self-start px-3! text-[1.17rem]" leftIcon={<ArrowLeft className="size-5" aria-hidden="true" />}>
        {t('mine.back')}
      </ButtonLink>
      <header>
        <h1 className="font-serif text-[clamp(2.25rem,7vw,3rem)] font-semibold leading-[1.2] text-ink">{t('mine.title')}</h1>
        <p className="mt-3 max-w-[40ch] text-[1.3rem] leading-relaxed text-ink-soft">{t('mine.intro', { pronoun: t('home.pronoun') })}</p>
      </header>
      <StoryList narratorId={ctx.narrator.id} query={ctx.query} />
    </div>
  );
}

function StoryList({ narratorId, query }: { narratorId: string; query: string }) {
  const t = useT('narrator');
  const { locale } = useLocale();
  const sb = getSupabase();
  const stories = useAsync(async () => (sb ? fetchMyStories(sb, narratorId) : []), [sb, narratorId]);

  if (stories.status === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label={t('mine.loading')}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-[1.75rem]" />
        ))}
      </div>
    );
  }
  if (stories.status === 'error') {
    return (
      <EmptyState
        className={elderEmpty}
        icon={<CircleAlert />}
        title={t('gate.errorTitle')}
        description={t('gate.errorDesc')}
        action={
          <Button size="lg" className={elderButton} onClick={stories.reload}>
            {t('gate.retry')}
          </Button>
        }
      />
    );
  }
  if (stories.data.length === 0) {
    return (
      <EmptyState
        className={elderEmpty}
        icon={<BookOpen />}
        title={t('mine.emptyTitle')}
        description={t('mine.emptyDesc')}
        action={
          <ButtonLink to={`/ke-chuyen${query}`} size="lg" className={elderButton}>
            {t('mine.emptyAction')}
          </ButtonLink>
        }
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {stories.data.map((s: MyStory) => {
        const approved = s.edit_status === 'approved';
        return (
          <li key={s.id} className="flex flex-col gap-5 rounded-[1.75rem] bg-paper p-6 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between md:p-7">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="text-[1.17rem]!" tone={approved ? 'mint' : 'warning'} icon={approved ? <CircleCheck className="size-4" aria-hidden="true" /> : <Clock className="size-4" aria-hidden="true" />}>
                  {approved ? t('mine.status.approved') : t('mine.status.pending')}
                </Badge>
                <Badge className="text-[1.17rem]!" tone="outline">{t(`mine.kind.${s.kind}`)}</Badge>
              </div>
              <h2 className="break-words font-serif text-[1.45rem] font-semibold leading-snug text-ink">{s.title.trim() || t('mine.untitled')}</h2>
              <p className="text-[1.17rem] text-ink-soft">{t('mine.recordedOn', { date: formatDate(s.created_at, locale) })}</p>
            </div>
            <ButtonLink to={`/ban-nhap/${s.id}`} size="lg" variant={approved ? 'secondary' : 'primary'} className="shrink-0 text-[1.17rem]">
              {approved ? t('mine.openApproved') : t('mine.open')}
            </ButtonLink>
          </li>
        );
      })}
    </ul>
  );
}
