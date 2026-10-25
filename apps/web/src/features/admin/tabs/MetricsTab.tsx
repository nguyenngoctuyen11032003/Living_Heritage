import { Download, Info } from 'lucide-react';
import { Button } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import type { Supabase } from '@/lib/supabase';
import { JOB_STATUSES, METRICS_WINDOW_DAYS, metricsRows, PUBLISH_STATUSES, summarizeUsage, toCsv, windowStart, type JobStatus, type MetricsSnapshot, type PublishStatus } from '../metrics';
import { loadAggregate, tableRows, type Cell, type Table } from '../adminApi';
import { useDateTime } from '../format';
import { ListHeader, ListState } from '../shared';
import { must, useAdminQuery } from '../useAdminQuery';

const USAGE_CAP = 5000;

async function headCount(q: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> {
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Aggregates only: head counts per status and ai_usage metadata (never content, never user ids). */
type Aggregate = Table | 'unavailable' | 'error';

/** pilot_summary / content_counts must not take the whole tab down when they fail. */
const aggregate = (sb: Supabase, fn: 'pilot_summary' | 'content_counts'): Promise<Aggregate> => loadAggregate(sb, fn).catch(() => 'error' as const);

async function loadMetrics(sb: Supabase): Promise<MetricsSnapshot & { capped: boolean; pilot: Aggregate; content: Aggregate }> {
  const [pilot, content] = await Promise.all([aggregate(sb, 'pilot_summary'), aggregate(sb, 'content_counts')]);
  const [jobCounts, publishCounts, usage] = await Promise.all([
    Promise.all(JOB_STATUSES.map((s) => headCount(sb.from('ai_jobs').select('id', { count: 'exact', head: true }).eq('status', s)))),
    Promise.all(PUBLISH_STATUSES.map((s) => headCount(sb.from('publish_requests').select('id', { count: 'exact', head: true }).eq('status', s)))),
    sb.from('ai_usage').select('action, status, latency_ms, input_bytes').gte('created_at', windowStart(new Date())).limit(USAGE_CAP),
  ]);
  const rows = must(usage);
  return {
    jobs: Object.fromEntries(JOB_STATUSES.map((s, i) => [s, jobCounts[i]!])) as Record<JobStatus, number>,
    publish: Object.fromEntries(PUBLISH_STATUSES.map((s, i) => [s, publishCounts[i]!])) as Record<PublishStatus, number>,
    usage: summarizeUsage(rows),
    capped: rows.length >= USAGE_CAP,
    pilot,
    content,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/** One aggregate RPC result as a table (column names come from the DB function). */
// pilot_summary() and content_counts() columns (migration 20261022000600).
const AGG_COLUMNS = ['participant_code', 'first_at', 'last_at', 'event_count', 'counts', 'completed', 'help_opened', 'approved_sources', 'approved_items', 'public_items', 'drafts'] as const;

function AggregateSection({ id, title, hint, value, onExport }: { id: string; title: string; hint: string; value: Aggregate; onExport?: () => void }) {
  const t = useT('admin');
  const dt = useDateTime();
  const label = (c: string) => ((AGG_COLUMNS as readonly string[]).includes(c) ? t(`metrics.columns.${c as (typeof AGG_COLUMNS)[number]}`) : c);
  const show = (c: string, v: Cell) =>
    v === null ? '—' : typeof v === 'boolean' ? t(v ? 'metrics.yes' : 'metrics.no') : c.endsWith('_at') && typeof v === 'string' ? dt(v) : String(v);
  return (
    <section aria-labelledby={id} className="rounded-2xl bg-paper p-5 ring-1 ring-line md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h3 id={id} className="font-serif text-[1.15rem] font-semibold leading-snug text-heritage-deep">
            {title}
          </h3>
          <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft">{hint}</p>
        </div>
        {onExport && value !== 'unavailable' && value !== 'error' && (
          <Button variant="secondary" onClick={onExport} disabled={value.rows.length === 0} leftIcon={<Download aria-hidden="true" className="size-4" />}>
            {t('metrics.export')}
          </Button>
        )}
      </div>
      {value === 'unavailable' ? (
        <p className="mt-4 text-ink-soft">{t('metrics.notDeployed')}</p>
      ) : value === 'error' ? (
        <p role="alert" className="mt-4 font-medium text-terracotta">
          {t('states.loadError')}
        </p>
      ) : value.rows.length === 0 ? (
        <p className="mt-4 text-ink-soft">{t('metrics.noRows')}</p>
      ) : (
        <div className="mt-4 max-w-full overflow-x-auto rounded-2xl ring-1 ring-line" tabIndex={0} aria-labelledby={id}>
          <table className="w-full min-w-max border-collapse text-left text-[0.9rem]">
            <thead className="bg-cream text-ink-soft">
              <tr>
                {value.columns.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 font-semibold">
                    {label(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {value.rows.map((r, i) => (
                <tr key={i} className="border-t border-line/70">
                  {r.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-ink">
                      {show(value.columns[j]!, cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function download(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-cream px-4 py-3">
      <dt className="text-[0.9rem] leading-snug text-ink-soft">{label}</dt>
      <dd className="mt-1 font-serif text-[1.5rem] font-semibold leading-tight text-heritage-deep">{value}</dd>
    </div>
  );
}

export function MetricsTab() {
  const t = useT('admin');
  const q = useAdminQuery('metrics', loadMetrics);
  const m = q.data;
  const { locale } = useLocale();
  const nf = (n: number) => n.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB');

  return (
    <div>
      <p className="mb-6 flex items-start gap-3 rounded-2xl bg-warning-bg px-5 py-4 text-[0.92rem] leading-relaxed text-warning-fg ring-1 ring-warning-line">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>{m && m.pilot !== 'unavailable' ? t('metrics.privacy') : t('metrics.gap')}</span>
      </p>
      <ListHeader count={null} onRefresh={q.reload} loading={q.status === 'loading'}>
        <Button
          variant="secondary"
          disabled={!m}
          onClick={() => m && download(toCsv(metricsRows(m)), `di-san-song-metrics-${today()}.csv`)}
          leftIcon={<Download aria-hidden="true" className="size-4" />}
        >
          {t('metrics.exportOps')}
        </Button>
      </ListHeader>
      <ListState status={q.status} empty={!m} emptyTitle={t('states.loadError')} emptyBody="" onRetry={q.reload}>
        {m && (
          <div className="flex flex-col gap-6">
            <AggregateSection
              id="metrics-pilot"
              title={t('metrics.pilotTitle')}
              hint={t('metrics.pilotHint')}
              value={m.pilot}
              onExport={() => m.pilot !== 'unavailable' && m.pilot !== 'error' && download(toCsv(tableRows(m.pilot)), `di-san-song-pilot-${today()}.csv`)}
            />
            <AggregateSection id="metrics-content" title={t('metrics.contentTitle')} hint={t('metrics.contentHint')} value={m.content} />
            <section aria-labelledby="metrics-jobs" className="rounded-2xl bg-paper p-5 ring-1 ring-line md:p-6">
              <h3 id="metrics-jobs" className="font-serif text-[1.15rem] font-semibold leading-snug text-heritage-deep">
                {t('metrics.jobsTitle')}
              </h3>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {JOB_STATUSES.map((s) => (
                  <Stat key={s} label={t(`metrics.jobStatuses.${s}`)} value={nf(m.jobs[s])} />
                ))}
              </dl>
            </section>
            <section aria-labelledby="metrics-publish" className="rounded-2xl bg-paper p-5 ring-1 ring-line md:p-6">
              <h3 id="metrics-publish" className="font-serif text-[1.15rem] font-semibold leading-snug text-heritage-deep">
                {t('metrics.publishTitle')}
              </h3>
              <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {PUBLISH_STATUSES.map((s) => (
                  <Stat key={s} label={t(`metrics.publishStatuses.${s}`)} value={nf(m.publish[s])} />
                ))}
              </dl>
            </section>
            <section aria-labelledby="metrics-usage" className="rounded-2xl bg-paper p-5 ring-1 ring-line md:p-6">
              <h3 id="metrics-usage" className="font-serif text-[1.15rem] font-semibold leading-snug text-heritage-deep">
                {t('metrics.usageTitle', { days: METRICS_WINDOW_DAYS })}
              </h3>
              <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft">{t('metrics.usageHint')}</p>
              {m.usage.length === 0 ? (
                <p className="mt-4 text-ink-soft">{t('metrics.usageEmpty')}</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {m.usage.map((u) => (
                    <li key={u.action} className="rounded-2xl bg-cream px-4 py-3">
                      <p className="font-semibold text-ink">
                        <code className="rounded-md bg-paper px-1.5 py-0.5 text-[0.85rem]">{u.action}</code>
                      </p>
                      <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft">
                        {t('metrics.usageLine', { calls: nf(u.calls), failed: nf(u.failed), ms: nf(u.medianMs), kb: nf(Math.round(u.inputBytes / 1024)) })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {m.capped && <p className="mt-3 text-[0.9rem] text-ink-soft">{t('metrics.capped', { n: nf(USAGE_CAP) })}</p>}
            </section>
          </div>
        )}
      </ListState>
    </div>
  );
}
