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
import { ErrorNotice, NotConfiguredNotice, PageHeader } from '@/features/families/states';
import { assistedTellPath, useNarrators, type Narrator } from '@/features/narrators';
import { buildTiers, connectorPaths, countByNarrator, initialOf, vaultByNarratorPath, type Generation } from './tree';

export default function FamilyTreePage() {
  return (
    <FamilyGate>
      <FamilyTree />
    </FamilyGate>
  );
}

function useApprovedCounts(familyId: string) {
  const [counts, setCounts] = useState<Map<string, number> | null>(null);
  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const res = await sb.from('stories').select('narrator_id').eq('family_id', familyId).eq('edit_status', 'approved').limit(5000);
    setCounts(res.error ? new Map() : countByNarrator(res.data ?? []));
  }, [familyId]);
  useEffect(() => {
    void load();
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
  const fam = useCurrentFamily();
  const familyId = fam.current!.id;
  const { narrators, loading, error, reload } = useNarrators(familyId);
  const counts = useApprovedCounts(familyId);
  const members = useMembers(familyId);
  const { tiers, unplaced } = useMemo(() => buildTiers(narrators), [narrators]);

  if (!getSupabase()) return <NotConfiguredNotice />;

  return (
    <div className="mx-auto max-w-6xl print:max-w-none">
      <PageHeader
        title={t('tree.title')}
        description={t('tree.subtitle')}
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
                  <li key={n.id}>
                    <PersonCard narrator={n} count={counts?.get(n.id) ?? 0} countsReady={counts !== null} canEdit={fam.canEdit} />
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

const CARD_MIN = 210; // px per card column on wide screens (the tree scrolls inside its frame beyond that)

function TreeTiers({ tiers, counts, canEdit }: { tiers: Array<{ generation: Generation; narrators: Narrator[] }>; counts: Map<string, number> | null; canEdit: boolean }) {
  const t = useT('media');
  const widest = Math.max(...tiers.map((x) => x.narrators.length));
  return (
    <div className="rounded-[2rem] bg-cream/60 p-4 ring-1 ring-line md:overflow-x-auto md:p-8 print:overflow-visible print:bg-transparent print:p-0 print:ring-0">
      <ol className="flex flex-col md:mx-auto" style={{ ['--tree-min' as string]: `${widest * CARD_MIN}px` }}>
        {tiers.map((tier, i) => {
          const next = tiers[i + 1];
          return (
            <li key={tier.generation} className="flex flex-col md:min-w-[var(--tree-min)]">
              <section aria-labelledby={`tier-${tier.generation}`} className="print:break-inside-avoid">
                <h2 id={`tier-${tier.generation}`} className="mb-3 text-center text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-terracotta">
                  {t(`tree.generation.${tier.generation}` as `tree.generation.${Generation}`)}
                </h2>
                <TierRow narrators={tier.narrators} counts={counts} canEdit={canEdit} />
              </section>
              {next && <Connector upper={tier.narrators.length} lower={next.narrators.length} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Cards of one tier: stacked on phones, n equal columns from md up (column centres match the SVG connectors). */
function TierRow({ narrators, counts, canEdit }: { narrators: Narrator[]; counts: Map<string, number> | null; canEdit: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:gap-0 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]" style={{ ['--cols' as string]: String(narrators.length) }}>
      {narrators.map((n) => (
        <li key={n.id} className="flex justify-center md:px-2.5">
          <PersonCard narrator={n} count={counts?.get(n.id) ?? 0} countsReady={counts !== null} canEdit={canEdit} className="w-full md:max-w-[15rem]" />
        </li>
      ))}
    </ul>
  );
}

function Connector({ upper, lower }: { upper: number; lower: number }) {
  return (
    <>
      {/* phones: a simple vertical stem between stacked tiers */}
      <div aria-hidden="true" className="mx-auto my-2 h-8 w-0.5 rounded-full bg-heritage/35 md:hidden print:hidden" />
      <svg aria-hidden="true" viewBox="0 0 100 40" preserveAspectRatio="none" className="my-1 hidden h-12 w-full text-heritage/45 md:block print:block">
        {connectorPaths(upper, lower).map((d) => (
          <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </>
  );
}

function PersonCard({ narrator: n, count, countsReady, canEdit, className }: { narrator: Narrator; count: number; countsReady: boolean; canEdit: boolean; className?: string }) {
  const t = useT('media');
  return (
    <article className={`flex h-full flex-col gap-3 rounded-[1.5rem] bg-paper p-4 shadow-[0_12px_30px_-24px_rgba(22,58,49,0.5)] ring-1 ring-line/80 print:shadow-none ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-heritage font-serif text-[1.3rem] font-semibold text-cream print:bg-transparent print:text-heritage print:ring-1 print:ring-heritage">
          {initialOf(n.display_name)}
        </span>
        <div className="min-w-0">
          <h3 className="break-words font-serif text-[1.1rem] font-semibold leading-snug text-heritage-deep">{n.display_name}</h3>
          <p className="text-[0.88rem] text-ink-soft">{[n.relation, n.birth_year ? t('tree.born', { year: n.birth_year }) : null].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <p className="text-[0.88rem]">
        {countsReady ? (
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
