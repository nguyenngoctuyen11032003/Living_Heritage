import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { DELETION_STATUSES, DELETION_UNRESOLVED, deletionScope, nextDeletionStatuses, resolutionPatch, type DeletionScope, type DeletionStatus } from '../access';
import { confirmMatches, EraseError, invokeErase, type EraseResult } from '../adminApi';
import { useDateTime } from '../format';
import { ListHeader, ListState, StatusPill } from '../shared';
import { must, useAdminQuery } from '../useAdminQuery';

interface DeletionRow {
  id: string;
  /** Null once the whole family was erased (the request is kept). */
  family_id: string | null;
  /** story / family / account, fixed at insert (migration 20261022000600). */
  scope?: string | null;
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
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    return must(await query);
  };
}

export function DeletionTab() {
  const t = useT('admin');
  const [filter, setFilter] = useState<'all' | DeletionStatus>('all');
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
              onChanged={(updated, keep) =>
                q.setData((prev) => (keep || filter === 'all' || updated.status === filter ? prev.map((r) => (r.id === row.id ? updated : r)) : prev.filter((r) => r.id !== row.id)))
              }
            />
          ))}
        </ul>
      </ListState>
    </div>
  );
}

function DeletionCard({ row, onChanged }: { row: DeletionRow; onChanged: (r: DeletionRow, keep?: boolean) => void }) {
  const t = useT('admin');
  const dt = useDateTime();
  const { toast } = useToast();
  const { user } = useSession();
  const [note, setNote] = useState(row.admin_note ?? '');
  const [busy, setBusy] = useState(false);
  const [erase, setErase] = useState<EraseResult | null>(null);

  function onErased(r: EraseResult) {
    setErase(r);
    // The DB step marks the request done (resolved now); keep the card until the list is refreshed.
    if (row.status !== 'done') onChanged({ ...row, status: 'done', resolved_at: new Date().toISOString() }, true);
  }

  async function setStatus(status: DeletionStatus) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const patch = { ...resolutionPatch(status, DELETION_UNRESOLVED, user?.id ?? null), admin_note: note.trim() || null };
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
  const scope = deletionScope(row);
  return (
    <li className="rounded-2xl bg-paper p-5 ring-1 ring-line md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 text-[0.9rem] text-ink-soft">
          <p className="font-semibold text-ink">{scope === 'story' ? (row.story_id ? t('deletion.story', { id: row.story_id.slice(0, 8) }) : t('deletion.storyErased')) : t(`deletion.scopes.${scope}`)}</p>
          {row.family_id && <p className="mt-0.5">{t('deletion.family', { id: row.family_id.slice(0, 8) })}</p>}
          <p className="mt-0.5">{t('common.at', { time: dt(row.created_at) })}</p>
          {row.resolved_at && <p className="mt-0.5">{t('deletion.resolvedAt', { time: dt(row.resolved_at) })}</p>}
        </div>
        <StatusPill tone={row.status === 'open' || row.status === 'processing' ? 'open' : row.status === 'done' ? 'done' : 'muted'}>
          {known ? t(`deletion.statuses.${row.status as DeletionStatus}`) : row.status}
        </StatusPill>
      </div>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{row.reason || <span className="italic text-ink-soft">{t('deletion.noReason')}</span>}</p>
      <Field label={t('deletion.adminNote')} hint={t('deletion.adminNoteHint')} className="mt-4">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} />
      </Field>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {nextDeletionStatuses(row.status, scope).map((s) => (
          <Button key={s} variant={s === 'processing' && row.status === 'open' ? 'primary' : s === 'rejected' ? 'terracotta' : 'secondary'} loading={busy} disabled={busy} onClick={() => void setStatus(s)}>
            {t(`deletion.actions.${s}`)}
          </Button>
        ))}
      </div>
      {scope === 'account' && row.status === 'processing' && <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-[0.92rem] leading-relaxed text-ink">{t('deletion.erase.accountManual')}</p>}
      {scope !== 'account' && (row.status === 'processing' || row.status === 'done' || erase) ? <ErasePanel row={row} scope={scope} result={erase} onResult={onErased} /> : null}
    </li>
  );
}

/** B12: irreversible erase through the `admin-erase` Edge Function, behind a typed confirmation. */
function ErasePanel({ row, scope, result, onResult }: { row: DeletionRow; scope: DeletionScope; result: EraseResult | null; onResult: (r: EraseResult) => void }) {
  const t = useT('admin');
  const { toast } = useToast();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const word = t('deletion.erase.word');
  // Once the DB step is done a file retry needs no second confirmation (the call is idempotent).
  const erased = result !== null || row.status === 'done';
  const confirmed = erased || confirmMatches(typed, word);
  const inputId = `erase-confirm-${row.id}`;

  async function run() {
    const sb = getSupabase();
    if (!sb || busy || !confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const r = await invokeErase(sb, row.id);
      onResult(r);
      toast({ title: t(`deletion.erase.result.${r.outcome}`, { removed: r.removed, failed: r.failed, skipped: r.skipped }), tone: r.outcome === 'complete' ? 'success' : 'info' });
    } catch (e) {
      setError(t(`deletion.erase.errors.${e instanceof EraseError ? e.code : 'internal'}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="mt-5 rounded-[1.25rem] bg-terracotta/5 p-4 ring-1 ring-terracotta/25 md:p-5">
      <h4 id={`${inputId}-title`} className="font-semibold text-terracotta">
        {t('deletion.erase.title')}
      </h4>
      {result ? (
        <p role="status" className="mt-2 leading-relaxed text-ink">
          {t(`deletion.erase.result.${result.outcome}`, { removed: result.removed, failed: result.failed, skipped: result.skipped })}
        </p>
      ) : erased ? (
        <p className="mt-2 text-[0.92rem] leading-relaxed text-ink">{t('deletion.erase.alreadyErased')}</p>
      ) : (
        <>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-ink">{scope === 'story' ? t('deletion.erase.scopeStory') : t('deletion.erase.scopeFamily')}</p>
          <Field id={inputId} label={t('deletion.erase.confirmLabel', { word })} className="mt-3 max-w-xs">
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[0.92rem] font-medium text-terracotta">
          {error}
        </p>
      )}
      {(!result || result.outcome === 'retry') && (
        <Button variant="terracotta" className="mt-4" loading={busy} disabled={busy || !confirmed} onClick={() => void run()} leftIcon={<Trash2 aria-hidden="true" className="size-4" />}>
          {erased ? t('deletion.erase.retry') : t('deletion.erase.run')}
        </Button>
      )}
    </section>
  );
}
