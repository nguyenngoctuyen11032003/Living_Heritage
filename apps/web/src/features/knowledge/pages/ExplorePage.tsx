import { Bookmark, RotateCcw, Search, SearchX, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Reveal } from '@/components/motion';
import { Button, EmptyState, Field, Select } from '@/components/ui';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { REGIONS, STORY_KINDS, type Region, type StoryKind } from '@lh/shared';
import { KnowledgeCard, KnowledgeCardSkeleton } from '../components/KnowledgeCard';
import { SampleBanner } from '../components/SampleBanner';
import { TopicMotif } from '../components/TopicMotif';
import { activeFilterCount, DECADES, EMPTY_FILTERS, filtersFromParams, filtersToParams, type KnowledgeFilters } from '../filters';
import { useSavedList } from '../saved';
import { findTopic, topicStyle, useTopics } from '../topics';
import { useKnowledgeSearch } from '../useKnowledgeSearch';

const DEBOUNCE_MS = 300;

export default function ExplorePage() {
  const t = useT('knowledge');
  const pick = usePick();
  const topics = useTopics();
  const saved = useSavedList();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const [qInput, setQInput] = useState(filters.q);
  const lastUrlQ = useRef(filters.q);
  const searchId = useId();
  const resultsRef = useRef<HTMLElement>(null);

  const update = useCallback(
    (patch: Partial<KnowledgeFilters>, replace = false) => {
      setParams((prev) => filtersToParams({ ...filtersFromParams(prev), ...patch }), { replace, preventScrollReset: true });
    },
    [setParams],
  );

  // Typing → URL (debounced 300 ms).
  useEffect(() => {
    if (qInput.trim() === filters.q.trim()) return;
    const timer = window.setTimeout(() => update({ q: qInput }, true), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [qInput, filters.q, update]);

  // URL → input (back/forward, links like /kham-pha?q=…).
  useEffect(() => {
    if (filters.q === lastUrlQ.current) return;
    lastUrlQ.current = filters.q;
    setQInput((cur) => (cur.trim() === filters.q.trim() ? cur : filters.q));
  }, [filters.q]);

  const search = useKnowledgeSearch(filters);
  const active = activeFilterCount(filters);
  const narrowing = active > 0;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    update({ q: qInput });
    resultsRef.current?.focus({ preventScroll: false });
  }

  function reset() {
    setQInput('');
    setParams(filtersToParams(EMPTY_FILTERS), { preventScrollReset: true });
  }

  const chips = useMemo(() => {
    const list: { key: keyof KnowledgeFilters; label: string }[] = [];
    if (filters.q.trim()) list.push({ key: 'q', label: t('filters.queryChip', { q: filters.q.trim() }) });
    if (filters.topic) {
      const topic = findTopic(topics, filters.topic);
      list.push({ key: 'topic', label: topic ? pick(topic.title) : filters.topic });
    }
    if (filters.kind) list.push({ key: 'kind', label: t(`kinds.${filters.kind}`) });
    if (filters.region) list.push({ key: 'region', label: t(`regions.${filters.region}`) });
    if (filters.decade) list.push({ key: 'decade', label: t('filters.decadeValue', { decade: filters.decade }) });
    return list;
  }, [filters, topics, pick, t]);

  function removeChip(key: keyof KnowledgeFilters) {
    if (key === 'q') setQInput('');
    update(key === 'q' ? { q: '' } : { [key]: null });
  }

  const showFeatured = !narrowing && search.items.length > 3;
  const countText = search.hasMore ? t('results.countMore', { n: search.items.length }) : t('results.count', { n: search.items.length });

  return (
    <div className="bg-cream">
      {/* Editorial hero */}
      <section aria-labelledby="hub-title" className="relative overflow-hidden border-b border-line/80">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-10 hidden h-[420px] w-[620px] text-heritage/10 lg:block">
          <TopicMotif slug="que-huong" className="h-full w-full" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-12 md:px-8 md:pb-16 md:pt-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.2em] text-terracotta">{t('hero.kicker')}</p>
            <Link
              to="/da-luu"
              className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-[0.9rem] font-semibold text-heritage ring-1 ring-line transition-colors hover:bg-mint/60"
            >
              <Bookmark aria-hidden="true" className="size-4" />
              {t('hero.savedLink', { n: saved.length })}
            </Link>
          </div>
          <Reveal>
            <h1 id="hub-title" className="mt-5 max-w-4xl font-serif text-[2.3rem] font-semibold leading-[1.12] tracking-[-0.01em] text-heritage-deep sm:text-[3rem] md:text-[4rem]">
              {t('hero.title')}
            </h1>
          </Reveal>
          <p className="mt-5 max-w-2xl text-[1.08rem] leading-relaxed text-ink-soft">{t('hero.lede')}</p>

          <form role="search" onSubmit={onSubmit} className="mt-8 max-w-3xl">
            <label htmlFor={searchId} className="sr-only">
              {t('hero.searchLabel')}
            </label>
            <div className="relative flex items-center rounded-full bg-paper shadow-[0_18px_40px_-28px_rgba(22,58,49,0.5)] ring-1 ring-line focus-within:ring-2 focus-within:ring-heritage">
              <Search aria-hidden="true" className="pointer-events-none absolute left-5 size-6 text-ink-soft" />
              <input
                id={searchId}
                type="search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder={t('hero.searchPlaceholder')}
                autoComplete="off"
                enterKeyHint="search"
                maxLength={120}
                className="min-h-16 w-full min-w-0 flex-1 rounded-full bg-transparent pl-14 pr-3 text-[1.08rem] text-ink placeholder:text-ink-soft/75 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {qInput && (
                <button
                  type="button"
                  onClick={() => {
                    setQInput('');
                    update({ q: '' }, true);
                  }}
                  aria-label={t('hero.clear')}
                  className="mr-1 inline-flex size-12 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-mint/60 hover:text-heritage"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              )}
              <Button type="submit" size="lg" className="mr-1.5 hidden shrink-0 sm:inline-flex">
                {t('hero.searchCta')}
              </Button>
            </div>
          </form>

          <div className="mt-7">
            <p id="popular-topics" className="text-[0.85rem] font-semibold text-ink-soft">
              {t('hero.popular')}
            </p>
            <ul aria-labelledby="popular-topics" className="mt-3 flex flex-wrap gap-2.5">
              {topics.map((topic) => {
                const on = filters.topic === topic.slug;
                const style = topicStyle(topic.slug);
                return (
                  <li key={topic.slug}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ topic: on ? null : topic.slug })}
                      className={cn(
                        'inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-[0.92rem] font-semibold transition-[background-color,box-shadow] duration-150',
                        on ? 'bg-heritage text-cream' : 'bg-paper text-ink ring-1 ring-line hover:ring-heritage/50',
                      )}
                    >
                      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: on ? '#faf7f0' : style.ink }} />
                      {pick(topic.title)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-6 text-[0.85rem] text-ink-soft">{t('hero.promise')}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
        {/* Filters */}
        <section aria-labelledby="filters-title" className="rounded-[1.75rem] bg-paper p-5 ring-1 ring-line md:p-6">
          <h2 id="filters-title" className="sr-only">
            {t('filters.title')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.4fr_1fr_1fr]">
            <Field label={t('filters.topic')}>
              <Select value={filters.topic ?? ''} onChange={(e) => update({ topic: e.target.value || null })}>
                <option value="">{t('filters.allTopics')}</option>
                {topics.map((topic) => (
                  <option key={topic.slug} value={topic.slug}>
                    {pick(topic.title)}
                  </option>
                ))}
              </Select>
            </Field>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[0.9rem] font-semibold text-ink">{t('filters.kind')}</legend>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-cream p-1 ring-1 ring-line">
                {[null, ...STORY_KINDS].map((k) => {
                  const on = filters.kind === k;
                  return (
                    <button
                      key={k ?? 'all'}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ kind: k as StoryKind | null })}
                      className={cn(
                        'min-h-11 rounded-xl px-2 text-[0.84rem] font-semibold leading-tight transition-colors',
                        on ? 'bg-heritage text-cream shadow-sm' : 'text-ink-soft hover:bg-mint/60 hover:text-heritage',
                      )}
                    >
                      {k ? t(`kinds.${k}`) : t('filters.allKinds')}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Field label={t('filters.region')}>
              <Select value={filters.region ?? ''} onChange={(e) => update({ region: (e.target.value || null) as Region | null })}>
                <option value="">{t('filters.allRegions')}</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`regions.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('filters.decade')}>
              <Select value={filters.decade ? String(filters.decade) : ''} onChange={(e) => update({ decade: e.target.value ? Number(e.target.value) : null })}>
                <option value="">{t('filters.allDecades')}</option>
                {DECADES.map((d) => (
                  <option key={d} value={d}>
                    {t('filters.decadeValue', { decade: d })}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {chips.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => removeChip(c.key)}
                  aria-label={t('filters.remove', { label: c.label })}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-mint px-3.5 text-[0.85rem] font-semibold text-heritage-deep hover:bg-mint/70"
                >
                  {c.label}
                  <X aria-hidden="true" className="size-4" />
                </button>
              ))}
              <Button variant="ghost" onClick={reset} leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
                {t('filters.reset')}
              </Button>
            </div>
          )}
        </section>

        {search.mode === 'sample' && <SampleBanner notConfigured={search.notConfigured} className="mt-8" />}

        {/* Results */}
        <section ref={resultsRef} tabIndex={-1} aria-labelledby="results-title" aria-busy={search.loading} className="mt-10 focus:outline-none">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="results-title" className="font-serif text-[1.6rem] font-semibold text-heritage-deep md:text-[1.9rem]">
              {narrowing ? t('results.heading') : t('results.latest')}
            </h2>
            <p aria-live="polite" className="text-[0.92rem] text-ink-soft">
              {search.loading ? t('results.loading') : !search.error ? countText : ''}
            </p>
          </div>

          {search.error ? (
            <div role="alert" className="mt-6">
              <EmptyState
                icon={<SearchX />}
                title={t('states.error')}
                action={
                  <Button onClick={search.retry} leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
                    {t('states.retry')}
                  </Button>
                }
              />
            </div>
          ) : search.loading && search.items.length === 0 ? (
            <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className={cn(i === 0 && !narrowing && 'md:col-span-2')}>
                  <KnowledgeCardSkeleton featured={i === 0 && !narrowing} />
                </li>
              ))}
            </ul>
          ) : search.items.length === 0 ? (
            <NoResults filters={filters} chips={chips} onRemove={removeChip} onReset={reset} />
          ) : (
            <>
              <ul className={cn('mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3', search.loading && 'opacity-60 transition-opacity')}>
                {search.items.map((item, i) => {
                  const featured = showFeatured && i === 0;
                  return (
                    <Reveal as="li" key={item.id} delay={Math.min(i % 3, 2) * 0.06} className={cn(featured && 'md:col-span-2 lg:col-span-3')}>
                      <KnowledgeCard item={item} topics={topics} featured={featured} />
                    </Reveal>
                  );
                })}
              </ul>
              <div className="mt-10 flex flex-col items-center gap-3">
                {search.hasMore ? (
                  <Button variant="secondary" size="lg" onClick={search.loadMore} loading={search.loadingMore}>
                    {t('results.loadMore')}
                  </Button>
                ) : (
                  <p className="text-[0.9rem] text-ink-soft">{t('results.end')}</p>
                )}
                {search.loadMoreError && (
                  <p role="alert" className="text-[0.9rem] font-medium text-terracotta">
                    {t('results.loadMoreError')}
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function NoResults({
  filters,
  chips,
  onRemove,
  onReset,
}: {
  filters: KnowledgeFilters;
  chips: { key: keyof KnowledgeFilters; label: string }[];
  onRemove: (key: keyof KnowledgeFilters) => void;
  onReset: () => void;
}) {
  const t = useT('knowledge');
  const q = filters.q.trim();
  return (
    <div className="mt-6 rounded-[1.75rem] border border-dashed border-line bg-paper/70 px-6 py-10 md:px-10">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-mint text-heritage">
          <SearchX className="size-7" />
        </span>
        <div className="min-w-0">
          <h3 className="font-serif text-[1.35rem] font-semibold text-heritage-deep">{t('empty.title')}</h3>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{t('empty.body')}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft marker:text-terracotta">
            {chips.length > 0 && <li>{t('empty.tipRemove')}</li>}
            <li>{t('empty.tipWords')}</li>
            <li>{t('empty.tipAccents')}</li>
          </ul>
          {q && <p className="mt-3 text-[0.92rem] text-ink-soft">{t('empty.keepQuery', { q })}</p>}
          {chips.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onRemove(c.key)}
                  aria-label={t('filters.remove', { label: c.label })}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-paper px-4 text-[0.88rem] font-semibold text-heritage ring-1 ring-line hover:ring-heritage/50"
                >
                  {c.label}
                  <X aria-hidden="true" className="size-4" />
                </button>
              ))}
            </div>
          )}
          {chips.length > 1 && (
            <Button className="mt-5" onClick={onReset}>
              {t('empty.reset')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
