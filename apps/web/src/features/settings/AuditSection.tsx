import type { Database, Json } from '@lh/shared';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, Field, Select, Skeleton } from '@/components/ui';
import type { FamilySummary } from '@/features/families/current';
import { ErrorNotice, SectionCard } from '@/features/families/states';
import { useLocale, useT, type Locale } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { AUDIT_ACTIONS, auditActionLabel, auditActorKind, isKnownAuditTarget, pageCount, pageRange } from './audit';

type AuditRow = Pick<Database['public']['Tables']['audit_log']['Row'], 'id' | 'actor' | 'action' | 'target_type' | 'target_id' | 'details' | 'at'>;

function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function detailString(details: Json, key: string): string | null {
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const v = details[key];
    return typeof v === 'string' ? v : null;
  }
  return null;
}

export function AuditSection({ family, storyTitles, narratorNames }: { family: FamilySummary; storyTitles: ReadonlyMap<string, string>; narratorNames: ReadonlyMap<string, string> }) {
  const t = useT('settings');
  const { locale } = useLocale();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    const [from, to] = pageRange(page);
    let q = sb.from('audit_log').select('id, actor, action, target_type, target_id, details, at', { count: 'exact' }).eq('family_id', family.id);
    if (filter) q = q.eq('action', filter);
    const { data, error: err, count } = await q.order('at', { ascending: false }).range(from, to);
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    const list = data ?? [];
    const actorIds = [...new Set(list.map((r) => r.actor).filter((a): a is string => Boolean(a)))];
    const map = new Map<string, string>();
    if (actorIds.length) {
      // Co-member profiles are readable; anyone else (e.g. narrator devices) stays unnamed.
      const { data: profiles } = await sb.from('profiles').select('id, display_name').in('id', actorIds);
      for (const p of profiles ?? []) if (p.display_name) map.set(p.id, p.display_name);
    }
    setNames(map);
    setRows(list);
    setTotal(count ?? list.length);
    setError(false);
    setLoading(false);
  }, [family.id, filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeFilter(next: string) {
    setFilter(next);
    setPage(0);
  }

  const pages = pageCount(total);
  const actionLabel = (code: string) => auditActionLabel(code, (c) => t(`audit.actions.${c}`));

  function actorLabel(r: AuditRow) {
    const a = auditActorKind(r.actor, r.action, names);
    return a.kind === 'named' ? a.name : t(`audit.actor.${a.kind}`);
  }

  function targetLabel(r: AuditRow) {
    const type = isKnownAuditTarget(r.target_type) ? t(`audit.target.${r.target_type}`) : r.target_type ? r.target_type : t('audit.target.other');
    if (r.target_type === 'story' && r.target_id) {
      const title = storyTitles.get(r.target_id);
      if (title) return `${type}: ${title}`;
    }
    if (r.target_type === 'narrator_link') {
      const nid = detailString(r.details, 'narrator_id');
      const name = nid ? narratorNames.get(nid) : undefined;
      if (name) return t('audit.linkOf', { name });
    }
    if (r.target_type === 'family') return `${type}: ${family.name}`;
    return type;
  }

  let body;
  if (loading)
    body = (
      <div aria-busy="true" className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  else if (error) body = <ErrorNotice message={t('states.loadError')} onRetry={() => void load()} />;
  else if (rows.length === 0)
    body = filter ? (
      <EmptyState
        icon={<ScrollText />}
        title={t('audit.emptyFiltered')}
        action={
          <Button variant="secondary" onClick={() => changeFilter('')}>
            {t('audit.clearFilter')}
          </Button>
        }
      />
    ) : (
      <EmptyState icon={<ScrollText />} title={t('audit.emptyTitle')} description={t('audit.emptyBody')} />
    );
  else
    body = (
      <>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
          <table className="w-full min-w-0 border-collapse text-left text-[0.95rem]">
            <caption className="sr-only">{t('audit.title')}</caption>
            <thead className="hidden bg-cream text-[0.85rem] text-ink-soft md:table-header-group">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">{t('audit.colTime')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('audit.colActor')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('audit.colAction')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('audit.colTarget')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="block border-t border-line/70 px-4 py-3 first:border-t-0 md:table-row md:p-0">
                  <td className="block text-[0.85rem] text-ink-soft md:table-cell md:px-4 md:py-3 md:text-[0.95rem]">
                    <time dateTime={r.at}>{formatDateTime(r.at, locale)}</time>
                  </td>
                  <td className="block md:table-cell md:px-4 md:py-3">
                    <span className="sr-only md:hidden">{t('audit.colActor')}: </span>
                    {actorLabel(r)}
                  </td>
                  <td className="block font-semibold text-ink md:table-cell md:px-4 md:py-3">
                    <span className="sr-only md:hidden">{t('audit.colAction')}: </span>
                    {actionLabel(r.action)}
                  </td>
                  <td className="block break-words text-ink-soft md:table-cell md:px-4 md:py-3">
                    <span className="sr-only md:hidden">{t('audit.colTarget')}: </span>
                    {targetLabel(r)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav aria-label={t('audit.title')} className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-[0.9rem] text-ink-soft">
            {t('audit.page', { page: page + 1, pages })} · {t('audit.total', { n: total })}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} leftIcon={<ChevronLeft className="size-4" aria-hidden="true" />}>
              {t('audit.prev')}
            </Button>
            <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} rightIcon={<ChevronRight className="size-4" aria-hidden="true" />}>
              {t('audit.next')}
            </Button>
          </div>
        </nav>
      </>
    );

  return (
    <SectionCard title={t('audit.title')} description={t('audit.body')}>
      <div className="mb-5 max-w-sm">
        <Field label={t('audit.filterLabel')}>
          <Select value={filter} onChange={(e) => changeFilter(e.target.value)}>
            <option value="">{t('audit.filterAll')}</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {body}
    </SectionCard>
  );
}
