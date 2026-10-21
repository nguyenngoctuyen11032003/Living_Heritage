import { CircleCheck } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button, Dialog, Field, Textarea, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { REPORT_REASONS, submitReport, type ReportReason } from '../api';
import type { KnowledgeItem } from '../types';

/** "Báo nội dung cần kiểm tra": works anonymously (reports accepts anon inserts). */
export function ReportDialog({ item, open, onClose }: { item: KnowledgeItem; open: boolean; onClose: () => void }) {
  const t = useT('knowledge');
  const tc = useT('common');
  const { toast } = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState(false);
  const [done, setDone] = useState(false);
  const formId = useId();
  const legendId = useId();

  function close() {
    onClose();
    // Reset after the exit animation so the success state isn't visible on reopen.
    window.setTimeout(() => {
      setReason(null);
      setNote('');
      setError(null);
      setReasonError(false);
      setDone(false);
    }, 250);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason) {
      setReasonError(true);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setError(t('report.error'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitReport(sb, item.id, reason, note);
      setDone(true);
      toast({ title: t('report.success'), tone: 'success' });
    } catch {
      setError(t('report.error'));
    } finally {
      setBusy(false);
    }
  }

  if (item.sample) {
    return (
      <Dialog open={open} onClose={close} title={t('report.title')} size="sm" footer={<Button onClick={close}>{t('sample.simulatedOk')}</Button>}>
        <p className="leading-relaxed text-ink-soft">{t('sample.actionNote')}</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('report.title')}
      description={done ? undefined : t('report.description')}
      footer={
        done ? (
          <Button onClick={close}>{t('sample.simulatedOk')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              {tc('actions.cancel')}
            </Button>
            <Button type="submit" form={formId} loading={busy}>
              {t('report.submit')}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p role="status" className="flex items-start gap-3 rounded-2xl bg-mint/70 p-4 leading-relaxed text-heritage-deep">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t('report.success')}
        </p>
      ) : (
        <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-5 pb-2">
          <fieldset aria-describedby={reasonError ? `${legendId}-err` : undefined}>
            <legend id={legendId} className="text-[0.9rem] font-semibold text-ink">
              {t('report.reason')}
              <span aria-hidden="true" className="ml-0.5 text-terracotta">
                *
              </span>
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 py-2 text-[0.95rem] ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-heritage',
                    reason === r ? 'bg-mint/70 text-heritage-deep ring-heritage' : 'bg-paper ring-line hover:ring-heritage/40',
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setReasonError(false);
                    }}
                    className="size-4 accent-[#214e43]"
                  />
                  {t(`report.reasons.${r}`)}
                </label>
              ))}
            </div>
            {reasonError && (
              <p id={`${legendId}-err`} role="alert" className="mt-2 text-[0.85rem] font-medium text-terracotta">
                {t('report.reasonRequired')}
              </p>
            )}
          </fieldset>
          <Field label={t('report.note')} hint={t('report.noteHint')}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} />
          </Field>
          {error && (
            <p role="alert" className="rounded-2xl bg-terracotta/10 px-4 py-3 text-[0.92rem] font-medium text-terracotta">
              {error}
            </p>
          )}
        </form>
      )}
    </Dialog>
  );
}
