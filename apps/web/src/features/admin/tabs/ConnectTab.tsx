import { useState } from 'react';
import { Button, Field, Select, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { CONNECT_FORMATS, type ConnectFormat } from '@/features/knowledge/connect';
import { CONNECT_STATUSES, nextConnectStatuses, resolutionPatch, type ConnectStatus } from '../access';
import { useDateTime } from '../format';
import { HubLink, ItemLink, ListHeader, ListState, StatusPill } from '../shared';
import { must, publicTitles, useAdminQuery } from '../useAdminQuery';

interface ConnectRow {
  id: string;
  public_item_id: string;
  name: string;
  contact: string;
  message: string;
  status: string;
  created_at: string;
}

function loader(filter: string) {
  return async (sb: Supabase) => {
    let query = sb.from('connect_requests').select('id, public_item_id, name, contact, message, status, created_at').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const rows: ConnectRow[] = must(await query);
    const titles = await publicTitles(sb, rows.map((r) => r.public_item_id));
    return { rows, titles };
  };
}

interface InterestRow {
  id: string;
  plan: string | null;
  topic: string | null;
  format: string | null;
  name: string;
  contact: string;
  message: string | null;
  status: string;
  created_at: string;
}

function interestLoader(filter: string) {
  return async (sb: Supabase) => {
    let query = sb.from('interest_requests').select('id, plan, topic, format, name, contact, message, status, created_at').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const rows: InterestRow[] = must(await query);
    return { rows };
  };
}

function InterestList({ filter }: { filter: 'all' | ConnectStatus }) {
  const t = useT('admin');
  const tc = useT('knowledge');
  const dt = useDateTime();
  const { toast } = useToast();
  const { user } = useSession();
  const q = useAdminQuery(`interest:${filter}`, interestLoader(filter));
  const [busy, setBusy] = useState<string | null>(null);
  const rows = q.data?.rows ?? [];

  async function setStatus(row: InterestRow, status: ConnectStatus) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(row.id);
    const { error } = await sb.from('interest_requests').update(resolutionPatch(status, 'new', user?.id ?? null)).eq('id', row.id);
    setBusy(null);
    if (error) {
      toast({ title: t('common.updateError'), tone: 'error' });
      return;
    }
    toast({ title: t('common.updated'), tone: 'success' });
    q.setData((prev) => ({
      rows: filter === 'all' ? prev.rows.map((r) => (r.id === row.id ? { ...r, status } : r)) : prev.rows.filter((r) => r.id !== row.id),
    }));
  }

  return (
    <section className="mt-10" aria-labelledby="interest-heading">
      <h2 id="interest-heading" className="mb-4 font-serif text-[1.3rem] font-semibold text-heritage-deep">
        {t('connect.interest.title')}
      </h2>
      <ListState status={q.status} empty={rows.length === 0} emptyTitle={t('connect.interest.emptyTitle')} emptyBody={t('connect.interest.emptyBody')} onRetry={q.reload}>
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-[1.5rem] bg-paper p-5 ring-1 ring-line md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-ink">{t('connect.from', { name: row.name })}</p>
                  <p className="mt-0.5 break-words text-[0.9rem] text-ink-soft">{t('connect.contact', { contact: row.contact })}</p>
                  <p className="mt-0.5 text-[0.9rem] text-ink-soft">{t('common.at', { time: dt(row.created_at) })}</p>
                </div>
                <StatusPill tone={row.status === 'new' ? 'open' : row.status === 'forwarded' ? 'done' : 'muted'}>
                  {(CONNECT_STATUSES as readonly string[]).includes(row.status) ? t(`connect.statuses.${row.status as ConnectStatus}`) : row.status}
                </StatusPill>
              </div>
              <p className="mt-2 break-words text-[0.9rem] text-ink-soft">
                {[
                  row.plan && t('connect.interest.plan', { plan: row.plan === 'month' || row.plan === 'year' || row.plan === 'book' ? t(`connect.interest.plans.${row.plan}`) : row.plan }),
                  row.topic && t('connect.interest.topic', { topic: row.topic }),
                  row.format && t('connect.interest.format', { format: (CONNECT_FORMATS as readonly string[]).includes(row.format) ? tc(`connect.formats.${row.format as ConnectFormat}`) : row.format }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {row.message && <p className="mt-2 whitespace-pre-line break-words rounded-2xl bg-cream px-4 py-3 leading-relaxed text-ink">{row.message}</p>}
              <div className="mt-4 flex flex-wrap gap-2.5">
                {nextConnectStatuses(row.status).map((s) => (
                  <Button key={s} variant={s === 'forwarded' ? 'primary' : 'secondary'} loading={busy === row.id} disabled={busy !== null} onClick={() => void setStatus(row, s)}>
                    {t(`connect.actions.${s}`)}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </ListState>
    </section>
  );
}

export function ConnectTab() {
  const t = useT('admin');
  const dt = useDateTime();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | ConnectStatus>('new');
  const q = useAdminQuery(`connect:${filter}`, loader(filter));
  const [busy, setBusy] = useState<string | null>(null);
  const rows = q.data?.rows ?? [];

  async function setStatus(row: ConnectRow, status: ConnectStatus) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(row.id);
    const { error } = await sb.from('connect_requests').update({ status }).eq('id', row.id);
    setBusy(null);
    if (error) {
      toast({ title: t('common.updateError'), tone: 'error' });
      return;
    }
    toast({ title: t('common.updated'), tone: 'success' });
    q.setData((prev) => ({
      ...prev,
      rows: filter === 'all' ? prev.rows.map((r) => (r.id === row.id ? { ...r, status } : r)) : prev.rows.filter((r) => r.id !== row.id),
    }));
  }

  return (
    <div>
      <p className="mb-5 text-[0.9rem] text-ink-soft">{t('connect.privacy')}</p>
      <ListHeader count={q.status === 'ready' ? rows.length : null} onRefresh={q.reload} loading={q.status === 'loading'}>
        <Field label={t('common.filterStatus')} className="w-full sm:w-56">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">{t('common.all')}</option>
            {CONNECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`connect.statuses.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </ListHeader>
      <ListState status={q.status} empty={rows.length === 0} emptyTitle={t('connect.emptyTitle')} emptyBody={t('connect.emptyBody')} emptyAction={<HubLink />} onRetry={q.reload}>
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-[1.5rem] bg-paper p-5 ring-1 ring-line md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-ink">{t('connect.from', { name: row.name })}</p>
                  <p className="mt-0.5 break-words text-[0.9rem] text-ink-soft">{t('connect.contact', { contact: row.contact })}</p>
                  <p className="mt-0.5 text-[0.9rem] text-ink-soft">{t('common.at', { time: dt(row.created_at) })}</p>
                </div>
                <StatusPill tone={row.status === 'new' ? 'open' : row.status === 'forwarded' ? 'done' : 'muted'}>
                  {(CONNECT_STATUSES as readonly string[]).includes(row.status) ? t(`connect.statuses.${row.status as ConnectStatus}`) : row.status}
                </StatusPill>
              </div>
              <div className="mt-2">
                <ItemLink id={row.public_item_id} title={q.data?.titles[row.public_item_id]} />
              </div>
              <p className="mt-2 whitespace-pre-line break-words rounded-2xl bg-cream px-4 py-3 leading-relaxed text-ink">{row.message}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {nextConnectStatuses(row.status).map((s) => (
                  <Button key={s} variant={s === 'forwarded' ? 'primary' : 'secondary'} loading={busy === row.id} disabled={busy !== null} onClick={() => void setStatus(row, s)}>
                    {t(`connect.actions.${s}`)}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </ListState>
      <InterestList filter={filter} />
    </div>
  );
}
