import { Check, DatabaseZap, Eye, EyeOff, Headphones, Info, X } from 'lucide-react';
import { useState } from 'react';
import type { Database } from '@lh/shared';
import { Button, Field, Spinner, Textarea, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { ItemBody, SourceBox } from '@/features/knowledge/components/ItemBody';
import { fromPublicRow, type KnowledgeItem, type PublicItemRow } from '@/features/knowledge/types';
import { reviewErrorCode } from '../access';
import { useDateTime } from '../format';
import { HubLink, ListHeader, ListState, StatusPill } from '../shared';
import { must, useAdminQuery } from '../useAdminQuery';
import { syncPublicAudio } from '@/lib/publicAudio';
import { reindexKnowledge } from '@/features/knowledge/ask';

type EditStatus = Database['public']['Enums']['edit_status'];

interface PendingRow {
  id: string;
  story_id: string;
  requested_at: string;
  story: { title: string; kind: 'story' | 'experience'; edit_status: EditStatus } | null;
}

interface Handled {
  requestId: string;
  title: string;
  approved: boolean;
  audio: 'sync' | 'none' | null;
}

async function loadPending(sb: NonNullable<ReturnType<typeof getSupabase>>): Promise<PendingRow[]> {
  const reqs = must(
    await sb.from('publish_requests').select('id, story_id, requested_at').eq('status', 'pending').order('requested_at', { ascending: true }).limit(100),
  );
  const ids = reqs.map((r) => r.story_id);
  const stories = ids.length ? must(await sb.from('stories').select('id, title, kind, edit_status').in('id', ids)) : [];
  const byId = new Map(stories.map((s) => [s.id, s]));
  return reqs.map((r) => {
    const s = byId.get(r.story_id);
    return { ...r, story: s ? { title: s.title, kind: s.kind, edit_status: s.edit_status } : null };
  });
}

export function PublishTab() {
  const t = useT('admin');
  const q = useAdminQuery('publish', loadPending);
  const [handled, setHandled] = useState<Handled[]>([]);
  const rows = q.data ?? [];

  return (
    <div>
      <p className="mb-6 flex items-start gap-3 rounded-2xl bg-warning-bg px-5 py-4 text-[0.92rem] leading-relaxed text-warning-fg ring-1 ring-warning-line">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {t('publish.audioNotice')}
      </p>
      {handled.length > 0 && (
        <section aria-labelledby="handled-title" className="mb-8 rounded-2xl bg-paper p-5 ring-1 ring-line">
          <h3 id="handled-title" className="font-serif text-[1.1rem] font-semibold text-heritage-deep">
            {t('publish.recent')}
          </h3>
          <ul className="mt-3 divide-y divide-line/70" aria-live="polite">
            {handled.map((h) => (
              <li key={h.requestId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0 font-semibold text-ink">“{h.title}”</span>
                <span className="flex flex-wrap gap-2">
                  <StatusPill tone={h.approved ? 'done' : 'muted'}>{h.approved ? t('publish.approved') : t('publish.rejected')}</StatusPill>
                  {h.approved && h.audio && (
                    <StatusPill tone={h.audio === 'sync' ? 'open' : 'muted'}>{h.audio === 'sync' ? t('publish.audioSync') : t('publish.audioNone')}</StatusPill>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ReindexPanel />
      <ListHeader count={q.status === 'ready' ? rows.length : null} onRefresh={q.reload} loading={q.status === 'loading'} />
      <ListState status={q.status} empty={rows.length === 0} emptyTitle={t('publish.emptyTitle')} emptyBody={t('publish.emptyBody')} emptyAction={<HubLink />} onRetry={q.reload}>
        <ul className="flex flex-col gap-5">
          {rows.map((row) => (
            <PendingCard
              key={row.id}
              row={row}
              onDone={(h) => {
                setHandled((prev) => [h, ...prev]);
                q.setData((prev) => prev.filter((r) => r.id !== row.id));
              }}
            />
          ))}
        </ul>
      </ListState>
    </div>
  );
}

function PendingCard({ row, onDone }: { row: PendingRow; onDone: (h: Handled) => void }) {
  const t = useT('admin');
  const tk = useT('knowledge');
  const dt = useDateTime();
  const { toast } = useToast();
  const [preview, setPreview] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; item: KnowledgeItem | null }>({ status: 'idle', item: null });
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const title = row.story?.title ?? t('publish.storyHidden');

  async function togglePreview() {
    const next = !open;
    setOpen(next);
    if (!next || preview.status === 'ready' || preview.status === 'loading') return;
    const sb = getSupabase();
    if (!sb) return;
    setPreview({ status: 'loading', item: null });
    const { data, error: err } = await sb.rpc('preview_public_item', { p_story: row.story_id });
    if (err || !data || typeof data !== 'object' || Array.isArray(data)) {
      setPreview({ status: 'error', item: null });
      return;
    }
    setPreview({ status: 'ready', item: fromPublicRow(data as unknown as Partial<PublicItemRow>, 'preview') });
  }

  async function review(approve: boolean) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(approve ? 'approve' : 'reject');
    setError(null);
    const { data: itemId, error: err } = await sb.rpc('review_publish', { p_request: row.id, p_approve: approve, p_note: note.trim() || undefined });
    if (err) {
      setBusy(null);
      setError(t(`publish.errors.${reviewErrorCode(err.message)}`));
      return;
    }
    let audio: Handled['audio'] = null;
    if (approve && itemId) {
      const { data: item } = await sb.from('public_items').select('audio_allowed, audio_path').eq('id', itemId).maybeSingle();
      if (item) audio = item.audio_allowed && item.audio_path ? 'sync' : 'none';
      if (audio === 'sync') void syncPublicAudio();
      // Best effort: index the new public item for the Q&A assistant (it also self-heals on the next question).
      void reindexKnowledge();
    }
    setBusy(null);
    toast({ title: approve ? t('publish.approved') : t('publish.rejected'), tone: 'success' });
    onDone({ requestId: row.id, title, approved: approve, audio });
  }

  const previewId = `preview-${row.id}`;
  return (
    <li className="rounded-2xl bg-paper p-5 ring-1 ring-line md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-terracotta">
            {row.story ? tk(`kinds.${row.story.kind}`) : '—'}
            <span className="font-normal normal-case tracking-normal text-ink-soft"> · {t('publish.requestedAt', { time: dt(row.requested_at) })}</span>
          </p>
          <h3 className="mt-2 font-serif text-[1.3rem] font-semibold leading-snug text-heritage-deep">{row.story ? `“${title}”` : title}</h3>
        </div>
        {row.story && (
          <StatusPill tone={row.story.edit_status === 'approved' ? 'done' : 'open'}>{t(`publish.editStatus.${row.story.edit_status}`)}</StatusPill>
        )}
      </div>

      <Button
        variant="secondary"
        className="mt-4"
        onClick={() => void togglePreview()}
        aria-expanded={open}
        aria-controls={previewId}
        leftIcon={open ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
      >
        {open ? t('publish.hidePreview') : t('publish.preview')}
      </Button>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">{t('publish.previewLogged')}</p>

      {open && (
        <div id={previewId} className="mt-5 rounded-[1.25rem] border border-dashed border-heritage/30 bg-cream p-5 md:p-7">
          <p className="text-[0.8125rem] font-bold uppercase tracking-[0.16em] text-heritage">{t('publish.previewTitle')}</p>
          {preview.status === 'loading' && (
            <p className="mt-3 flex items-center gap-2 text-ink-soft" role="status">
              <Spinner size="sm" decorative />
              {t('publish.previewLoading')}
            </p>
          )}
          {preview.status === 'error' && (
            <p role="alert" className="mt-3 font-medium text-terracotta">
              {t('publish.previewError')}
            </p>
          )}
          {preview.item && (
            <div className="mt-3">
              <h4 className="font-serif text-[1.5rem] font-semibold leading-snug text-heritage-deep">“{preview.item.title}”</h4>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.9rem] text-ink-soft">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 font-semibold ring-1 ring-line">
                  <Headphones aria-hidden="true" className="size-3.5" />
                  {preview.item.audioAllowed ? t('publish.audioYes') : t('publish.audioNo')}
                </span>
              </p>
              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
                <ItemBody item={preview.item} headingLevel="h3" />
                <SourceBox item={preview.item} headingLevel="h3" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-line/70 pt-5">
        <Field label={t('publish.noteLabel')} hint={t('publish.noteHint')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} />
        </Field>
        {error && (
          <p role="alert" className="mt-3 rounded-2xl bg-terracotta/10 px-4 py-3 text-[0.92rem] font-medium text-terracotta">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => void review(true)} loading={busy === 'approve'} disabled={busy !== null || !row.story} leftIcon={<Check aria-hidden="true" className="size-4" />}>
            {t('publish.approve')}
          </Button>
          <Button variant="terracotta" onClick={() => void review(false)} loading={busy === 'reject'} disabled={busy !== null} leftIcon={<X aria-hidden="true" className="size-4" />}>
            {t('publish.reject')}
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Embeds public items that have no AI search embedding yet (knowledge-ask reindex, admin only). */
function ReindexPanel() {
  const t = useT('admin');
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function run() {
    setBusy(true);
    setStatus('');
    const r = await reindexKnowledge();
    setBusy(false);
    if (!r) {
      setStatus(t('publish.reindexError'));
      toast({ title: t('publish.reindexError'), tone: 'error' });
      return;
    }
    const parts = [r.embedded > 0 ? t('publish.reindexDone', { n: r.embedded }) : r.remaining === 0 ? t('publish.reindexUpToDate') : ''];
    if (r.failed > 0) parts.push(t('publish.reindexFailed', { n: r.failed }));
    if (r.remaining > 0) parts.push(t('publish.reindexRemaining', { n: r.remaining }));
    const msg = parts.filter(Boolean).join(' ');
    setStatus(msg);
    toast({ title: msg, tone: r.failed > 0 ? 'info' : 'success' });
  }

  return (
    <div className="mb-6 rounded-2xl bg-paper p-5 ring-1 ring-line md:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button variant="secondary" onClick={() => void run()} loading={busy} leftIcon={<DatabaseZap aria-hidden="true" className="size-4" />} className="max-w-full">
          {t('publish.reindex')}
        </Button>
        <p aria-live="polite" className="min-w-0 flex-1 basis-56 text-[0.9rem] font-medium leading-snug text-heritage-deep">
          {status}
        </p>
      </div>
      <p className="mt-3 max-w-2xl text-[0.9rem] leading-relaxed text-ink-soft">{t('publish.reindexHint')}</p>
    </div>
  );
}
