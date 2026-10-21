import { ArrowRight, BookOpenText, MessageCircleQuestionMark, RotateCcw, Search, Sparkles, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Badge, Button, Spinner } from '@/components/ui';
import { useReducedMotionSafe } from '@/design/motion';
import { useLocale, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { askElders, AskError, isValidQuestion, normalizeQuestion, QUESTION_MAX, QUESTION_MIN, splitCitations, type AskResult, type AskSource } from '../ask';
import type { HubMode } from '../useKnowledgeSearch';

type AskFn = typeof askElders;

type State =
  | { status: 'idle' }
  | { status: 'asking'; question: string }
  | { status: 'done'; question: string; result: AskResult }
  | { status: 'error'; question: string; error: AskError };

export interface AskTheEldersProps {
  /** Hub state from useKnowledgeSearch: the assistant is disabled while the hub only shows illustrative samples. */
  hubMode: HubMode;
  notConfigured?: boolean;
  /** "Search this in the archive" → puts the text in the hub's keyword search. */
  onSearch?: (q: string) => void;
  /** Scrolls to / focuses the hub's result list. */
  onBrowse?: () => void;
  /** Injected in tests. */
  ask?: AskFn;
  className?: string;
}

const EXAMPLES = ['e1', 'e2', 'e3'] as const;

/** Hero block on /kham-pha: questions answered ONLY from published public items, with numbered citations. */
export function AskTheElders({ hubMode, notConfigured, onSearch, onBrowse, ask = askElders, className }: AskTheEldersProps) {
  const t = useT('knowledge');
  const { locale } = useLocale();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  const [invalid, setInvalid] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const ids = { input: useId(), hint: useId(), err: useId(), title: useId() };

  const disabled = notConfigured || hubMode === 'sample';
  const checking = !disabled && hubMode === 'checking';
  const busy = state.status === 'asking';

  useEffect(() => () => abortRef.current?.abort(), []);

  async function run(raw: string) {
    const q = normalizeQuestion(raw);
    if (!isValidQuestion(q)) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ status: 'asking', question: q });
    try {
      const result = await ask(q, locale, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setState({ status: 'done', question: q, result });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setState({ status: 'error', question: q, error: e instanceof AskError ? e : new AskError('unavailable') });
    }
    requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: false }));
  }

  function submit() {
    if (disabled || checking || busy) return;
    void run(question);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function pickExample(text: string) {
    setQuestion(text);
    if (!disabled && !checking) void run(text);
  }

  function reset() {
    abortRef.current?.abort();
    setState({ status: 'idle' });
    setQuestion('');
    inputRef.current?.focus();
  }

  const count = normalizeQuestion(question).length;

  return (
    <section aria-labelledby={ids.title} className={cn('relative overflow-hidden rounded-[2rem] bg-heritage-deep text-cream shadow-[0_30px_60px_-40px_rgba(22,58,49,0.9)]', className)}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-mint/10 blur-2xl" />
      <div className="relative px-5 py-7 sm:px-8 md:px-10 md:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.2em] text-mint">{t('ask.kicker')}</p>
          <Badge tone="night" size="sm" icon={<Sparkles />}>
            {t('ask.aiBadge')}
          </Badge>
        </div>
        <h2 id={ids.title} className="mt-3 max-w-3xl font-serif text-[1.75rem] font-semibold leading-tight sm:text-[2.1rem] md:text-[2.5rem]">
          {t('ask.title')}
        </h2>
        <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-cream/80">{t('ask.lede')}</p>

        {disabled ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/8 px-5 py-4 ring-1 ring-white/15">
            <BookOpenText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-mint" />
            <div>
              <p className="font-semibold">{t('ask.disabledTitle')}</p>
              <p className="mt-1 text-[0.95rem] leading-relaxed text-cream/80">{notConfigured ? t('ask.disabledNotConfigured') : t('ask.disabledBody')}</p>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 max-w-3xl" aria-disabled={disabled || undefined}>
          <label htmlFor={ids.input} className="text-[0.92rem] font-semibold text-cream">
            {t('ask.label')}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              ref={inputRef}
              id={ids.input}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (invalid) setInvalid(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              maxLength={QUESTION_MAX}
              disabled={disabled}
              placeholder={t('ask.placeholder')}
              aria-describedby={cn(ids.hint, invalid && ids.err) || undefined}
              aria-invalid={invalid || undefined}
              className="min-h-16 w-full min-w-0 flex-1 resize-none rounded-2xl bg-paper px-4 py-3 text-[1.05rem] text-ink ring-1 ring-white/20 placeholder:text-ink-soft/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-mint aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-terracotta disabled:cursor-not-allowed disabled:opacity-60"
            />
            <Button
              type="submit"
              size="lg"
              variant="dark-cream"
              loading={busy}
              disabled={disabled || checking}
              leftIcon={<MessageCircleQuestionMark aria-hidden="true" className="size-5" />}
              className="w-full shrink-0 sm:w-auto"
            >
              {t('ask.submit')}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[0.82rem] text-cream/70">
            <p id={ids.hint}>{t('ask.hint', { min: QUESTION_MIN, max: QUESTION_MAX })}</p>
            <p aria-hidden="true">{t('ask.counter', { n: count, max: QUESTION_MAX })}</p>
          </div>
          {invalid && (
            <p id={ids.err} role="alert" className="mt-2 font-medium text-[#ffd7c9]">
              {t('ask.errors.invalid', { min: QUESTION_MIN, max: QUESTION_MAX })}
            </p>
          )}
        </form>

        <div className="mt-5">
          <p id={`${ids.title}-ex`} className="text-[0.85rem] font-semibold text-cream/75">
            {t('ask.examplesLabel')}
          </p>
          <ul aria-labelledby={`${ids.title}-ex`} className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((k) => (
              <li key={k}>
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => pickExample(t(`ask.examples.${k}`))}
                  className="inline-flex min-h-12 max-w-full items-center rounded-full bg-white/8 px-4 py-2 text-left text-[0.92rem] font-semibold text-cream ring-1 ring-white/20 transition-colors hover:bg-white/15 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t(`ask.examples.${k}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {checking ? t('ask.checking') : busy ? t('ask.asking') : state.status === 'done' && state.result.answer ? t('ask.answered', { n: state.result.cited.length }) : ''}
        </p>

        {state.status !== 'idle' && (
          <div ref={resultRef} tabIndex={-1} className="mt-8 rounded-[1.5rem] bg-paper p-5 text-ink ring-1 ring-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-mint sm:p-7">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">{t('ask.youAsked')}</p>
            <p className="mt-1 font-serif text-[1.15rem] font-semibold text-heritage-deep">“{state.question}”</p>
            <div className="mt-5 border-t border-line/70 pt-5">
              {state.status === 'asking' && (
                <p className="flex items-center gap-3 text-ink-soft">
                  <Spinner size="sm" decorative />
                  {t('ask.asking')}
                </p>
              )}
              {state.status === 'error' && <AskErrorView error={state.error} onRetry={() => void run(state.question)} onSearch={onSearch ? () => onSearch(state.question) : undefined} />}
              {state.status === 'done' && (
                <ResultView result={state.result} question={state.question} onSearch={onSearch} onBrowse={onBrowse} onAgain={reset} />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function AskErrorView({ error, onRetry, onSearch }: { error: AskError; onRetry: () => void; onSearch?: () => void }) {
  const t = useT('knowledge');
  const msg =
    error.kind === 'rate_limited'
      ? error.retryAfterS
        ? t('ask.errors.rate_limited', { s: error.retryAfterS })
        : t('ask.errors.rate_limited_plain')
      : error.kind === 'invalid'
        ? t('ask.errors.invalid', { min: QUESTION_MIN, max: QUESTION_MAX })
        : t(`ask.errors.${error.kind}`);
  const canRetry = error.kind === 'unavailable' || error.kind === 'network' || error.kind === 'rate_limited';
  return (
    <div role="alert" className="flex items-start gap-3">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-terracotta" />
      <div>
        <p className="font-medium text-ink">{msg}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {canRetry && (
            <Button variant="secondary" onClick={onRetry} leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
              {t('ask.retry')}
            </Button>
          )}
          {onSearch && (
            <Button variant="ghost" onClick={onSearch} leftIcon={<Search aria-hidden="true" className="size-4" />}>
              {t('ask.noSourcesTipSearch')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({
  result,
  question,
  onSearch,
  onBrowse,
  onAgain,
}: {
  result: AskResult;
  question: string;
  onSearch?: (q: string) => void;
  onBrowse?: () => void;
  onAgain: () => void;
}) {
  const t = useT('knowledge');

  if (result.reason === 'no_sources' || (result.answer === null && result.sources.length === 0)) {
    return (
      <div>
        <h3 className="font-serif text-[1.25rem] font-semibold text-heritage-deep">{t('ask.noSourcesTitle')}</h3>
        <p className="mt-2 leading-relaxed text-ink-soft">{t('ask.noSourcesBody')}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft marker:text-terracotta">
          <li>{t('ask.noSourcesTipSearch')}</li>
          <li>{t('ask.noSourcesTipBrowse')}</li>
          <li>{t('ask.noSourcesTipRephrase')}</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          {onSearch && (
            <Button onClick={() => onSearch(question)} leftIcon={<Search aria-hidden="true" className="size-4" />}>
              {t('ask.searchThis', { q: question.length > 40 ? `${question.slice(0, 40)}…` : question })}
            </Button>
          )}
          {onBrowse && (
            <Button variant="secondary" onClick={onBrowse}>
              {t('ask.browse')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (result.answer === null) {
    return (
      <div>
        <h3 className="font-serif text-[1.25rem] font-semibold text-heritage-deep">{t('ask.notInSourcesTitle')}</h3>
        <p className="mt-2 leading-relaxed text-ink-soft">{t('ask.notInSourcesBody')}</p>
        <SourceList sources={result.sources} title={t('ask.relatedTitle')} />
        <div className="mt-5 flex flex-wrap gap-3">
          {onSearch && (
            <Button variant="secondary" onClick={() => onSearch(question)} leftIcon={<Search aria-hidden="true" className="size-4" />}>
              {t('ask.noSourcesTipSearch')}
            </Button>
          )}
          <Button variant="ghost" onClick={onAgain}>
            {t('ask.again')}
          </Button>
        </div>
      </div>
    );
  }

  const cited = result.sources.filter((_, i) => result.cited.includes(i + 1));
  const others = result.sources.filter((_, i) => !result.cited.includes(i + 1));
  return (
    <div>
      <h3 className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-heritage">
        <Sparkles aria-hidden="true" className="size-4" />
        {t('ask.answerTitle')}
      </h3>
      <TypedAnswer answer={result.answer} sources={result.sources} />
      <p className="mt-5 rounded-2xl bg-[#fdf6e3] px-4 py-3 text-[0.9rem] leading-relaxed text-[#5b430f] ring-1 ring-[#e9d6a6]">
        {t('ask.note')} {t('ask.verify')}
      </p>
      <SourceList sources={result.sources} only={cited} title={t('ask.sourcesTitle')} />
      {others.length > 0 && <SourceList sources={result.sources} only={others} title={t('ask.relatedTitle')} muted />}
      <Button variant="ghost" className="mt-5" onClick={onAgain} leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
        {t('ask.again')}
      </Button>
    </div>
  );
}

/** Word-by-word reveal (instant with reduced motion). Citation chips become links once the text is complete. */
function TypedAnswer({ answer, sources }: { answer: string; sources: AskSource[] }) {
  const t = useT('knowledge');
  const reduced = useReducedMotionSafe();
  const tokens = useMemo(
    () =>
      splitCitations(answer, sources.length).flatMap((p): (string | number)[] =>
        typeof p === 'number' ? [p] : p.split(/(\s+)/).filter((s) => s !== ''),
      ),
    [answer, sources.length],
  );
  const [shown, setShown] = useState(reduced ? tokens.length : 0);

  useEffect(() => {
    if (reduced) {
      setShown(tokens.length);
      return;
    }
    setShown(0);
    const step = Math.max(1, Math.ceil(tokens.length / 60));
    const timer = window.setInterval(() => {
      setShown((n) => {
        const next = Math.min(tokens.length, n + step);
        if (next >= tokens.length) window.clearInterval(timer);
        return next;
      });
    }, 28);
    return () => window.clearInterval(timer);
  }, [tokens, reduced]);

  const done = shown >= tokens.length;
  const paragraphs: (string | number)[][] = [[]];
  for (const tok of tokens.slice(0, shown)) {
    if (typeof tok === 'string' && /\n\s*\n/.test(tok)) paragraphs.push([]);
    else paragraphs[paragraphs.length - 1]!.push(tok);
  }

  return (
    <div className="mt-3 space-y-3 text-[1.08rem] leading-[1.75] text-ink" aria-busy={!done} aria-hidden={done ? undefined : true}>
      {paragraphs.map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para.map((tok, j) =>
            typeof tok === 'number' ? (
              <Citation key={j} n={tok} source={sources[tok - 1]!} interactive={done} label={t('ask.citation', { n: tok, title: sources[tok - 1]!.title })} />
            ) : (
              <span key={j}>{tok}</span>
            ),
          )}
          {!done && i === paragraphs.length - 1 && <span aria-hidden="true" className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-heritage" />}
        </p>
      ))}
    </div>
  );
}

function Citation({ n, source, interactive, label }: { n: number; source: AskSource; interactive: boolean; label: string }) {
  const cls = 'mx-0.5 inline-flex min-w-7 items-center justify-center rounded-full bg-mint px-1.5 align-[0.12em] text-[0.78rem] font-bold leading-6 text-heritage-deep';
  if (!interactive) return <span className={cls}>{n}</span>;
  return (
    <Link to={`/tri-thuc/${source.id}`} aria-label={label} title={source.title} className={cn(cls, 'hover:bg-heritage hover:text-cream focus-visible:outline-offset-2')}>
      {n}
    </Link>
  );
}

function SourceList({ sources, only, title, muted }: { sources: AskSource[]; only?: AskSource[]; title: string; muted?: boolean }) {
  const t = useT('knowledge');
  const list = only ?? sources;
  if (list.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className={cn('text-[0.85rem] font-bold uppercase tracking-[0.14em]', muted ? 'text-ink-soft' : 'text-heritage')}>{title}</h4>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {list.map((s) => {
          const n = sources.indexOf(s) + 1;
          return (
            <li key={s.id}>
              <Link
                to={`/tri-thuc/${s.id}`}
                className="group flex min-h-12 items-start gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-line transition-shadow hover:ring-heritage/50 focus-visible:outline-offset-2"
              >
                <span aria-hidden="true" className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-mint text-[0.8rem] font-bold text-heritage-deep">
                  {n}
                </span>
                <span className="min-w-0">
                  <span className="sr-only">{t('ask.sourceN', { n })}: </span>
                  <span className="block font-semibold leading-snug text-heritage-deep group-hover:underline">{s.title}</span>
                  <span className="mt-0.5 block text-[0.85rem] text-ink-soft">
                    {t(`kinds.${s.kind}`)} · {s.narrator_label}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="ml-auto mt-1 size-4 shrink-0 text-ink-soft group-hover:text-heritage" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
