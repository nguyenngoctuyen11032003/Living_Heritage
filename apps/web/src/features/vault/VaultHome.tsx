import { BookOpen, ChevronDown, FolderHeart, PenLine, Search, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, ButtonLink, EmptyState, Field, Input, Select, Skeleton } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { PAGE_SIZE, fetchRecordings, fetchReviewQueue, fetchStats, fetchStoriesPage, searchStories, type VaultStats } from './api';
import { GridSkeleton, LoadError } from './components/States';
import { NewStoryButton } from './components/NewStoryButton';
import { VaultPageHeader } from './components/VaultPageHeader';
import { StoryCard } from './components/StoryCard';
import { FamilyGate, StoryStatusBadge } from './external';
import { EMPTY_FILTERS, filtersFromParams, filtersToParams, hasActiveFilters, splitHours, topicNames, type VaultFilters } from './filter';
import type { VaultStory } from './types';
import { useVaultLookups } from './useLookups';

export function VaultHome() {
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
  // Search also matches topic names; re-run once the topics have loaded.
  const searchTopics = useMemo(() => (searching ? topicNames(lookups.topics) : null), [searching, lookups.topics]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    setLoading(true);
    setError(false);
    setVisible(PAGE_SIZE);
    const f = filtersFromParams(new URLSearchParams(filterKey));
    const run = f.q.trim() ? searchStories(sb, familyId, f, searchTopics ?? undefined) : fetchStoriesPage(sb, familyId, f, 0);
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
  }, [familyId, filterKey, listTick, searchTopics]);

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

  // ---- recording facts (duration, recorded date) for visible cards
  const [durations, setDurations] = useState<Map<string, { durationS: number | null; recordedAt: string } | null>>(new Map());
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
          for (const r of rows) next.set(r.id, { durationS: r.duration_s === null ? null : Number(r.duration_s), recordedAt: r.created_at });
          for (const id of recordingKey.split(',')) if (!next.has(id)) next.set(id, null);
          return next;
        });
      })
      .catch(() => {
        /* recording facts are optional decoration; the card falls back to the story date */
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8">
      <VaultPageHeader
        eyebrow={t('header.eyebrow')}
        title={current?.name || t('header.fallbackName')}
        actions={
          // Phones: the primary action full width, the two secondary ones side by side under it.
          <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center lg:justify-end">
            {canEdit && !lookups.loading && (
              <div className="col-span-2 md:contents">
                <NewStoryButton narrators={lookups.narrators} className="w-full md:w-auto" />
              </div>
            )}
            <ButtonLink to="/gia-dinh/bo-suu-tap" variant="secondary" className="min-w-0 text-center max-sm:gap-1.5 max-sm:px-3" leftIcon={<FolderHeart className="size-5 shrink-0" />}>
              {t('header.collections')}
            </ButtonLink>
            <ButtonLink to="/sach" variant="secondary" className="min-w-0 text-center max-sm:gap-1.5 max-sm:px-3" leftIcon={<BookOpen className="size-5 shrink-0" />}>
              {t('header.books')}
            </ButtonLink>
          </div>
        }
      />

      <StatsRow stats={stats} error={statsError} onRetry={() => setStatsTick((x) => x + 1)} />

      {canEdit && review && review.items.length > 0 && <ReviewRow review={review} narratorName={(id) => lookups.narratorById.get(id)?.display_name} />}

      {vaultEmpty ? (
        <EmptyState
          icon={<PenLine />}
          title={t('empty.title')}
          description={canEdit ? t('empty.description') : t('empty.viewer')}
          action={canEdit && !lookups.loading ? <NewStoryButton narrators={lookups.narrators} label={t('empty.start')} size="md" /> : undefined}
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
            <h2 id="vault-results" className="font-serif text-[1.4rem] font-semibold text-heritage-deep">
              {t('results.heading')}
            </h2>
            <p className="shrink-0 whitespace-nowrap text-[0.9rem] text-ink-soft" role="status" aria-live="polite">
              {loading ? t('state.loading') : searching ? t('results.countSearch', { n: items.length }) : hasMore ? '' : t('results.count', { n: items.length })}
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
              icon={<Search />}
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
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((s) => (
                  <li key={s.id} className="flex min-w-0">
                    <StoryCard
                      story={s}
                      narrator={lookups.narratorById.get(s.narrator_id)}
                      topic={s.topic_id ? lookups.topicById.get(s.topic_id) : undefined}
                      durationS={s.recording_id ? durations.get(s.recording_id)?.durationS : null}
                      recordedAt={s.recording_id ? durations.get(s.recording_id)?.recordedAt : undefined}
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

function StatsRow({ stats, error, onRetry }: { stats: VaultStats | null; error: boolean; onRetry: () => void }) {
  const t = useT('vault');
  if (error) return <LoadError onRetry={onRetry} />;
  const audio = stats ? splitHours(stats.audioSeconds) : null;
  const cells = [
    { key: 'approved', label: t('stats.approved'), short: t('stats.short.approved'), value: stats ? String(stats.approved) : null },
    { key: 'pending', label: t('stats.pending'), short: t('stats.short.pending'), value: stats ? String(stats.pending) : null },
    {
      key: 'audio',
      label: t('stats.audio'),
      short: t('stats.short.audio'),
      value: audio ? <DurationValue hours={audio.hours} minutes={audio.minutes} /> : null,
    },
  ];
  // One compact strip of three cells at every width (phones keep the story list close to the top).
  return (
    <section aria-label={t('stats.label')}>
      <dl className="grid grid-cols-3 divide-x divide-line/80 overflow-hidden rounded-3xl bg-paper ring-1 ring-line/80">
        {cells.map((c) => (
          <div key={c.key} className="flex min-w-0 flex-col-reverse justify-end gap-1 px-3 py-3 sm:px-5 sm:py-4">
            <dt className="text-[0.8rem] leading-snug text-ink-soft sm:text-[0.9rem]">
              <span className="sm:hidden">{c.short}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </dt>
            <dd className="break-words font-serif text-[1.3rem] font-semibold leading-tight text-heritage-deep sm:text-[1.8rem] sm:leading-none">
              {c.value ?? <Skeleton className="h-7 w-14 sm:h-8 sm:w-20" />}
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
    <section aria-labelledby="vault-review" className="rounded-[1.75rem] bg-mint/50 p-4 ring-1 ring-heritage/10 md:p-6">
      <h2 id="vault-review" className="font-serif text-[1.2rem] font-semibold text-heritage-deep md:text-[1.3rem]">
        {t('review.title')}
      </h2>
      <p className="mt-1 text-[0.95rem] text-ink-soft">{t('review.description')}</p>
      <ul className="mt-3 grid gap-2 md:mt-4 md:grid-cols-2 md:gap-3 lg:grid-cols-3">
        {review.items.map((s) => (
          <li key={s.id}>
            {/* Phones: one compact row per draft; md+: a small card with the status. */}
            <Link
              to={`/ban-nhap/${s.id}`}
              className="flex h-full items-center gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line transition-shadow hover:ring-heritage/50 focus-visible:ring-2 focus-visible:ring-heritage md:flex-col md:items-stretch md:gap-2 md:p-4"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-2">
                <span className="font-serif text-[1.05rem] font-semibold leading-snug text-ink">{s.title.trim() || t('card.untitled')}</span>
                <span className="text-[0.85rem] text-ink-soft">{narratorName(s.narrator_id) ?? t('card.unknownNarrator')}</span>
              </span>
              <span className="hidden md:block">
                <StoryStatusBadge size="sm" editStatus={s.edit_status} visibility={s.visibility} />
              </span>
              <span className="shrink-0 text-[0.85rem] font-semibold text-heritage md:mt-auto">
                <span className="sr-only md:not-sr-only">{t('review.open')} </span>
                <span aria-hidden="true">→</span>
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
  const activeCount = [filters.narratorId, filters.topicId, filters.status, filters.kind].filter(Boolean).length;
  const anyFilter = activeCount > 0;
  const [filtersOpen, setFiltersOpen] = useState(anyFilter);
  const filtersId = useId();

  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] bg-paper p-4 ring-1 ring-line/80 md:p-5">
      <form role="search" onSubmit={submit} className="flex items-end gap-2">
        <Field label={t('search.label')} className="min-w-0 flex-1">
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} className="min-h-12" />
        </Field>
        <div className="flex shrink-0 gap-2">
          <Button type="submit" leftIcon={<Search className="size-4" />}>
            <span className="sr-only sm:not-sr-only">{t('search.submit')}</span>
          </Button>
          {filters.q && (
            <Button variant="ghost" iconOnly aria-label={t('search.clear')} onClick={() => onChange({ q: '' })}>
              <X className="size-5" />
            </Button>
          )}
        </div>
      </form>
      {/* Phones: the four filters fold behind one toggle so the story list starts within the first screen. */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          onClick={() => setFiltersOpen((x) => !x)}
          leftIcon={<SlidersHorizontal className="size-4" />}
          rightIcon={<ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', filtersOpen && 'rotate-180')} aria-hidden="true" />}
          className="-ml-2"
        >
          {activeCount > 0 ? t('filters.toggleActive', { n: activeCount }) : t('filters.toggle')}
        </Button>
      </div>
      <fieldset id={filtersId} className={cn('grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid lg:grid-cols-4', filtersOpen ? 'grid' : 'hidden')}>
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
          <Button variant="ghost" onClick={onReset} leftIcon={<X className="size-4" />}>
            {t('filters.reset')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * "1 giờ 5 phút" as big numbers with small units: each number+unit pair never breaks, so on a 360px phone the
 * value wraps between pairs instead of leaving the unit alone on a line. Screen readers get the plain sentence.
 */
function DurationValue({ hours, minutes }: { hours: number; minutes: number }) {
  const t = useT('vault');
  const pairs: Array<[number, string]> = hours > 0 ? [[hours, t('stats.unit.h')], [minutes, t('stats.unit.m')]] : [[minutes, t('stats.unit.m')]];
  return (
    <>
      <span className="sr-only">{hours > 0 ? t('stats.hours', { h: hours, m: minutes }) : t('stats.minutes', { m: minutes })}</span>
      <span aria-hidden="true" className="inline-flex flex-wrap items-baseline gap-x-1.5">
        {pairs.map(([n, unit]) => (
          <span key={unit} className="whitespace-nowrap">
            {n}
            <span className="ml-0.5 font-sans text-[0.8rem] font-medium text-ink-soft sm:text-[0.95rem]">{unit}</span>
          </span>
        ))}
      </span>
    </>
  );
}
