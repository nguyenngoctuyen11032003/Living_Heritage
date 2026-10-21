import { ArrowRight, AudioLines, BookCheck, BookOpen, FolderHeart, Hourglass, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { StoryScene } from '@/components/illustrations/scenes';
import { Button, ButtonLink, EmptyState, Field, Input, Select, Skeleton } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { usePick, useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { PAGE_SIZE, fetchRecordings, fetchReviewQueue, fetchStats, fetchStoriesPage, searchStories, type VaultStats } from './api';
import { GridSkeleton, LoadError } from './components/States';
import { NewStoryButton } from './components/NewStoryButton';
import { StoryCard } from './components/StoryCard';
import { FamilyGate, StoryStatusBadge } from './external';
import { EMPTY_FILTERS, filtersFromParams, filtersToParams, hasActiveFilters, splitHours, type VaultFilters } from './filter';
import type { VaultStory } from './types';
import { useVaultLookups } from './useLookups';
import { usePageTitle } from '@/lib/usePageTitle';

export function VaultHome() {
  const t = useT('vault');
  usePageTitle(t('header.eyebrow'));
  return (
    <FamilyGate>
      <VaultHomeInner />
    </FamilyGate>
  );
}

function VaultHomeInner() {
  const t = useT('vault');
  const { current, canEdit } = useCurrentFamily();
  const familyId = current!.id;
  const lookups = useVaultLookups(familyId);
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const filterKey = filtersToParams(filters).toString();

  // ---- stats + review queue
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [review, setReview] = useState<{ items: VaultStory[]; total: number } | null>(null);
  const [statsTick, setStatsTick] = useState(0);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    setStatsError(false);
    Promise.all([fetchStats(sb, familyId), fetchReviewQueue(sb, familyId)])
      .then(([s, r]) => {
        if (!alive) return;
        setStats(s);
        setReview(r);
      })
      .catch(() => alive && setStatsError(true));
    return () => {
      alive = false;
    };
  }, [familyId, statsTick]);

  // ---- story list
  const [items, setItems] = useState<VaultStory[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [listTick, setListTick] = useState(0);
  const searching = filters.q.trim().length > 0;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    setLoading(true);
    setError(false);
    setVisible(PAGE_SIZE);
    const f = filtersFromParams(new URLSearchParams(filterKey));
    const run = f.q.trim() ? searchStories(sb, familyId, f) : fetchStoriesPage(sb, familyId, f, 0);
    run
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        setHasMore(f.q.trim() ? rows.length > PAGE_SIZE : rows.length === PAGE_SIZE);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [familyId, filterKey, listTick]);

  const shown = searching ? items.slice(0, visible) : items;

  async function loadMore() {
    if (searching) {
      const next = visible + PAGE_SIZE;
      setVisible(next);
      setHasMore(items.length > next);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setLoadingMore(true);
    try {
      const rows = await fetchStoriesPage(sb, familyId, filters, items.length);
      setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  // ---- recording durations for visible cards
  const [durations, setDurations] = useState<Map<string, number | null>>(new Map());
  const recordingIds = shown.map((s) => s.recording_id).filter((id): id is string => !!id && !durations.has(id));
  const recordingKey = recordingIds.join(',');
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !recordingKey) return;
    let alive = true;
    fetchRecordings(sb, recordingKey.split(','))
      .then((rows) => {
        if (!alive) return;
        setDurations((prev) => {
          const next = new Map(prev);
          for (const r of rows) next.set(r.id, r.duration_s === null ? null : Number(r.duration_s));
          for (const id of recordingKey.split(',')) if (!next.has(id)) next.set(id, null);
          return next;
        });
      })
      .catch(() => {
        /* durations are optional decoration */
      });
    return () => {
      alive = false;
    };
  }, [recordingKey]);

  const update = useCallback(
    (patch: Partial<VaultFilters>) => {
      setParams(filtersToParams({ ...filters, ...patch }), { replace: true });
    },
    [filters, setParams],
  );

  const vaultEmpty = !loading && !error && items.length === 0 && !hasActiveFilters(filters);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 md:gap-10">
      <header className="relative overflow-hidden rounded-[2rem] bg-paper px-5 py-7 ring-1 ring-line/80 sm:px-8 md:px-10 md:py-10">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-mint/70 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-terracotta/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[0.875rem] font-semibold uppercase tracking-[0.14em] text-terracotta">{t('header.eyebrow')}</p>
            <h1 className="mt-2 break-words font-serif text-[clamp(2rem,1.45rem+2.2vw,2.75rem)] font-semibold leading-[1.2] text-heritage-deep">
              {current?.name || t('header.fallbackName')}
            </h1>
            <p className="mt-3 max-w-[60ch] leading-relaxed text-ink-soft">{t('header.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canEdit && !lookups.loading && <NewStoryButton narrators={lookups.narrators} />}
            <ButtonLink to="/gia-dinh/bo-suu-tap" variant="secondary" leftIcon={<FolderHeart className="size-5" aria-hidden="true" />}>
              {t('header.collections')}
            </ButtonLink>
            <ButtonLink to="/sach" variant="secondary" leftIcon={<BookOpen className="size-5" aria-hidden="true" />}>
              {t('header.books')}
            </ButtonLink>
          </div>
        </div>
      </header>

      <StatsRow stats={stats} error={statsError} onRetry={() => setStatsTick((x) => x + 1)} />

      {canEdit && review && review.items.length > 0 && <ReviewRow review={review} narratorName={(id) => lookups.narratorById.get(id)?.display_name} />}

      {vaultEmpty ? (
        <VaultEmpty
          description={canEdit ? t('empty.description') : t('empty.viewer')}
          action={canEdit && !lookups.loading ? <NewStoryButton narrators={lookups.narrators} label={t('empty.start')} /> : undefined}
        />
      ) : (
        <section aria-labelledby="vault-results" className="flex flex-col gap-6">
          <FilterBar
            filters={filters}
            onChange={update}
            narrators={lookups.narrators}
            topics={lookups.topics}
            onReset={() => setParams(filtersToParams({ ...EMPTY_FILTERS, q: filters.q }), { replace: true })}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="vault-results" className="font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.6rem)] font-semibold leading-[1.25] text-heritage-deep">
              {t('results.heading')}
            </h2>
            <p className="text-[0.9rem] text-ink-soft" role="status" aria-live="polite">
              {loading
                ? t('state.loading')
                : searching
                  ? items.length === 1
                    ? t('results.countSearchOne')
                    : t('results.countSearch', { n: items.length })
                  : hasMore
                    ? ''
                    : items.length === 1
                      ? t('results.countOne')
                      : t('results.count', { n: items.length })}
            </p>
          </div>

          {error ? (
            <LoadError onRetry={() => setListTick((x) => x + 1)} />
          ) : loading ? (
            <div aria-busy="true">
              <GridSkeleton />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Search aria-hidden="true" />}
              title={t('noResults.title')}
              description={t('noResults.description')}
              action={
                filters.narratorId || filters.topicId || filters.status || filters.kind ? (
                  <Button variant="secondary" onClick={() => setParams(filtersToParams({ ...EMPTY_FILTERS, q: filters.q }), { replace: true })}>
                    {t('noResults.reset')}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => update({ q: '' })}>
                    {t('search.clear')}
                  </Button>
                )
              }
            />
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((s) => (
                  <li key={s.id} className="flex">
                    <StoryCard
                      story={s}
                      narrator={lookups.narratorById.get(s.narrator_id)}
                      topic={s.topic_id ? lookups.topicById.get(s.topic_id) : undefined}
                      durationS={s.recording_id ? durations.get(s.recording_id) : null}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex justify-center">
                {hasMore ? (
                  <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                    {t('results.more')}
                  </Button>
                ) : (
                  items.length > PAGE_SIZE && <p className="text-[0.9rem] text-ink-soft">{t('results.end')}</p>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

/** First-run vault: an editorial "first page" with an illustration instead of a bare dashed box. */
function VaultEmpty({ description, action }: { description: string; action?: ReactNode }) {
  const t = useT('vault');
  return (
    <section aria-labelledby="vault-empty" className="grid overflow-hidden rounded-[2rem] bg-paper ring-1 ring-line/80 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="flex flex-col items-start gap-4 p-6 sm:p-8 md:p-10">
        <p className="font-hand text-[1.6rem] font-semibold leading-[1.3] text-terracotta">{t('empty.eyebrow')}</p>
        <h2 id="vault-empty" className="font-serif text-[clamp(1.5rem,1.25rem+1.1vw,2rem)] font-semibold leading-[1.25] text-heritage-deep">
          {t('empty.title')}
        </h2>
        <p className="max-w-[56ch] leading-relaxed text-ink-soft">{description}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
      <div aria-hidden="true" className="relative order-first h-44 bg-mint sm:h-56 md:order-none md:h-auto md:min-h-72">
        <StoryScene kind="porch" />
      </div>
    </section>
  );
}

function StatsRow({ stats, error, onRetry }: { stats: VaultStats | null; error: boolean; onRetry: () => void }) {
  const t = useT('vault');
  if (error) return <LoadError onRetry={onRetry} />;
  const audio = stats ? splitHours(stats.audioSeconds) : null;
  const cells = [
    { label: t('stats.approved'), icon: BookCheck, value: stats ? String(stats.approved) : null },
    { label: t('stats.pending'), icon: Hourglass, value: stats ? String(stats.pending) : null },
    {
      label: t('stats.audio'),
      icon: AudioLines,
      value: audio ? (audio.hours > 0 ? t('stats.hours', { h: audio.hours, m: audio.minutes }) : t('stats.minutes', { m: audio.minutes })) : null,
    },
  ];
  return (
    <section aria-label={t('stats.label')}>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cells.map(({ label, icon: Icon, value }) => (
          <div key={label} className="flex flex-col-reverse gap-2 rounded-3xl bg-paper px-5 py-4 ring-1 ring-line/80">
            <dt className="flex items-center gap-2 text-[0.9rem] leading-snug text-ink-soft">
              <Icon className="size-4 shrink-0 text-heritage" aria-hidden="true" />
              {label}
            </dt>
            <dd className="font-serif text-[clamp(1.6rem,1.4rem+0.8vw,2rem)] font-semibold leading-[1.2] text-heritage-deep tabular-nums">
              {value ?? <Skeleton className="h-8 w-20" />}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ReviewRow({ review, narratorName }: { review: { items: VaultStory[]; total: number }; narratorName: (id: string) => string | undefined }) {
  const t = useT('vault');
  return (
    <section aria-labelledby="vault-review" className="rounded-[1.75rem] bg-mint/50 p-5 ring-1 ring-heritage/10 md:p-6">
      <h2 id="vault-review" className="font-serif text-[1.3rem] font-semibold leading-[1.25] text-heritage-deep">
        {t('review.title')}
      </h2>
      <p className="mt-1 text-ink-soft">{t('review.description')}</p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {review.items.map((s) => (
          <li key={s.id}>
            <Link
              to={`/ban-nhap/${s.id}`}
              className="flex h-full flex-col gap-2 rounded-2xl bg-paper p-4 ring-1 ring-line transition-shadow hover:ring-heritage/50 focus-visible:ring-2 focus-visible:ring-heritage"
            >
              <span className="font-serif text-[1.05rem] font-semibold leading-snug text-ink">{s.title.trim() || t('card.untitled')}</span>
              <span className="text-[0.9rem] text-ink-soft">{narratorName(s.narrator_id) ?? t('card.unknownNarrator')}</span>
              <StoryStatusBadge size="sm" editStatus={s.edit_status} visibility={s.visibility} />
              <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[0.9rem] font-semibold text-heritage">
                {t('review.open')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {review.total > review.items.length && <p className="mt-3 text-[0.9rem] text-ink-soft">{t('review.more', { n: review.total - review.items.length })}</p>}
    </section>
  );
}

function FilterBar({
  filters,
  onChange,
  onReset,
  narrators,
  topics,
}: {
  filters: VaultFilters;
  onChange: (patch: Partial<VaultFilters>) => void;
  onReset: () => void;
  narrators: { id: string; display_name: string }[];
  topics: { id: string; title_vi: string; title_en: string }[];
}) {
  const t = useT('vault');
  const pick = usePick();
  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onChange({ q });
  }
  const anyFilter = Boolean(filters.narratorId || filters.topicId || filters.status || filters.kind);

  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] bg-paper p-4 ring-1 ring-line/80 md:p-5">
      <form role="search" onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label={t('search.label')} className="flex-1">
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} className="min-h-12" />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" leftIcon={<Search className="size-5" aria-hidden="true" />}>
            {t('search.submit')}
          </Button>
          {filters.q && (
            <Button variant="ghost" iconOnly aria-label={t('search.clear')} onClick={() => onChange({ q: '' })}>
              <X className="size-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>
      <fieldset className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">{t('filters.title')}</legend>
        <Field label={t('filters.narrator')}>
          <Select value={filters.narratorId} onChange={(e) => onChange({ narratorId: e.target.value })} className="min-h-12">
            <option value="">{t('filters.all')}</option>
            {narrators.map((n) => (
              <option key={n.id} value={n.id}>
                {n.display_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('filters.topic')}>
          <Select value={filters.topicId} onChange={(e) => onChange({ topicId: e.target.value })} className="min-h-12">
            <option value="">{t('filters.all')}</option>
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {pick({ vi: tp.title_vi, en: tp.title_en })}
              </option>
            ))}
            <option value="none">{t('filters.noTopic')}</option>
          </Select>
        </Field>
        <Field label={t('filters.status')}>
          <Select value={filters.status} onChange={(e) => onChange({ status: e.target.value as VaultFilters['status'] })} className="min-h-12">
            <option value="">{t('filters.all')}</option>
            <option value="approved">{t('status.approved')}</option>
            <option value="pending_review">{t('status.pending_review')}</option>
            <option value="draft">{t('status.draft')}</option>
          </Select>
        </Field>
        <Field label={t('filters.kind')}>
          <Select value={filters.kind} onChange={(e) => onChange({ kind: e.target.value as VaultFilters['kind'] })} className="min-h-12">
            <option value="">{t('filters.all')}</option>
            <option value="story">{t('kind.story')}</option>
            <option value="experience">{t('kind.experience')}</option>
          </Select>
        </Field>
      </fieldset>
      {anyFilter && (
        <div>
          <Button variant="ghost" onClick={onReset} leftIcon={<X className="size-5" aria-hidden="true" />}>
            {t('filters.reset')}
          </Button>
        </div>
      )}
    </div>
  );
}
