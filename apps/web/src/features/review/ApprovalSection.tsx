import { ArrowLeft, CheckCircle2, Share2 } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import type { ApprovalMode } from './approval';

export interface ApprovalSectionProps {
  mode: ApprovalMode;
  canEdit: boolean;
  dirty: boolean;
  consent: boolean;
  onConsentChange: (next: boolean) => void;
  /** The narrator just confirmed in this session: show the success panel (with the single "share" CTA). */
  justApproved: boolean;
  /** Formatted approval date, when approved. */
  approvedAt: string | null;
  onShare: () => void;
  onBackToSource: () => void;
  /** id given to the explanation the sticky bar's primary button points at (aria-describedby). */
  describedById: string;
  narratorMode?: boolean;
}

/**
 * The final "Duyệt" step at the end of the page flow (DỰ ÁN.md B8): the narrator question, the assisted-consent
 * explainer + checkbox, the success panel and the secondary actions. The primary action itself sits in the slim ApprovalBar.
 */
export function ApprovalSection(props: ApprovalSectionProps) {
  const { mode, canEdit, dirty, consent, onConsentChange, justApproved, approvedAt, onShare, onBackToSource, describedById, narratorMode } = props;
  const t = useT('review');
  const consentId = useId();
  const successRef = useRef<HTMLDivElement>(null);
  const success = justApproved && mode === 'approved';

  // The confirm button sits in the bar: bring the success panel (and its next step) into view and announce it.
  useEffect(() => {
    if (!success) return;
    const el = successRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  }, [success]);

  if (success) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="flex flex-col items-start gap-3 rounded-[2rem] bg-mint px-6 py-7 ring-1 ring-heritage/20 focus:outline-none md:px-10"
      >
        <p className="flex items-center gap-2 font-serif text-[1.35rem] font-semibold text-heritage-deep">
          <CheckCircle2 className="size-6" aria-hidden="true" />
          {t('approval.successTitle')}
        </p>
        <p>{t('approval.successBody')}</p>
        <Button size="lg" onClick={onShare} leftIcon={<Share2 className="size-5" aria-hidden="true" />}>
          {t('approval.nextStep')}
        </Button>
      </div>
    );
  }

  const note = 'text-[0.92rem] leading-relaxed text-ink-soft';
  let body: ReactNode;
  switch (mode) {
    case 'narrator_confirm':
      body = (
        <>
          <p id={describedById} className={cn('font-serif font-semibold leading-snug text-heritage-deep', narratorMode ? 'text-[1.45rem]' : 'text-[1.3rem]')}>
            {t('approval.question')}
          </p>
          <p className={dirty ? 'font-semibold text-terracotta' : note}>{dirty ? t('approval.saveFirst') : t('approval.confirmHint')}</p>
        </>
      );
      break;
    case 'assisted':
      body = (
        <>
          <p className="font-semibold text-heritage-deep">{t('approval.assistedTitle')}</p>
          <p id={!dirty && consent ? describedById : undefined} className={note}>
            {t('approval.assistedLead')}
          </p>
          <label htmlFor={consentId} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl bg-paper p-3 text-[0.95rem] ring-1 ring-line">
            <input id={consentId} type="checkbox" checked={consent} onChange={(e) => onConsentChange(e.target.checked)} className="mt-1 size-5 shrink-0 accent-heritage" />
            <span>{t('approval.assistedConsent')}</span>
          </label>
          {dirty ? (
            <p id={describedById} className="text-[0.88rem] font-semibold text-terracotta">
              {t('approval.saveFirst')}
            </p>
          ) : (
            !consent && (
              <p id={describedById} className="text-[0.85rem] text-ink-soft">
                {t('approval.assistedNeedConsent')}
              </p>
            )
          )}
        </>
      );
      break;
    case 'send_to_narrator':
      body = (
        <>
          <p className="font-semibold text-heritage-deep">{t('approval.sendTitle')}</p>
          <p id={describedById} className={note}>
            {t('approval.sendLead')}
          </p>
        </>
      );
      break;
    case 'approved':
      body = (
        <>
          <p className="inline-flex items-center gap-2 font-semibold text-heritage">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            {t('approval.alreadyApproved')}
          </p>
          {approvedAt && <p className={note}>{t('approval.approvedAt', { date: approvedAt })}</p>}
          <div>
            <Button onClick={onShare} leftIcon={<Share2 className="size-5" aria-hidden="true" />}>
              {t('approval.nextStep')}
            </Button>
          </div>
        </>
      );
      break;
    default:
      body = <p className={note}>{t('approval.viewerNote')}</p>;
  }

  return (
    <section aria-labelledby="approval-heading" className="flex flex-col gap-4 rounded-[2rem] bg-mint/45 px-6 py-7 ring-1 ring-heritage/15 md:px-10">
      <div>
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-terracotta">{t('approval.finalStep')}</p>
        <h2 id="approval-heading" className="mt-1 font-serif text-[1.35rem] font-semibold text-heritage-deep">
          {t('approval.sectionTitle')}
        </h2>
      </div>
      {body}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-heritage/15 pt-4">
        <Button variant="ghost" onClick={onBackToSource} leftIcon={<ArrowLeft className="size-5" aria-hidden="true" />}>
          {t('approval.backToSource')}
        </Button>
        {canEdit && mode !== 'send_to_narrator' && mode !== 'read_only' && <p className="max-w-md text-[0.82rem] text-ink-soft">{t('editor.saveNeedsApproval')}</p>}
      </div>
    </section>
  );
}
