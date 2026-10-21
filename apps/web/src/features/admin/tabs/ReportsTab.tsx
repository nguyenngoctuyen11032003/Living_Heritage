import { EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button, Field, Select, Textarea, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { REPORT_REASONS } from '@/features/knowledge/api';
import { syncPublicAudio } from '@/lib/publicAudio';
import { nextReportStatuses, REPORT_STATUSES, resolutionPatch, type ReportStatus } from '../access';
import { TAKEDOWN_REASON_MAX, takedownReasonValid, withdrawPublicItem } from '../adminApi';
import { useDateTime } from '../format';
import { HubLink, ItemLink, ListHeader, ListState, StatusPill } from '../shared';
import { must, publicTitles, useAdminQuery } from '../useAdminQuery';

interface ReportRow {
  id: string;
  public_item_id: string | null;
  reason: string;
  note: string | null;
  status: string;
  created_at: string;
}

function loader(filter: string) {
  return async (sb: Supabase) => {
    let query = sb.from('reports').select('id, public_item_id, reason, note, status, created_at').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const rows: ReportRow[] = must(await query);
    const titles = await publicTitles(sb, rows.map((r) => r.public_item_id));
    return { rows, titles };
  };
}

export function ReportsTab() {
  const t = useT('admin');
  const tk = useT('knowledge');
  const dt = useDateTime();
  const { toast } = useToast();
  const { user } = useSession();
  const [filter, setFilter] = useState<'all' | ReportStatus>('open');
  const q = useAdminQuery(`reports:${filter}`, loader(filter));
  const [busy, setBusy] = useState<string | null>(null);
  const rows = q.data?.rows ?? [];

  async function setStatus(row: ReportRow, status: ReportStatus) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(row.id);
    const { error } = await sb.from('reports').update(resolutionPatch(status, 'open', user?.id ?? null)).eq('id', row.id);
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

  const reasonLabel = (r: string) => ((REPORT_REASONS as readonly string[]).includes(r) ? tk(`report.reasons.${r as (typeof REPORT_REASONS)[number]}`) : r);

  return (
    <div>
      <ListHeader count={q.status === 'ready' ? rows.length : null} onRefresh={q.reload} loading={q.status === 'loading'}>
        <Field label={t('common.filterStatus')} className="w-56">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">{t('common.all')}</option>
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`reports.statuses.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </ListHeader>
      <ListState status={q.status} empty={rows.length === 0} emptyTitle={t('reports.emptyTitle')} emptyBody={t('reports.emptyBody')} emptyAction={<HubLink />} onRetry={q.reload}>
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-[1.5rem] bg-paper p-5 ring-1 ring-line md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-terracotta">{reasonLabel(row.reason)}</p>
                  <p className="mt-0.5 text-[0.85rem] text-ink-soft">{t('common.at', { time: dt(row.created_at) })}</p>
                </div>
                <StatusPill tone={row.status === 'open' ? 'open' : row.status === 'resolved' ? 'done' : 'muted'}>
                  {(REPORT_STATUSES as readonly string[]).includes(row.status) ? t(`reports.statuses.${row.status as ReportStatus}`) : row.status}
                </StatusPill>
              </div>
              <div className="mt-2">
                <ItemLink id={row.public_item_id} title={row.public_item_id ? q.data?.titles[row.public_item_id] : undefined} />
              </div>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{row.note || <span className="italic text-ink-soft">{t('common.noNote')}</span>}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {nextReportStatuses(row.status).map((s) => (
                  <Button key={s} variant={s === 'resolved' ? 'primary' : 'secondary'} loading={busy === row.id} disabled={busy !== null} onClick={() => void setStatus(row, s)}>
                    {t(`reports.actions.${s}`)}
                  </Button>
                ))}
              </div>
              {row.public_item_id && (
                <TakedownForm
                  itemId={row.public_item_id}
                  // admin_withdraw_public resolves the item's open reports itself (reports survive the item since 0600).
                  onDone={async () => q.reload()}
                />
              )}
            </li>
          ))}
        </ul>
      </ListState>
    </div>
  );
}

const TAKEDOWN_ERRORS = ['forbidden', 'not_found', 'not_authenticated', 'reason_required'] as const;

/** B5/B11: take a reported item off the public hub (reason mandatory, audited by admin_withdraw_public). */
function TakedownForm({ itemId, onDone }: { itemId: string; onDone: () => Promise<void> }) {
  const t = useT('admin');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formId = `takedown-${itemId}`;

  async function submit() {
    const sb = getSupabase();
    if (!sb || busy || !takedownReasonValid(reason)) return;
    setBusy(true);
    setError(null);
    const r = await withdrawPublicItem(sb, itemId, reason);
    if (!r.ok) {
      setBusy(false);
      const code = (TAKEDOWN_ERRORS as readonly string[]).includes(r.code) ? (r.code as (typeof TAKEDOWN_ERRORS)[number]) : 'unknown';
      setError(t(`reports.takedown.errors.${code}`));
      return;
    }
    // Removes the public-audio copy of the withdrawn item (idempotent, best effort).
    void syncPublicAudio();
    toast({ title: t('reports.takedown.done'), tone: 'success' });
    await onDone();
    setBusy(false);
  }

  if (!open) {
    return (
      <Button variant="terracotta" className="mt-3" onClick={() => setOpen(true)} aria-controls={formId} aria-expanded={false} leftIcon={<EyeOff aria-hidden="true" className="size-4" />}>
        {t('reports.takedown.open')}
      </Button>
    );
  }
  return (
    <div id={formId} className="mt-4 rounded-[1.25rem] bg-terracotta/5 p-4 ring-1 ring-terracotta/25 md:p-5">
      <Field label={t('reports.takedown.reasonLabel')} hint={t('reports.takedown.reasonHint')} required>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={TAKEDOWN_REASON_MAX} rows={2} />
      </Field>
      {error && (
        <p role="alert" className="mt-3 text-[0.92rem] font-medium text-terracotta">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button variant="terracotta" loading={busy} disabled={busy || !takedownReasonValid(reason)} onClick={() => void submit()}>
          {t('reports.takedown.confirm')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
          {t('reports.takedown.cancel')}
        </Button>
      </div>
    </div>
  );
}
