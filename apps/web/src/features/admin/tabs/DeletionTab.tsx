import { useState } from 'react';
import { Button, Field, Select, Textarea, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { DELETION_STATUSES, nextDeletionStatuses, resolutionPatch, type DeletionStatus } from '../access';
import { useDateTime } from '../format';
import { ListHeader, ListState, StatusPill } from '../shared';
import { must, useAdminQuery } from '../useAdminQuery';

interface DeletionRow {
  id: string;
  family_id: string;
  story_id: string | null;
  reason: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

function loader(filter: string) {
  return async (sb: Supabase): Promise<DeletionRow[]> => {
    let query = sb
      .from('deletion_requests')
      .select('id, family_id, story_id, reason, status, admin_note, created_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    return must(await query);
  };
}

export function DeletionTab() {
  const t = useT('admin');
  const [filter, setFilter] = useState<'all' | DeletionStatus>('open');
  const q = useAdminQuery(`deletion:${filter}`, loader(filter));
  const rows = q.data ?? [];

  return (
    <div>
      <ListHeader count={q.status === 'ready' ? rows.length : null} onRefresh={q.reload} loading={q.status === 'loading'}>
        <Field label={t('common.filterStatus')} className="w-56">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">{t('common.all')}</option>
            {DELETION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`deletion.statuses.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </ListHeader>
      <ListState status={q.status} empty={rows.length === 0} emptyTitle={t('deletion.emptyTitle')} emptyBody={t('deletion.emptyBody')} onRetry={q.reload}>
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <DeletionCard
              key={row.id}
              row={row}
              onChanged={(updated) =>
                q.setData((prev) => (filter === 'all' || updated.status === filter ? prev.map((r) => (r.id === row.id ? updated : r)) : prev.filter((r) => r.id !== row.id)))
              }
            />
          ))}
        </ul>
      </ListState>
    </div>
  );
}

function DeletionCard({ row, onChanged }: { row: DeletionRow; onChanged: (r: DeletionRow) => void }) {
  const t = useT('admin');
  const dt = useDateTime();
  const { toast } = useToast();
  const { user } = useSession();
  const [note, setNote] = useState(row.admin_note ?? '');
  const [busy, setBusy] = useState(false);

  async function setStatus(status: DeletionStatus) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const patch = { ...resolutionPatch(status, 'open', user?.id ?? null), admin_note: note.trim() || null };
    const { error } = await sb.from('deletion_requests').update(patch).eq('id', row.id);
    setBusy(false);
    if (error) {
      toast({ title: t('common.updateError'), tone: 'error' });
      return;
    }
    toast({ title: t('common.updated'), tone: 'success' });
    onChanged({ ...row, status, admin_note: patch.admin_note, resolved_at: patch.resolved_at });
  }

  const known = (DELETION_STATUSES as readonly string[]).includes(row.status);
  return (
    <li className="rounded-[1.5rem] bg-paper p-5 ring-1 ring-line md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 text-[0.9rem] text-ink-soft">
          <p className="font-semibold text-ink">{row.story_id ? t('deletion.story', { id: row.story_id.slice(0, 8) }) : t('deletion.noStory')}</p>
          <p className="mt-0.5">{t('deletion.family', { id: row.family_id.slice(0, 8) })}</p>
          <p className="mt-0.5">{t('common.at', { time: dt(row.created_at) })}</p>
          {row.resolved_at && <p className="mt-0.5">{t('deletion.resolvedAt', { time: dt(row.resolved_at) })}</p>}
        </div>
        <StatusPill tone={row.status === 'open' ? 'open' : row.status === 'done' ? 'done' : 'muted'}>
          {known ? t(`deletion.statuses.${row.status as DeletionStatus}`) : row.status}
        </StatusPill>
      </div>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{row.reason || <span className="italic text-ink-soft">{t('deletion.noReason')}</span>}</p>
      <Field label={t('deletion.adminNote')} hint={t('deletion.adminNoteHint')} className="mt-4">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} />
      </Field>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {nextDeletionStatuses(row.status).map((s) => (
          <Button key={s} variant={s === 'done' ? 'primary' : s === 'rejected' ? 'terracotta' : 'secondary'} loading={busy} disabled={busy} onClick={() => void setStatus(s)}>
            {t(`deletion.actions.${s}`)}
          </Button>
        ))}
      </div>
    </li>
  );
}
