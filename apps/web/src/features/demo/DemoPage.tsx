// /trai-nghiem: the 3-minute storytelling walkthrough (B1/B18, NT01). Fully in memory: no API call, no upload;
// progress lives in sessionStorage so a refresh keeps the visitor's place.
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Button, ButtonLink, Dialog } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { ConfirmStep, DraftStep, ListenStep, NARRATOR_TEXT, ScopeStep, TopicStep, TranscriptStep, type StepProps } from './NarratorSteps';
import { canEnter, clearState, JOURNEY, journeyIndex, loadState, NARRATOR_STEPS, previousStep, reducer, saveState, type Step } from './state';
import { BookStep, StoryStep, VaultStep } from './VaultViews';

const VIEWS: Record<Step, (p: StepProps) => React.ReactNode> = {
  topic: TopicStep,
  listen: ListenStep,
  transcript: TranscriptStep,
  draft: DraftStep,
  confirm: ConfirmStep,
  scope: ScopeStep,
  vault: VaultStep,
  story: StoryStep,
  book: BookStep,
};

function Progress({ step, onGo, can }: { step: Step; onGo: (s: Step) => void; can: (s: Step) => boolean }) {
  const t = useT('demo');
  const at = journeyIndex(step);
  return (
    <nav aria-label={t('progress.label')} className="flex flex-col gap-3">
      <p className="font-semibold text-heritage-deep">
        {t('progress.count', { n: at + 1, total: JOURNEY.length })} · {t(`progress.names.${JOURNEY[at]!}`)}
      </p>
      <ol className="hidden flex-wrap gap-2 md:flex">
        {JOURNEY.map((s, i) => {
          const current = i === at;
          const done = i < at;
          const label = `${i + 1}. ${t(`progress.names.${s}`)}`;
          return (
            <li key={s}>
              {current || !can(s) ? (
                <span
                  aria-current={current ? 'step' : undefined}
                  className={cn('inline-flex min-h-11 items-center rounded-full px-4 text-[0.9rem] font-semibold', current ? 'bg-heritage text-cream' : 'bg-paper text-ink-soft ring-1 ring-line')}
                >
                  {label}
                </span>
              ) : (
                <button type="button" onClick={() => onGo(s)} className="inline-flex min-h-11 items-center rounded-full bg-mint px-4 text-[0.9rem] font-semibold text-heritage-deep hover:bg-mint/70">
                  {label}
                  {done && <span className="sr-only"> {t('progress.done')}</span>}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function DemoPage() {
  const t = useT('demo');
  const [s, dispatch] = useReducer(reducer, undefined, () => loadState());
  const [resetOpen, setResetOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstRender = useRef(true);

  useEffect(() => saveState(s), [s]);

  // Move focus to the new step's heading (not on first load: the page h1 comes first).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [s.step, s.openId]);

  function reset() {
    clearState();
    dispatch({ type: 'reset' });
    setResetOpen(false);
    setAnnounce(t('banner.resetDone'));
  }

  const View = VIEWS[s.step];
  const narratorSide = NARRATOR_STEPS.has(s.step) || s.step === 'scope';
  const showBack = s.step !== 'topic' && s.step !== 'vault';

  return (
    <div className="bg-cream">
      <div role="note" className="border-b border-warning-line bg-warning-bg text-warning-fg">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6 lg:px-8">
          <Button variant="secondary" className="shrink-0 self-start sm:self-auto" onClick={() => setResetOpen(true)} leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}>
            {t('banner.reset')}
          </Button>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <header className="flex flex-col gap-3">
          <p className="text-[0.8125rem] font-bold uppercase tracking-[0.2em] text-terracotta">{t('header.kicker')}</p>
          <h1 className="font-serif text-[2rem] font-semibold leading-[1.2] text-heritage-deep md:text-[2.8rem]">{t('header.title')}</h1>
          <p className="max-w-2xl leading-relaxed text-ink-soft">{t('header.lede')}</p>
        </header>

        <Progress step={s.step} can={(x) => canEnter(s, x)} onGo={(x) => dispatch({ type: 'goto', step: x })} />

        <p className="sr-only" aria-live="polite">
          {announce}
        </p>

        <div className={cn('flex flex-col gap-6', narratorSide && cn('mx-auto w-full max-w-3xl', NARRATOR_TEXT))}>
          {showBack && s.step !== 'story' && s.step !== 'book' && (
            <Button variant="ghost" className="-ml-2 self-start" onClick={() => dispatch({ type: 'goto', step: previousStep(s.step) })} leftIcon={<ArrowLeft className="size-5" aria-hidden="true" />}>
              {t('nav.back')}
            </Button>
          )}
          <View s={s} dispatch={dispatch} headingRef={headingRef} />
        </div>

        {s.step === 'vault' && (
          <div className="border-t border-line pt-6">
            <ButtonLink to="/dang-ky" variant="secondary">
              {t('header.signup')}
            </ButtonLink>
          </div>
        )}
      </div>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        size="sm"
        title={t('banner.resetTitle')}
        description={t('banner.resetBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              {t('banner.resetCancel')}
            </Button>
            <Button variant="terracotta" onClick={reset}>
              {t('banner.resetConfirm')}
            </Button>
          </>
        }
      />
    </div>
  );
}
