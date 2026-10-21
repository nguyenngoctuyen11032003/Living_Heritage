import { CheckCircle2, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';
import type { ApprovalMode } from './approval';

export interface ApprovalBarProps {
  mode: ApprovalMode;
  canEdit: boolean;
  dirty: boolean;
  /** pending_review with nothing new to send. */
  waiting: boolean;
  busy: null | 'save' | 'approve';
  /** Assisted mode: the narrator's consent checkbox (rendered in the approval section) is ticked. */
  consent: boolean;
  onSave: () => void;
  onApprove: (assisted: boolean) => void;
  /** id of the explanation in the approval section (the narrator question / the consent hint). */
  describedBy?: string;
  narratorMode?: boolean;
  /** Desktop: rendered inside the draft column (no bleed to the page edges, rounded, no top margin). */
  inColumn?: boolean;
}

/**
 * Slim sticky bar: save state + the single primary action of the moment (one row, ≤ 72px tall on phones).
 * Explanations, the narrator question and the consent checkbox live in the page flow (ApprovalSection).
 */
export function ApprovalBar({ mode, canEdit, dirty, waiting, busy, consent, onSave, onApprove, describedBy, narratorMode, inColumn }: ApprovalBarProps) {
  const t = useT('review');
  if (mode === 'read_only') return null;
  const size = narratorMode ? 'lg' : 'md';

  let primary: ReactNode = null;
  if (mode === 'send_to_narrator') {
    if (!(waiting && !dirty))
      primary = (
        <Button size={size} onClick={onSave} loading={busy === 'save'} aria-describedby={describedBy} leftIcon={<Send className="size-5" aria-hidden="true" />}>
          {t('approval.sendButton')}
        </Button>
      );
  } else if (dirty && canEdit) {
    primary = (
      <Button size={size} onClick={onSave} loading={busy === 'save'} leftIcon={<Save className="size-5" aria-hidden="true" />}>
        {busy === 'save' ? t('editor.saving') : t('editor.save')}
      </Button>
    );
  } else if (mode === 'narrator_confirm') {
    primary = (
      <Button size={size} onClick={() => onApprove(false)} loading={busy === 'approve'} aria-describedby={describedBy} leftIcon={<CheckCircle2 className="size-5" aria-hidden="true" />}>
        {busy === 'approve' ? t('approval.confirming') : t('approval.confirm')}
      </Button>
    );
  } else if (mode === 'assisted') {
    primary = (
      <Button
        size={size}
        onClick={() => onApprove(true)}
        disabled={!consent}
        loading={busy === 'approve'}
        aria-describedby={describedBy}
        leftIcon={<CheckCircle2 className="size-5" aria-hidden="true" />}
      >
        {t('approval.assistedButton')}
      </Button>
    );
  }

  let status: ReactNode;
  if (dirty && canEdit) status = <span className="font-semibold text-terracotta">{t('editor.unsaved')}</span>;
  else if (mode === 'approved')
    status = (
      <span className="inline-flex items-center gap-1.5 font-semibold text-heritage">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        {t('status.approved')}
      </span>
    );
  else if (mode === 'send_to_narrator' && waiting) status = <span className="font-semibold text-ink">{t('approval.waiting')}</span>;
  // Low-value "all saved" note: dropped on phones whenever a primary button needs the row (it was clipped at 360px).
  else if (canEdit && !primary) status = <span className="text-ink-soft">{t('editor.allSaved')}</span>;
  else if (canEdit) status = <span className="hidden text-ink-soft sm:inline">{t('editor.allSaved')}</span>;
  else status = null;

  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 border-t border-line bg-paper pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-24px_rgba(18,27,24,0.5)]',
        inColumn ? 'rounded-t-[1.5rem] px-6 ring-1 ring-line/70' : '-mx-4 mt-8 px-4 md:-mx-8 md:px-8',
      )}
    >
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3">
        <p className="min-w-0 text-[0.85rem] leading-snug line-clamp-2" aria-live="polite">
          {status}
        </p>
        {primary && <div className="flex max-w-[68%] shrink-0 justify-end text-balance">{primary}</div>}
      </div>
    </div>
  );
}
