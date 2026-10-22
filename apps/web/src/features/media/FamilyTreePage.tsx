// /gia-dinh/cay-gia-dinh: storytellers in generation tiers (oldest on top), with approved story counts.
import { BookOpen, Mic, Printer, TreeDeciduous, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge, Button, ButtonLink, EmptyState, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { loadMembers, type MemberView } from '@/features/families/api';
import { FamilyGate } from '@/features/families/FamilyGate';
import { useCurrentFamily } from '@/features/families/current';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { NarratorAvatar } from '@/features/vault/components/NarratorAvatar';
import { VaultPageHeader } from '@/features/vault/components/VaultPageHeader';
import { assistedTellPath, useNarrators, type Narrator } from '@/features/narrators';
import { buildTiers, connectorPaths, countByNarrator, packedCenters, readPaged, vaultByNarratorPath, type Generation } from './tree';

export default function FamilyTreePage() {
  return (
    <FamilyGate>
      <FamilyTree />
    </FamilyGate>
  );
}

/** null while loading; 'failed' when the count could not be read (never shown as "no stories"). */
type Counts = Map<string, number> | null | 'failed';

function useApprovedCounts(familyId: string) {
  const [counts, setCounts] = useState<Counts>(null);
  const load = useCallback(async (alive: () => boolean = () => true) => {
    const sb = getSupabase();
    if (!sb) return;
    // Paged: one response is capped at max_rows (1000), and a silently truncated list would under-count.
    const res = await readPaged<{ narrator_id: string }>((a, b) =>
      sb.from('stories').select('narrator_id').eq('family_id', familyId).eq('edit_status', 'approved').order('id').range(a, b),
    );
    // A failed count is not "no approved stories": the cards then show no count at all rather than a wrong one.
    if (!alive()) return;
    setCounts(res.error ? 'failed' : countByNarrator(res.data ?? []));
  }, [familyId]);
  useEffect(() => {
    let alive = true;
    setCounts(null);
    void load(() => alive);
    return () => {
      alive = false;
    };
  }, [load]);
  return counts;
}

function useMembers(familyId: string) {
  const [members, setMembers] = useState<MemberView[]>([]);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    loadMembers(sb, familyId)
      .then((m) => alive && setMembers(m))
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [familyId]);
  return members;
}

function FamilyTree() {
  const t = useT('media');
  const tv = useT('vault');
  const fam = useCurrentFamily();
  const familyId = fam.current!.id;
  const { narrators, loading, error, reload } = useNarrators(familyId);
  const counts = useApprovedCounts(familyId);
  const members = useMembers(familyId);
  const { tiers, unplaced } = useMemo(() => buildTiers(narrators), [narrators]);

  if (!getSupabase()) return <NotConfiguredNotice />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 print:max-w-none">
      <VaultPageHeader
        eyebrow={tv('header.eyebrow')}
        title={t('tree.title')}
        lede={t('tree.subtitle')}
        actions={
          narrators.length > 0 && (
            <Button variant="secondary" className="print:hidden" onClick={() => window.print()} leftIcon={<Printer className="size-4" aria-hidden="true" />}>
              {t('tree.print')}
            </Button>
          )
        }
      />

      {error ? (
        <ErrorNotice message={t('tree.loadError')} onRetry={() => void reload()} />
      ) : loading ? (
        <div aria-busy="true" className="flex flex-col items-center gap-10">
          <span className="sr-only" role="status">
            {t('photos.loading')}
          </span>
          <Skeleton className="h-28 w-56" />
          <div className="flex gap-6">
            <Skeleton className="h-28 w-48" />
            <Skeleton className="h-28 w-48" />
          </div>
        </div>
      ) : narrators.length === 0 ? (
        <EmptyState
          icon={<TreeDeciduous />}
          title={t('tree.emptyTitle')}
          description={t('tree.emptyBody')}
          action={fam.canEdit ? <ButtonLink to="/gia-dinh/nguoi-ke?new=1">{t('tree.emptyCta')}</ButtonLink> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-10">
          {tiers.length > 0 && (
            <>
              <p className="text-[0.9rem] text-ink-soft">{t('tree.note')}</p>
              <TreeTiers tiers={tiers} counts={counts} canEdit={fam.canEdit} />
            </>
          )}

          {unplaced.length > 0 && (
            <section aria-labelledby="tree-unplaced" className="rounded-[1.75rem] border border-dashed border-line bg-paper/70 p-5 md:p-6 print:break-inside-avoid">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 id="tree-unplaced" className="font-serif text-[1.25rem] font-semibold text-heritage-deep">
                    {t('tree.unplaced')}
                  </h2>
                  <p className="text-[0.92rem] text-ink-soft">{t('tree.unplacedHint')}</p>
                </div>
                {fam.canEdit && (
                  <Link to="/gia-dinh/nguoi-ke" className="inline-flex min-h-11 shrink-0 items-center font-semibold text-heritage underline-offset-4 hover:underline print:hidden">
                    {t('tree.toNarrators')}
                  </Link>
                )}
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unplaced.map((n) => (
                  <li key={n.id} className="flex">
                    <PersonCard narrator={n} count={counts instanceof Map ? (counts.get(n.id) ?? 0) : 0} countsState={counts === null ? 'loading' : counts === 'failed' ? 'failed' : 'ready'} canEdit={fam.canEdit} className="w-full" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {members.length > 0 && (
            <section aria-labelledby="tree-members" className="print:break-inside-avoid">
              <h2 id="tree-members" className="font-serif text-[1.25rem] font-semibold text-heritage-deep">
                {t('tree.members')}
              </h2>
              <p className="mb-3 text-[0.92rem] text-ink-soft">{t('tree.membersHint')}</p>
              <ul className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <li key={m.user_id} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-paper px-4 py-1.5 ring-1 ring-line">
                    <UsersRound className="size-4 text-heritage" aria-hidden="true" />
                    <span className="font-semibold text-ink">{m.display_name || t('tree.memberUnnamed')}</span>
                    {m.relation && <span className="text-ink-soft">· {m.relation}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// Fixed card width + gap: rows are centred flex rows, and the connectors use the same numbers to find card centres.
const CARD_W = 224;
const CARD_GAP = 20;

function TreeTiers({ tiers, counts, canEdit }: { tiers: Array<{ generation: Generation; narrators: Narrator[] }>; counts: Counts; canEdit: boolean }) {
  const t = useT('media');
  const widest = Math.max(...tiers.map((x) => x.narrators.length));
  const width = widest * CARD_W + (widest - 1) * CARD_GAP;
  const centers = (k: number) => packedCenters(k, widest, CARD_W, CARD_GAP);
  return (
    <div className="rounded-[2rem] bg-cream/60 p-4 ring-1 ring-line md:overflow-x-auto md:p-8 print:overflow-visible print:bg-transparent print:p-0 print:ring-0">
      <ol className="flex flex-col md:mx-auto md:w-[var(--tree-w)]" style={{ ['--tree-w' as string]: `${width}px` }}>
        {tiers.map((tier, i) => {
          const next = tiers[i + 1];
          return (
            <li key={tier.generation} className="flex flex-col">
              <section aria-labelledby={`tier-${tier.generation}`} className="print:break-inside-avoid">
                <h2 id={`tier-${tier.generation}`} className="mb-3 text-center text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-terracotta">
                  {t(`tree.generation.${tier.generation}` as `tree.generation.${Generation}`)}
                </h2>
                <TierRow narrators={tier.narrators} counts={counts} canEdit={canEdit} />
              </section>
              {next && <Connector paths={connectorPaths(tier.narrators.length, next.narrators.length, centers)} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** One generation: a centred, wrapping row of equal-height cards (one per line on phones, two from sm, fixed width from md). */
function TierRow({ narrators, counts, canEdit }: { narrators: Narrator[]; counts: Counts; canEdit: boolean }) {
  return (
    <ul className="flex flex-wrap items-stretch justify-center gap-4 md:flex-nowrap md:gap-5">
      {narrators.map((n) => (
        <li key={n.id} className="flex w-full sm:w-[calc(50%-0.5rem)] md:w-[224px] md:shrink-0">
          <PersonCard narrator={n} count={counts instanceof Map ? (counts.get(n.id) ?? 0) : 0} countsState={counts === null ? 'loading' : counts === 'failed' ? 'failed' : 'ready'} canEdit={canEdit} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

function Connector({ paths }: { paths: string[] }) {
  return (
    <>
      {/* phones: a simple vertical stem between stacked tiers */}
      <div aria-hidden="true" className="mx-auto my-2 h-8 w-0.5 rounded-full bg-heritage/35 md:hidden print:hidden" />
      <svg aria-hidden="true" viewBox="0 0 100 40" preserveAspectRatio="none" className="my-1 hidden h-12 w-full text-heritage/45 md:block print:block">
        {paths.map((d) => (
          <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </>
  );
}

function PersonCard({ narrator: n, count, countsState, canEdit, className }: { narrator: Narrator; count: number; countsState: 'loading' | 'ready' | 'failed'; canEdit: boolean; className?: string }) {
  const t = useT('media');
  return (
    <article className={`flex flex-col gap-3 rounded-[1.5rem] bg-paper p-4 shadow-[0_12px_30px_-24px_rgba(22,58,49,0.5)] ring-1 ring-line/80 print:shadow-none ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        <NarratorAvatar id={n.id} name={n.display_name} size="lg" className="print:bg-transparent! print:text-heritage print:ring-1 print:ring-heritage" />
        <div className="min-w-0">
          <h3 className="break-words font-serif text-[1.1rem] font-semibold leading-snug text-heritage-deep">{n.display_name}</h3>
          <p className="text-[0.88rem] text-ink-soft">{[n.relation, n.birth_year ? t('tree.born', { year: n.birth_year }) : null].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <p className="text-[0.88rem]">
        {countsState === 'failed' ? null : countsState === 'ready' ? (
          count > 0 ? (
            <Badge size="sm" tone="mint" icon={<BookOpen />}>
              {t('tree.stories', { n: count })}
            </Badge>
          ) : (
            <span className="text-ink-soft">{t('tree.noStories')}</span>
          )
        ) : (
          <Skeleton className="h-5 w-32" />
        )}
      </p>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 print:hidden">
        <Link to={vaultByNarratorPath(n.id)} aria-label={t('tree.viewStoriesOf', { name: n.display_name })} className="inline-flex min-h-11 items-center gap-1.5 text-[0.9rem] font-semibold text-heritage underline-offset-4 hover:underline">
          <BookOpen className="size-4" aria-hidden="true" />
          {t('tree.viewStories')}
        </Link>
        {canEdit && (
          <Link to={assistedTellPath(n.id)} aria-label={t('tree.tellWith', { name: n.display_name })} className="inline-flex min-h-11 items-center gap-1.5 text-[0.9rem] font-semibold text-terracotta underline-offset-4 hover:underline">
            <Mic className="size-4" aria-hidden="true" />
            {t('tree.tell')}
          </Link>
        )}
      </div>
    </article>
  );
}
