// The narrator side of the walkthrough (large text): topic → listen → transcript → draft → confirm → scope.
import { ArrowRight, Check, CircleAlert, Eye, Globe, Lock, Sparkles, Users } from 'lucide-react';
import { useId, useState, type Dispatch, type ReactNode, type RefObject } from 'react';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { STATIC_TOPICS } from '@/features/knowledge/topics';
import { useLocale, usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { DEMO_NARRATORS, NARRATIONS } from './data';
import { SimPlayer } from './SimPlayer';
import {
  canEnter,
  DEMO_TOPICS,
  draftErrors,
  MAX_FIX,
  MAX_NAME,
  MAX_TITLE,
  SCOPES,
  TOPIC_UNSURE,
  type DemoAction,
  type DemoDraft,
  type DemoState,
  type Scope,
} from './state';
import { Pill } from './Pill';
import { UncertainText } from './UncertainText';

export interface StepProps {
  s: DemoState;
  dispatch: Dispatch<DemoAction>;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

/** Narrator-mode sizing: 20px body text and controls on the narrator steps. */
export const NARRATOR_TEXT = 'text-[1.25rem] leading-relaxed [&_button]:text-[1.15rem] [&_a]:text-[1.15rem] [&_label]:text-[1.15rem]';

export function StepTitle({ headingRef, title, lede, badge }: { headingRef: StepProps['headingRef']; title: ReactNode; lede?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {badge}
      <h2 ref={headingRef} tabIndex={-1} className="font-serif text-[1.75rem] font-semibold leading-snug text-heritage-deep focus-visible:outline-none! md:text-[2.1rem]">
        {title}
      </h2>
      {lede && <p className="max-w-2xl text-ink-soft">{lede}</p>}
    </div>
  );
}

function AiBadge({ label }: { label: string }) {
  return (
    <Pill tone="warning" icon={<Sparkles />} className="text-[0.95rem]">
      {label}
    </Pill>
  );
}

function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-center gap-2 font-medium text-terracotta">
      <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

function NarratorCard({ id }: { id: keyof typeof DEMO_NARRATORS }) {
  const t = useT('demo');
  const pick = usePick();
  const n = DEMO_NARRATORS[id];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-heritage font-serif text-[1.3rem] text-cream">
        {pick(n.short).split(' ').pop()?.[0]}
      </span>
      <p className="min-w-0">
        <span className="font-semibold text-ink">{t('listen.by', { name: pick(n.name) })}</span>
        <span className="block text-[1rem] text-ink-soft">{pick(n.meta)}</span>
      </p>
    </div>
  );
}

function OptionCard({ name, value, checked, onChange, title, hint, icon }: { name: string; value: string; checked: boolean; onChange: () => void; title: string; hint?: string; icon?: ReactNode }) {
  return (
    <label
      className={cn(
        'flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 ring-1 transition-colors focus-within:ring-2 focus-within:ring-heritage motion-reduce:transition-none',
        checked ? 'bg-mint ring-heritage' : 'bg-paper ring-line-strong hover:ring-heritage/50',
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1.5 size-6 shrink-0 accent-heritage" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-semibold text-ink">
          {icon}
          {title}
        </span>
        {hint && <span className="text-[1rem] font-normal leading-snug text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------

export function TopicStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  const pick = usePick();
  const [tried, setTried] = useState(false);
  const errId = useId();
  const ready = canEnter(s, 'listen');

  return (
    <div className="flex flex-col gap-7">
      <StepTitle headingRef={headingRef} title={t('topic.title')} lede={t('topic.lede')} />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold text-ink">{t('topic.legend')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEMO_TOPICS.map((slug) => {
            const topic = STATIC_TOPICS.find((x) => x.slug === slug);
            return <OptionCard key={slug} name="demo-topic" value={slug} checked={s.topic === slug} onChange={() => dispatch({ type: 'chooseTopic', topic: slug })} title={topic ? pick(topic.title) : slug} />;
          })}
          <OptionCard name="demo-topic" value={TOPIC_UNSURE} checked={s.topic === TOPIC_UNSURE} onChange={() => dispatch({ type: 'chooseTopic', topic: TOPIC_UNSURE })} title={t('topic.unsure')} hint={t('topic.unsureHint')} />
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold text-ink">{t('topic.kindLegend')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard name="demo-kind" value="memory" checked={s.kind === 'memory'} onChange={() => dispatch({ type: 'chooseKind', kind: 'memory' })} title={t('topic.memory')} hint={t('topic.memoryHint')} />
          <OptionCard name="demo-kind" value="experience" checked={s.kind === 'experience'} onChange={() => dispatch({ type: 'chooseKind', kind: 'experience' })} title={t('topic.experience')} hint={t('topic.experienceHint')} />
        </div>
      </fieldset>
      {s.kind && (
        <div className="rounded-2xl bg-cream px-5 py-4 ring-1 ring-line">
          <p className="text-[1rem] font-semibold uppercase tracking-[0.08em] text-terracotta">{t('question.label')}</p>
          <p className="mt-1 font-serif text-[1.4rem] leading-snug text-ink">{t(`question.${s.kind}`)}</p>
        </div>
      )}
      <p className="text-[1rem] text-ink-soft">{t('topic.sampleNote')}</p>
      {tried && !ready && <ErrorText id={errId}>{t('topic.needBoth')}</ErrorText>}
      <Button
        size="xl"
        className="self-start"
        aria-describedby={tried && !ready ? errId : undefined}
        rightIcon={<ArrowRight className="size-5" aria-hidden="true" />}
        onClick={() => {
          setTried(true);
          if (ready) dispatch({ type: 'start' });
        }}
      >
        {t('topic.start')}
      </Button>
    </div>
  );
}

export function ListenStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  if (!s.kind) return null;
  const n = NARRATIONS[s.kind];
  return (
    <div className="flex flex-col gap-6">
      <StepTitle headingRef={headingRef} title={t('listen.title')} lede={t('listen.lede')} />
      <div className="rounded-2xl bg-cream px-5 py-4 ring-1 ring-line">
        <p className="text-[1rem] font-semibold uppercase tracking-[0.08em] text-terracotta">{t('question.label')}</p>
        <p className="mt-1 font-serif text-[1.35rem] leading-snug text-ink">{t(`question.${s.kind}`)}</p>
      </div>
      <NarratorCard id={n.narrator} />
      <SimPlayer lines={n.lines} duration={n.duration} onEnded={() => dispatch({ type: 'heard' })} />
      <p role="status" className="min-h-8 font-medium text-heritage-deep">
        {s.heard ? t('listen.heard') : ''}
      </p>
      <Button size="xl" className="self-start" rightIcon={<ArrowRight className="size-5" aria-hidden="true" />} onClick={() => dispatch({ type: 'goto', step: 'transcript' })}>
        {t('listen.next')}
      </Button>
    </div>
  );
}

export function TranscriptStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  const pick = usePick();
  const { locale } = useLocale();
  const [fix, setFix] = useState('');
  const [fixError, setFixError] = useState(false);
  const [tried, setTried] = useState(false);
  const fixId = useId();
  const errId = useId();
  if (!s.kind) return null;
  const n = NARRATIONS[s.kind];
  const guess = pick(n.guess);
  const resolved = s.check.status !== 'pending';

  function saveFix() {
    if (!fix.trim()) {
      setFixError(true);
      return;
    }
    setFixError(false);
    dispatch({ type: 'fixGuess', value: fix });
  }

  return (
    <div className="flex flex-col gap-6">
      <StepTitle headingRef={headingRef} title={t('transcript.title')} lede={t('transcript.lede')} badge={<AiBadge label={t('transcript.aiLabel')} />} />
      <NarratorCard id={n.narrator} />
      <ol className="flex flex-col gap-3 rounded-2xl bg-paper p-5 ring-1 ring-line md:p-7">
        {n.lines.map((line) => (
          <li key={line.t} className={cn('flex flex-col gap-2 rounded-2xl px-3 py-2', line.uncertain && !resolved && 'bg-warning-bg ring-1 ring-warning-line')}>
            {line.uncertain && (
              <Pill tone={resolved ? 'mint' : 'warning'} icon={resolved ? <Check /> : <CircleAlert />} className="text-[0.95rem]">
                {resolved ? (s.check.status === 'fixed' ? t('transcript.checkedFixed', { value: s.check.value }) : t('transcript.checkedKept', { value: s.check.value })) : t('transcript.needsCheck')}
              </Pill>
            )}
            <p className="text-ink">
              <UncertainText text={pick(line.text)} fix={line.uncertain && resolved ? s.check.value : null} />
            </p>
          </li>
        ))}
      </ol>

      <section aria-labelledby={`${fixId}-h`} className="flex flex-col gap-4 rounded-2xl bg-cream p-5 ring-1 ring-line md:p-7">
        <h3 id={`${fixId}-h`} className="font-serif text-[1.4rem] font-semibold text-heritage-deep">
          {t('transcript.checkTitle')}
        </h3>
        <p>{t('transcript.checkBody', { guess })}</p>
        <Button size="lg" variant="secondary" className="self-start" leftIcon={<Check className="size-5" aria-hidden="true" />} onClick={() => dispatch({ type: 'keepGuess', locale })}>
          {t('transcript.keep', { guess })}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={t('transcript.fixLabel')} error={fixError ? t('transcript.fixEmpty') : undefined} className="flex-1">
            <Input value={fix} maxLength={MAX_FIX} onChange={(e) => setFix(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), saveFix())} className="text-[1.2rem]!" />
          </Field>
          <Button size="lg" onClick={saveFix}>
            {t('transcript.fixSave')}
          </Button>
        </div>
        <p role="status" className="min-h-8 font-medium text-heritage-deep">
          {resolved ? (s.check.status === 'fixed' ? t('transcript.checkedFixed', { value: s.check.value }) : t('transcript.checkedKept', { value: s.check.value })) : ''}
        </p>
      </section>

      {tried && !resolved && <ErrorText id={errId}>{t('transcript.mustCheck')}</ErrorText>}
      <Button
        size="xl"
        className="self-start"
        aria-describedby={tried && !resolved ? errId : undefined}
        rightIcon={<ArrowRight className="size-5" aria-hidden="true" />}
        onClick={() => {
          setTried(true);
          if (resolved) dispatch({ type: 'toDraft', locale, narratorName: pick(DEMO_NARRATORS[n.narrator].short) });
        }}
      >
        {t('transcript.next')}
      </Button>
    </div>
  );
}

export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </>
  );
}

export function DraftStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  const pick = usePick();
  const [tried, setTried] = useState(false);
  if (!s.kind || !s.draft) return null;
  const n = NARRATIONS[s.kind];
  const errs = tried ? draftErrors(s.draft) : {};
  const msg = (e?: 'required' | 'tooLong') => (e === 'required' ? t('draft.errorRequired') : e === 'tooLong' ? t('draft.errorTooLong') : undefined);
  const edit = (patch: Partial<DemoDraft>) => dispatch({ type: 'editDraft', patch });

  return (
    <div className="flex flex-col gap-6">
      <StepTitle headingRef={headingRef} title={t('draft.title')} lede={t('draft.lede')} badge={<AiBadge label={t('draft.aiLabel')} />} />
      <div className="flex flex-col gap-5 rounded-2xl bg-paper p-5 ring-1 ring-line md:p-7">
        <Field label={t('draft.titleLabel')} error={msg(errs.title)} required>
          <Input value={s.draft.title} maxLength={MAX_TITLE + 20} onChange={(e) => edit({ title: e.target.value })} className="text-[1.2rem]!" />
        </Field>
        <Field label={t('draft.nameLabel')} hint={t('draft.nameHint')} error={msg(errs.narratorName)} required>
          <Input value={s.draft.narratorName} maxLength={MAX_NAME + 10} onChange={(e) => edit({ narratorName: e.target.value })} className="text-[1.2rem]!" />
        </Field>
        <Field label={t('draft.bodyLabel')} hint={t('draft.bodyHint')} error={msg(errs.body)} required>
          <Textarea value={s.draft.body} rows={12} onChange={(e) => edit({ body: e.target.value })} className="text-[1.2rem]!" />
        </Field>
      </div>
      {n.card && (
        <section aria-labelledby="demo-card-h" className="flex flex-col gap-4 rounded-2xl bg-cream p-5 ring-1 ring-line md:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <h3 id="demo-card-h" className="font-serif text-[1.4rem] font-semibold text-heritage-deep">
              {t('draft.cardTitle')}
            </h3>
            <AiBadge label={t('draft.aiLabel')} />
          </div>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="font-semibold text-ink">{t('draft.skill')}</dt>
              <dd>{pick(n.card.skill)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">{t('draft.steps')}</dt>
              <dd>
                <ol className="list-decimal space-y-1 pl-7">
                  {n.card.steps.map((x, i) => (
                    <li key={i}>{pick(x)}</li>
                  ))}
                </ol>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">{t('draft.cautions')}</dt>
              <dd>{n.card.cautions.map((x) => pick(x)).join(' ')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">{t('draft.limits')}</dt>
              <dd>{pick(n.card.limits)}</dd>
            </div>
          </dl>
        </section>
      )}
      <Button
        size="xl"
        className="self-start"
        rightIcon={<ArrowRight className="size-5" aria-hidden="true" />}
        onClick={() => {
          setTried(true);
          dispatch({ type: 'toConfirm' });
        }}
      >
        {t('draft.next')}
      </Button>
    </div>
  );
}

export function ConfirmStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  if (!s.draft) return null;
  return (
    <div className="flex flex-col gap-6">
      <StepTitle headingRef={headingRef} title={t('confirm.title')} lede={t('confirm.lede')} />
      <article className="flex flex-col gap-4 rounded-2xl bg-paper p-5 ring-1 ring-line md:p-8">
        <h3 className="font-serif text-[1.6rem] font-semibold leading-snug text-ink">{s.draft.title}</h3>
        <p className="text-[1rem] text-ink-soft">{t('confirm.by', { name: s.draft.narratorName })}</p>
        <div className="flex flex-col gap-3 font-serif text-[1.2rem] leading-relaxed text-ink">
          <Paragraphs text={s.draft.body} />
        </div>
      </article>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="xl" leftIcon={<Check className="size-5" aria-hidden="true" />} onClick={() => dispatch({ type: 'confirm', ok: true })}>
          {t('confirm.yes')}
        </Button>
        <Button size="xl" variant="secondary" onClick={() => dispatch({ type: 'confirm', ok: false })}>
          {t('confirm.no')}
        </Button>
      </div>
    </div>
  );
}

const SCOPE_ICON: Record<Scope, ReactNode> = {
  private: <Lock className="size-5 shrink-0 text-heritage" aria-hidden="true" />,
  invited: <Users className="size-5 shrink-0 text-heritage" aria-hidden="true" />,
  publish: <Globe className="size-5 shrink-0 text-heritage" aria-hidden="true" />,
};

export function ScopeStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  const [tried, setTried] = useState(false);
  const errId = useId();
  if (!s.draft) return null;
  const who = s.scope === 'publish' ? t('scope.whoPublish') : s.scope === 'invited' ? t('scope.whoInvited') : t('scope.whoPrivate');
  const excerpt = s.draft.body.split(/\n\s*\n/)[0]?.trim() ?? '';

  return (
    <div className="flex flex-col gap-6">
      <StepTitle headingRef={headingRef} title={t('scope.title')} lede={t('scope.lede')} />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold text-ink">{t('scope.legend')}</legend>
        {SCOPES.map((sc) => (
          <OptionCard key={sc} name="demo-scope" value={sc} checked={s.scope === sc} onChange={() => dispatch({ type: 'chooseScope', scope: sc })} title={t(`scope.${sc}`)} hint={t(`scope.${sc}Desc`)} icon={SCOPE_ICON[sc]} />
        ))}
      </fieldset>
      {s.scope && (
        <section aria-labelledby={`${errId}-preview`} className="flex flex-col gap-3 rounded-2xl bg-cream p-5 ring-1 ring-line md:p-7">
          <h3 id={`${errId}-preview`} className="flex items-center gap-2 font-serif text-[1.3rem] font-semibold text-heritage-deep">
            <Eye className="size-5" aria-hidden="true" />
            {t('scope.previewTitle')}
          </h3>
          <p className="font-medium">{t('scope.previewWho', { who })}</p>
          <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
            <p className="font-serif text-[1.3rem] font-semibold leading-snug text-ink">{s.draft.title}</p>
            <p className="text-[1rem] text-ink-soft">{t('confirm.by', { name: s.draft.narratorName })}</p>
            <p className="mt-2 line-clamp-3 text-[1.05rem] text-ink">{excerpt}</p>
          </div>
          {s.scope === 'publish' && <p className="text-[1.05rem] text-ink-soft">{t('scope.previewPublicNote')}</p>}
        </section>
      )}
      {tried && !s.scope && <ErrorText id={errId}>{t('scope.needScope')}</ErrorText>}
      <Button
        size="xl"
        className="self-start"
        aria-describedby={tried && !s.scope ? errId : undefined}
        onClick={() => {
          setTried(true);
          if (s.scope) dispatch({ type: 'save' });
        }}
      >
        {t('scope.save')}
      </Button>
    </div>
  );
}
