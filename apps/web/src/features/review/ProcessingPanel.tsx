import type { AiErrorCode, JobStatus } from '@lh/shared';
import { AlertCircle, Check, RotateCcw, Sparkles } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

const STEPS = ['queued', 'transcribing', 'drafting'] as const;

export interface ProcessingPanelProps {
  /** null = no job yet (never started). */
  status: JobStatus | null;
  errorCode: AiErrorCode | null;
  retrying: boolean;
  onRetry: () => void;
}

/** AI processing state: three labelled steps, aria-live progress, error with retry (the recording is always kept). */
export function ProcessingPanel({ status, errorCode, retrying, onRetry }: ProcessingPanelProps) {
  const t = useT('review');
  const failed = !retrying && (status === 'error' || errorCode !== null);
  const notStarted = !retrying && status === null && !failed;
  const activeIndex = retrying && (status === null || status === 'error') ? 0 : STEPS.indexOf(status as (typeof STEPS)[number]);
  const live = failed
    ? t(`ai.errors.${errorCode ?? 'internal'}`)
    : status === 'done'
      ? t('processing.steps.done')
      : activeIndex >= 0
        ? `${t('processing.stepOf', { n: activeIndex + 1 })}: ${t(`processing.steps.${STEPS[activeIndex]!}`)}`
        : '';

  return (
    <Card padding="lg" className="mx-auto w-full max-w-2xl">
      <p className="sr-only" role="status" aria-live="polite">
        {live}
      </p>
      {failed ? (
        <div role="alert" className="flex flex-col items-start gap-4">
          <h1 className="flex items-center gap-2 font-serif text-[clamp(1.4rem,4vw,1.6rem)] font-semibold leading-snug text-terracotta">
            <AlertCircle className="size-6 shrink-0" aria-hidden="true" />
            {t('processing.errorTitle')}
          </h1>
          <p className="leading-relaxed">{t(`ai.errors.${errorCode ?? 'internal'}`)}</p>
          <p className="text-ink-soft">{t('processing.errorKept')}</p>
          {errorCode !== 'audio_too_large' && errorCode !== 'forbidden' && (
            <Button size="lg" onClick={onRetry} leftIcon={<RotateCcw className="size-5" aria-hidden="true" />}>
              {t('processing.retry')}
            </Button>
          )}
        </div>
      ) : notStarted ? (
        <div className="flex flex-col items-start gap-4">
          <h1 className="font-serif text-[clamp(1.4rem,4vw,1.6rem)] font-semibold leading-snug text-heritage-deep">{t('processing.readyTitle')}</h1>
          <p className="leading-relaxed">{t('processing.notStarted')}</p>
          <Button size="lg" onClick={onRetry} leftIcon={<Sparkles className="size-5" aria-hidden="true" />}>
            {t('processing.start')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <h1 className="font-serif text-[clamp(1.4rem,4vw,1.6rem)] font-semibold leading-snug text-heritage-deep">{t('processing.title')}</h1>
          <p className="leading-relaxed text-ink-soft">{t('processing.lead')}</p>
          <ol className="flex flex-col gap-3">
            {STEPS.map((s, i) => {
              const state = status === 'done' || i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'todo';
              return (
                <li key={s} className={cn('flex min-h-12 items-center gap-3 rounded-2xl px-4 py-2', state === 'active' ? 'bg-mint/60 font-semibold' : 'bg-cream')} aria-current={state === 'active' ? 'step' : undefined}>
                  <span aria-hidden="true" className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full', state === 'done' ? 'bg-heritage text-cream' : state === 'active' ? 'bg-paper text-heritage' : 'bg-paper text-ink-soft ring-1 ring-line')}>
                    {state === 'done' ? <Check className="size-4" /> : state === 'active' ? <Spinner size="sm" decorative /> : i + 1}
                  </span>
                  <span className={cn(state === 'todo' && 'text-ink-soft')}>{t(`processing.steps.${s}`)}</span>
                </li>
              );
            })}
          </ol>
          {retrying && <p className="text-[0.9rem] text-ink-soft">{t('processing.retrying')}</p>}
        </div>
      )}
    </Card>
  );
}
