import { useState } from 'react';
import { Button, Field, Select, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { CONNECT_STATUSES, nextConnectStatuses, type ConnectStatus } from '../access';
import { useDateTime } from '../format';
import { HubLink, ItemLink, ListHeader, ListState, StatusPill } from '../shared';
import { must, publicTitles, useAdminQuery } from '../useAdminQuery';

interface ConnectRow {
  id: string;
  /** Null once the public item was removed (the request is kept). */
  public_item_id: string | null;
  name: string;
  contact: string;
  message: string;
  status: string;
  created_at: string;
}

interface InterestRow {
  id: string;
  plan: string | null;
  topic: string | null;
  name: string;
  contact: string;
  message: string | null;
  status: string;
  created_at: string;
}

function loader(filter: string) {
  return async (sb: Supabase) => {
    let query = sb.from('connect_requests').select('id, public_item_id, name, contact, message, status, created_at').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const rows: ConnectRow[] = must(await query);
    const titles = await publicTitles(sb, rows.map((r) => r.public_item_id));
    let interestQuery = sb.from('interest_requests').select('id, plan, topic, name, contact, message, status, created_at').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') interestQuery = interestQuery.eq('status', filter);
    const interest: InterestRow[] = must(await interestQuery);
    return { rows, titles, interest };
  };
}

export function ConnectTab() {
  const t = useT('admin');
  const dt = useDateTime();
  const { toast } = useToast();
  const { user } = useSession();
  const [filter, setFilter] = useState<'all' | ConnectStatus>('new');
  const q = useAdminQuery(`connect:${filter}`, loader(filter));
  const [busy, setBusy] = useState<string | null>(null);
  const rows = q.data?.rows ?? [];
  const interest = q.data?.interest ?? [];

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

  async function setInterestStatus(row: InterestRow, status: ConnectStatus) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(row.id);
    const resolved = status !== 'new';
    const { error } = await sb
      .from('interest_requests')
      .update({ status, resolved_at: resolved ? new Date().toISOString() : null, resolved_by: resolved ? user?.id ?? null : null })
      .eq('id', row.id);
    setBusy(null);
    if (error) {
      toast({ title: t('common.updateError'), tone: 'error' });
      return;
    }
    toast({ title: t('common.updated'), tone: 'success' });
    q.setData((prev) => ({
      ...prev,
      interest: filter === 'all' ? prev.interest.map((r) => (r.id === row.id ? { ...r, status } : r)) : prev.interest.filter((r) => r.id !== row.id),
    }));
  }

  return (
    <div>
      <p className="mb-5 text-[0.9rem] text-ink-soft">{t('connect.privacy')}</p>
      <ListHeader count={q.status === 'ready' ? rows.length : null} onRefresh={q.reload} loading={q.status === 'loading'}>
        <Field label={t('common.filterStatus')} className="w-56">
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
                  <p className="font-semibold text-ink">{t('connect.from', { name: row.name })}</p>
                  <p className="mt-0.5 break-words text-[0.9rem] text-ink-soft">{t('connect.contact', { contact: row.contact })}</p>
                  <p className="mt-0.5 text-[0.85rem] text-ink-soft">{t('common.at', { time: dt(row.created_at) })}</p>
                </div>
                <StatusPill tone={row.status === 'new' ? 'open' : row.status === 'forwarded' ? 'done' : 'muted'}>
                  {(CONNECT_STATUSES as readonly string[]).includes(row.status) ? t(`connect.statuses.${row.status as ConnectStatus}`) : row.status}
                </StatusPill>
              </div>
              <div className="mt-2">
                <ItemLink id={row.public_item_id} title={row.public_item_id ? q.data?.titles[row.public_item_id] : undefined} />
              </div>
              <p className="mt-2 whitespace-pre-line rounded-2xl bg-cream px-4 py-3 leading-relaxed text-ink">{row.message}</p>
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
      {q.status === 'ready' && interest.length > 0 && (
        <section className="mt-10" aria-labelledby="lh-interest-title">
          <h3 id="lh-interest-title" className="mb-4 font-serif text-[1.2rem] font-semibold text-heritage-deep">
            {t('connect.interest.title', { n: interest.length })}
          </h3>
          <ul className="flex flex-col gap-4">
            {interest.map((row) => (
              <li key={row.id} className="rounded-[1.5rem] bg-paper p-5 ring-1 ring-line md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{t('connect.from', { name: row.name })}</p>
                    <p className="mt-0.5 break-words text-[0.9rem] text-ink-soft">{t('connect.contact', { contact: row.contact })}</p>
                    <p className="mt-0.5 text-[0.85rem] text-ink-soft">{t('common.at', { time: dt(row.created_at) })}</p>
                  </div>
                  <StatusPill tone={row.status === 'new' ? 'open' : row.status === 'forwarded' ? 'done' : 'muted'}>
                    {(CONNECT_STATUSES as readonly string[]).includes(row.status) ? t(`connect.statuses.${row.status as ConnectStatus}`) : row.status}
                  </StatusPill>
                </div>
                {(row.plan || row.topic) && (
                  <p className="mt-2 text-[0.9rem] text-ink-soft">
                    {[row.plan ? t('connect.interest.plan', { plan: row.plan }) : null, row.topic ? t('connect.interest.topic', { topic: row.topic }) : null].filter(Boolean).join(' · ')}
                  </p>
                )}
                {row.message && <p className="mt-2 whitespace-pre-line rounded-2xl bg-cream px-4 py-3 leading-relaxed text-ink">{row.message}</p>}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {nextConnectStatuses(row.status).map((s) => (
                    <Button key={s} variant={s === 'forwarded' ? 'primary' : 'secondary'} loading={busy === row.id} disabled={busy !== null} onClick={() => void setInterestStatus(row, s)}>
                      {t(`connect.actions.${s}`)}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
