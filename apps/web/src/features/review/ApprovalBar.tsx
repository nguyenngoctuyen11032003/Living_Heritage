import { CheckCircle2, Save, Send, Share2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import type { ApprovalMode } from './approval';

export interface ApprovalBarProps {
  mode: ApprovalMode;
  canEdit: boolean;
  dirty: boolean;
  /** pending_review with nothing new to send. */
  waiting: boolean;
  busy: null | 'save' | 'approve';
  onSave: () => void;
  onApprove: (assisted: boolean) => void;
  onShare: () => void;
  narratorMode?: boolean;
}

/** Sticky action bar (never covered by the player, which stays in the page flow). */
export function ApprovalBar({ mode, canEdit, dirty, waiting, busy, onSave, onApprove, onShare, narratorMode }: ApprovalBarProps) {
  const t = useT('review');
  const [consent, setConsent] = useState(false);
  const consentId = useId();
  const size = narratorMode ? 'lg' : 'md';

  const saveStatus = canEdit && (
    <p className={cn('text-[0.88rem]', dirty ? 'font-semibold text-terracotta' : 'text-ink-soft')} aria-live="polite">
      {dirty ? t('editor.unsaved') : t('editor.allSaved')}
    </p>
  );

  return (
    <div
      className={cn(
        // Compact bars stay pinned on phones too; the taller assisted/editor bars pin from lg up only.
        mode === 'narrator_confirm' || mode === 'approved' || mode === 'read_only' ? 'sticky' : 'lg:sticky',
        'bottom-0 z-20 -mx-4 mt-8 border-t border-line bg-paper/95 px-4 py-4 shadow-[0_-12px_30px_-24px_rgba(18,27,24,0.5)] backdrop-blur md:-mx-8 md:px-8',
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {canEdit && mode !== 'send_to_narrator' && (
          <div className="flex flex-col gap-1">
            {saveStatus}
            <div>
              <Button variant="secondary" size={size} onClick={onSave} disabled={!dirty} loading={busy === 'save'} leftIcon={<Save className="size-5" aria-hidden="true" />}>
                {busy === 'save' ? t('editor.saving') : t('editor.save')}
              </Button>
            </div>
            <p className="max-w-sm text-[0.8rem] text-ink-soft">{t('editor.saveNeedsApproval')}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 lg:max-w-xl lg:items-end lg:text-right">
          {mode === 'approved' && (
            <>
              <p className="inline-flex items-center gap-2 font-semibold text-heritage">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                {t('approval.alreadyApproved')}
              </p>
              <Button size={size} onClick={onShare} leftIcon={<Share2 className="size-5" aria-hidden="true" />}>
                {t('approval.nextStep')}
              </Button>
            </>
          )}

          {mode === 'narrator_confirm' && (
            <>
              <p className="font-serif text-[1.2rem] font-semibold text-heritage-deep">{t('approval.question')}</p>
              <Button size="xl" onClick={() => onApprove(false)} disabled={dirty} loading={busy === 'approve'} leftIcon={<CheckCircle2 className="size-6" aria-hidden="true" />}>
                {busy === 'approve' ? t('approval.confirming') : t('approval.confirm')}
              </Button>
              {dirty && <p className="text-[0.88rem] text-terracotta">{t('approval.saveFirst')}</p>}
            </>
          )}

          {mode === 'assisted' && (
            <>
              <p className="font-semibold text-heritage-deep">{t('approval.assistedTitle')}</p>
              <p className="text-[0.9rem] text-ink-soft">{t('approval.assistedLead')}</p>
              <label htmlFor={consentId} className="flex min-h-12 cursor-pointer items-start gap-3 text-left text-[0.95rem]">
                <input id={consentId} type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 shrink-0 accent-heritage" />
                <span>{t('approval.assistedConsent')}</span>
              </label>
              <div>
                <Button size={size} onClick={() => onApprove(true)} disabled={!consent || dirty} loading={busy === 'approve'} leftIcon={<CheckCircle2 className="size-5" aria-hidden="true" />}>
                  {t('approval.assistedButton')}
                </Button>
              </div>
              {dirty ? (
                <p className="text-[0.88rem] text-terracotta">{t('approval.saveFirst')}</p>
              ) : (
                !consent && <p className="text-[0.85rem] text-ink-soft">{t('approval.assistedNeedConsent')}</p>
              )}
            </>
          )}

          {mode === 'send_to_narrator' && (
            <>
              {saveStatus}
              <p className="font-semibold text-heritage-deep">{t('approval.sendTitle')}</p>
              <p className="text-[0.9rem] text-ink-soft">{t('approval.sendLead')}</p>
              {waiting && !dirty ? (
                <p className="font-semibold text-ink" role="status">
                  {t('approval.waiting')}
                </p>
              ) : (
                <div>
                  <Button size={size} onClick={onSave} loading={busy === 'save'} leftIcon={<Send className="size-5" aria-hidden="true" />}>
                    {t('approval.sendButton')}
                  </Button>
                </div>
              )}
            </>
          )}

          {mode === 'read_only' && <p className="text-ink-soft">{t('approval.viewerNote')}</p>}
        </div>
      </div>
    </div>
  );
}
