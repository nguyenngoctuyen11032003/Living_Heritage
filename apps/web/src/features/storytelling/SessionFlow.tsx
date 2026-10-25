// The question + recording screen: one question, one primary action at a time.
// record → review → uploading → processing → done, with B16 error states at every step.
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, type AiErrorCode } from '@lh/shared';
import { CircleAlert, FileAudio, Heart, Mic, Pause, Play, RefreshCw, Shuffle, SkipForward, Sparkles, Square, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AudioPlayer, Button, ButtonLink, buttonClasses, Card, Dialog, Spinner } from '@/components/ui';
import { aiErrorKey, suggestQuestions, transcribeAndDraft } from '@/features/ai/client';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { track } from '@/lib/events';
import { getSupabase } from '@/lib/supabase';
import { useAddress } from './address';
import { formatClock } from './clock';
import { AssistedBanner, ELDER_CONTROLS } from './components';
import { endSession, fetchJobStatus, type NarratorInfo, type Question, type SessionRow, type Topic } from './data';
import { promptIn, resolveFollowUps, seededFollowUps, textKey, type FollowUp, type FollowUpState } from './followUps';
import { HowToGuide } from './HowToGuide';
import { NarratorHelpButton } from './NarratorHelp';
import { LeaveGuard } from './LeaveGuard';
import { ListenButton } from './ListenButton';
import { getPendingStore, pendingKey, sessionPrefix, type PendingUpload } from './pendingStore';
import { hasRecordingConsent, markHowToSeen, markRecordingConsent, readAutoRead, shouldShowHowTo, writeAutoRead } from './prefs';
import { currentMicHelpBrowser } from './micHelp';
import { initialQuestion, nextQuestion, nextUnusedQuestion } from './questions';
import { isRecordingSupported, useRecorder, WARN_AT_SECONDS, type RecordingResult } from './recorder';
import { isCapturing } from './recorderReducer';
import { keptKey } from './summary';
import { createAudioCache } from './tts';
import { checkAudioFile, supabaseUploadBackend, uploadPending, UploadError, type UploadErrorCode } from './upload';

/** Dialogs render in a portal, outside narrator mode: give their text and buttons the same size. */
const DIALOG_ELDER = `${ELDER_CONTROLS} [&_p]:text-[1.25rem]`;

type Take = RecordingResult & { fileName?: string };

type Phase =
  | { kind: 'record' }
  | { kind: 'uploading' }
  | { kind: 'upload-failed'; code: UploadErrorCode; uploaded: boolean; restored: boolean }
  | { kind: 'processing'; recordingId: string; step: 'transcribing' | 'drafting' }
  | { kind: 'ai-failed'; recordingId: string; code: AiErrorCode }
  | { kind: 'done'; recordingId: string; storyIds: string[] };

function newAttemptId(): string {
  const c: Crypto = globalThis.crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Duration of an audio file from its metadata (null when the browser cannot tell). */
function probeDuration(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (v: number | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    const timer = window.setTimeout(() => done(null), 4000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      done(null);
    };
    audio.src = url;
  });
}

export interface SessionFlowProps {
  session: SessionRow;
  narrator: NarratorInfo;
  assisted: boolean;
  topic: Topic | null;
  questions: Question[];
  answered: string[];
  /** Recordings already kept in this session before this screen opened (for the end-of-session summary). */
  keptBefore?: number;
}

/** "Gợi ý từ AI": an honest label on AI-suggested questions (text, not colour alone). */
/**
 * Live microphone level. Reads the recorder itself and writes the bar's transform (compositor-only) and aria-valuenow
 * straight to the DOM, so the whole session screen does not re-render 8 times a second while recording.
 */
function LevelMeter({ read, active, label }: { read: () => number; active: boolean; label: string }) {
  const meterRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const paint = () => {
      const pct = active ? Math.round(read() * 100) : 0;
      meterRef.current?.setAttribute('aria-valuenow', String(pct));
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.max(active ? 3 : 0, pct) / 100})`;
    };
    paint();
    if (!active) return;
    const id = window.setInterval(paint, 100);
    return () => window.clearInterval(id);
  }, [read, active]);
  return (
    <div ref={meterRef} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} className="h-4 w-full overflow-hidden rounded-full bg-line/60">
      <div ref={barRef} className="h-full w-full origin-left rounded-full bg-heritage transition-transform duration-100" style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}

function AiPill({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full bg-warning-bg px-4 py-1.5 text-[1.25rem] font-semibold text-warning-fg ring-1 ring-warning-line', className)}>
      <Sparkles className="size-5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function SessionFlow({ session, narrator, assisted, topic, questions, answered, keptBefore = 0 }: SessionFlowProps) {
  const t = useT('narrator');
  const pick = usePick();
  const address = useAddress();
  // Questions, AI drafts, suggestions and the voice follow the narrator's language; UI copy follows the UI locale.
  const lang = narrator.lang;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const recorder = useRecorder({ maxSeconds: MAX_RECORDING_SECONDS });
  const store = getPendingStore();
  const fileInputId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [used, setUsed] = useState<Set<string>>(() => new Set(answered));
  const [currentId, setCurrentId] = useState<string | null>(() => initialQuestion(questions, params.get('q'), new Set(answered))?.id ?? null);
  const [fileTake, setFileTake] = useState<Take | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'record' });
  const [redoOpen, setRedoOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const pendingRef = useRef<PendingUpload | null>(null);
  /** An AI follow-up question being answered (not a row in `questions`). */
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpState>({ status: 'idle' });
  const followUpRuns = useRef(new Map<string, Promise<string[] | null>>());
  const [kept, setKept] = useState(keptBefore);
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [howToOpen, setHowToOpen] = useState(shouldShowHowTo);
  const [autoRead, setAutoRead] = useState(readAutoRead);
  const [audioCache] = useState(() => createAudioCache());
  const autoReadId = useId();
  /** Keep / retry in flight: one tap saves one copy (B3 busy state). */
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  /** Set once "Kết thúc buổi kể" is confirmed: the leave guard stands down and we navigate after the render. */
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const [micHelp] = useState(currentMicHelpBrowser);
  /** "Trước khi ghi âm": what the explanation card will do once accepted (null = closed). */
  const [consentFor, setConsentFor] = useState<'start' | 'keep' | null>(null);

  const question = questions.find((q) => q.id === currentId) ?? null;
  const questionText = aiQuestion ?? (question ? promptIn(question, lang) : t('session.freePrompt'));
  const key = pendingKey(session.id, aiQuestion ? textKey(aiQuestion) : currentId);
  const take: Take | null = fileTake ?? recorder.result;
  const takeRef = useRef(take);
  takeRef.current = take;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const status = recorder.state.status;
  const supported = isRecordingSupported();
  const narratorQuery = assisted ? `?narrator=${encodeURIComponent(narrator.id)}` : '';

  // Navigate only after the render that switched the leave guard off (the blocker reads the last render).
  useEffect(() => {
    if (leavingTo) navigate(leavingTo);
  }, [leavingTo, navigate]);

  // Question voices cached for this session are released when the screen goes away.
  useEffect(() => () => audioCache.clear(), [audioCache]);

  // Object URL for the review player, revoked when the take changes or the page goes away.
  useEffect(() => {
    if (!take) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(take.blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [take]);

  // A take of this session may still be waiting on this device (network failure, closed tab…). It may belong to
  // another question — or to an AI follow-up, which is not in the URL — so look across the whole session and
  // bring its question back on screen before offering "Thử tải lại".
  useEffect(() => {
    let alive = true;
    void (async () => {
      const found = (await store.get(key).catch(() => null)) ?? (await store.list(sessionPrefix(session.id)).catch(() => []))[0] ?? null;
      if (!alive || !found) return;
      if (found.key !== key && phaseRef.current.kind === 'record' && !takeRef.current) {
        // Through goToQuestion so ?q= follows the question on screen (a reload then lands on the same take).
        const seeded = found.questionId ? questions.find((q) => q.id === found.questionId) : undefined;
        goToQuestionRef.current(seeded ?? null);
        if (!seeded && found.questionText) setAiQuestion(found.questionText);
      }
      pendingRef.current = found;
      setPhase((p) => (p.kind === 'record' && !takeRef.current ? { kind: 'upload-failed', code: 'network', uploaded: found.uploaded, restored: true } : p));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check only when the question (key) changes
  }, [key, store, session.id]);

  // Show friendlier processing words when the job moves on to drafting.
  useEffect(() => {
    if (phase.kind !== 'processing') return;
    const id = phase.recordingId;
    const sb = getSupabase();
    const bump = () => setPhase((p) => (p.kind === 'processing' && p.recordingId === id ? { ...p, step: 'drafting' } : p));
    const fallback = window.setTimeout(bump, 20_000);
    const poll = window.setInterval(() => {
      if (!sb) return;
      void fetchJobStatus(sb, id).then((s) => {
        if (s === 'drafting' || s === 'done') bump();
      });
    }, 2500);
    return () => {
      window.clearTimeout(fallback);
      window.clearInterval(poll);
    };
  }, [phase]);

  // After a recording is processed: up to three next questions (AI first, seeded ones when AI cannot help).
  const doneRecordingId = phase.kind === 'done' ? phase.recordingId : null;
  useEffect(() => {
    if (!doneRecordingId) return;
    const seeded = seededFollowUps(questions, currentId, used, lang);
    const topicId = session.topic_id;
    if (!topicId) {
      setFollowUps(resolveFollowUps(null, seeded));
      return;
    }
    let run = followUpRuns.current.get(doneRecordingId);
    if (!run) {
      run = suggestQuestions(narrator.id, topicId, lang).catch(() => null);
      followUpRuns.current.set(doneRecordingId, run);
    }
    let alive = true;
    setFollowUps({ status: 'loading' });
    void run.then((ai) => alive && setFollowUps(resolveFollowUps(ai, seeded)));
    return () => {
      alive = false;
    };
    // Only when a new recording finishes; question bookkeeping at that moment is what counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneRecordingId]);

  const goToQuestion = useCallback(
    (q: Question | null, message?: string) => {
      setAiQuestion(null);
      setCurrentId(q?.id ?? null);
      const next = new URLSearchParams(params);
      if (q) next.set('q', q.id);
      else next.delete('q');
      setParams(next, { replace: true });
      if (message) setAnnounce(message);
      window.setTimeout(() => headingRef.current?.focus(), 0);
    },
    [params, setParams],
  );

  const goToQuestionRef = useRef(goToQuestion);
  useEffect(() => {
    goToQuestionRef.current = goToQuestion;
  }, [goToQuestion]);

  function resetTake() {
    recorder.reset();
    setFileTake(null);
    setFileError(null);
  }

  function changeQuestion() {
    goToQuestion(nextQuestion(questions, currentId, used), t('session.changed'));
  }

  function skipQuestion() {
    const nextUsed = new Set(used);
    if (currentId && !aiQuestion) nextUsed.add(currentId);
    setUsed(nextUsed);
    // Nothing left to ask: fall back to free telling instead of showing the skipped question again.
    goToQuestion(nextUnusedQuestion(questions, aiQuestion ? null : currentId, nextUsed), t('session.changed'));
  }

  const runAi = useCallback(
    async (recordingId: string) => {
      setPhase({ kind: 'processing', recordingId, step: 'transcribing' });
      try {
        const res = await transcribeAndDraft(recordingId, lang);
        if (res.status === 'error' || res.error) setPhase({ kind: 'ai-failed', recordingId, code: res.error ?? 'internal' });
        else setPhase({ kind: 'done', recordingId, storyIds: res.story_ids });
      } catch (e) {
        setPhase({ kind: 'ai-failed', recordingId, code: aiErrorKey(e) });
      }
    },
    [lang],
  );

  async function runUpload(pending: PendingUpload) {
    const sb = getSupabase();
    if (!sb) return;
    setPhase({ kind: 'uploading' });
    try {
      const recordingId = await uploadPending(pending, supabaseUploadBackend(sb), store);
      track('upload_ok');
      pendingRef.current = null;
      if (pending.questionId) setUsed((u) => new Set(u).add(pending.questionId!));
      setKept((n) => n + 1);
      resetTake();
      await runAi(recordingId);
    } catch (e) {
      const err = e instanceof UploadError ? e : new UploadError('network');
      setPhase({ kind: 'upload-failed', code: err.code, uploaded: err.uploaded, restored: false });
    }
  }

  async function keep() {
    if (!take || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      // A microphone take is only paused while listening back: finish it so the whole file is saved.
      const final = fileTake ?? (await recorder.finalize()) ?? take;
      await keepTake(final);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function keepTake(final: Take) {
    const pending: PendingUpload = {
      key,
      attemptId: newAttemptId(),
      blob: final.blob,
      mime: final.mime,
      duration: final.duration,
      familyId: session.family_id,
      narratorId: session.narrator_id,
      sessionId: session.id,
      // An AI follow-up is not a questions row: store its text instead so the draft knows what was asked.
      questionId: aiQuestion ? null : currentId,
      questionText: question || aiQuestion ? questionText.slice(0, 500) : null,
      createdAt: Date.now(),
      uploaded: false,
      recordingId: null,
    };
    pendingRef.current = pending;
    try {
      await store.put(pending);
    } catch {
      /* memory copy in pendingRef is still there */
    }
    await runUpload(pending);
  }

  async function retryUpload() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const pendingKeyNow = pendingRef.current?.key ?? key;
      const latest = (await store.get(pendingKeyNow).catch(() => null)) ?? pendingRef.current;
      if (!latest) {
        setPhase({ kind: 'record' });
        return;
      }
      pendingRef.current = latest;
      await runUpload(latest);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function discardPending() {
    await store.delete(pendingRef.current?.key ?? key).catch(() => {});
    pendingRef.current = null;
    setDiscardOpen(false);
    resetTake();
    setPhase({ kind: 'record' });
  }

  function continueWithNext() {
    setFollowUps({ status: 'idle' });
    setPhase({ kind: 'record' });
    resetTake();
    goToQuestion(nextQuestion(questions, currentId, used), t('session.changed'));
  }

  async function finish() {
    if (ending) return;
    setEnding(true);
    track('session_end');
    // The dialog already warned about an unsaved take: release the microphone and do not ask a second time.
    recorder.reset();
    const sb = getSupabase();
    if (sb) await endSession(sb, session.id).catch(() => {});
    setEndOpen(false);
    setLeavingTo(`/ke-chuyen${narratorQuery}`);
  }

  function startFollowUp(item: FollowUp) {
    setPhase({ kind: 'record' });
    setFollowUps({ status: 'idle' });
    resetTake();
    const seeded = item.questionId ? questions.find((q) => q.id === item.questionId) : undefined;
    if (seeded) return goToQuestion(seeded, t('session.changed'));
    goToQuestion(null, t('session.changed'));
    setAiQuestion(item.text);
  }

  // Spec 2.3: before the first recording (or the first kept file) the narrator reads what happens to it, once per device.
  function requestStart() {
    if (hasRecordingConsent()) void recorder.start();
    else setConsentFor('start');
  }

  function requestKeep() {
    if (hasRecordingConsent()) void keep();
    else setConsentFor('keep');
  }

  function acceptConsent() {
    const action = consentFor;
    markRecordingConsent();
    setConsentFor(null);
    if (action === 'start') void recorder.start();
    else if (action === 'keep') void keep();
  }

  function closeHowTo() {
    markHowToSeen();
    setHowToOpen(false);
  }

  function toggleAutoRead(on: boolean) {
    setAutoRead(on);
    writeAutoRead(on);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileError(null);
    const checked = checkAudioFile(file, MAX_AUDIO_BYTES);
    if (!checked.ok) return setFileError(t(checked.problem === 'too_large' ? 'errors.fileTooLarge' : checked.problem === 'empty' ? 'errors.fileEmpty' : 'errors.fileNotAudio'));
    const duration = await probeDuration(file);
    if (duration !== null && duration > MAX_RECORDING_SECONDS + 5) return setFileError(t('errors.fileTooLong'));
    setFileTake({ blob: file, duration: duration ?? 0, mime: checked.mime, fileName: file.name });
  }

  const unsaved = isCapturing(status) || !!take || phase.kind === 'uploading' || phase.kind === 'upload-failed';
  const showQuestionTools = phase.kind === 'record' && !take && !isCapturing(status);

  // ---------------------------------------------------------------------------
  // Pieces
  // ---------------------------------------------------------------------------

  const filePicker = (
    <div className="flex flex-col gap-2">
      <label htmlFor={fileInputId} className="inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-paper px-7 text-[1.25rem] font-semibold text-ink ring-1 ring-line-strong hover:text-heritage hover:ring-heritage/60 focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-terracotta">
        <FileAudio className="size-6" aria-hidden="true" />
        {t('errors.fileLabel')}
        <input id={fileInputId} type="file" accept="audio/*" className="sr-only" onChange={(e) => void onFile(e)} aria-describedby={`${fileInputId}-hint`} />
      </label>
      <p id={`${fileInputId}-hint`} className="text-center text-[1.25rem] text-ink-soft">
        {t('errors.fileHint')}
      </p>
      {fileError && (
        <p role="alert" className="flex items-center justify-center gap-2 text-[1.25rem] font-medium text-terracotta">
          <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
          {fileError}
        </p>
      )}
    </div>
  );

  // B7: when the microphone cannot be used, the sample narration in the no-account demo shows how it works.
  const demoLink = (
    <ButtonLink to="/trai-nghiem" size="lg" variant="ghost" className="self-center">
      {t('errors.tryDemo')}
    </ButtonLink>
  );

  function recorderView() {
    if (!supported || status === 'unsupported') {
      return (
        <Card padding="none" className="p-5 sm:p-8 flex flex-col gap-5 text-center">
          <h2 className="font-serif text-[1.5rem] font-semibold text-heritage-deep">{t('errors.unsupportedTitle')}</h2>
          <p className="text-[1.25rem] leading-relaxed text-ink">{t('errors.unsupportedDesc')}</p>
          {filePicker}
          {demoLink}
        </Card>
      );
    }
    if (status === 'denied') {
      return (
        <Card padding="none" className="p-5 sm:p-8 flex flex-col gap-5">
          <h2 className="font-serif text-[1.5rem] font-semibold text-heritage-deep">{t('errors.deniedTitle')}</h2>
          <p className="text-[1.25rem] leading-relaxed">{t('errors.deniedDesc')}</p>
          <p className="text-[1.25rem] font-semibold text-heritage-deep">{t(`errors.micHelp.${micHelp}.label`)}</p>
          <ol className="list-decimal space-y-2 pl-7 text-[1.25rem] leading-relaxed">
            <li>{t(`errors.micHelp.${micHelp}.step1`)}</li>
            <li>{t(`errors.micHelp.${micHelp}.step2`)}</li>
            <li>{t('errors.deniedStep3')}</li>
          </ol>
          <p className="text-[1.25rem] text-ink-soft">{t('errors.deniedStill')}</p>
          <Button size="lg" onClick={() => void recorder.start()} leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}>
            {t('errors.retryMic')}
          </Button>
          {filePicker}
          {demoLink}
        </Card>
      );
    }

    const recording = status === 'recording';
    const live = recording || status === 'paused';
    const warn = live && recorder.elapsed >= WARN_AT_SECONDS;

    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p role="status" aria-live="polite" className="flex items-center gap-3 text-[1.3rem] font-semibold text-ink">
          {recording && <span aria-hidden="true" className="size-3.5 rounded-full bg-terracotta motion-safe:animate-pulse" />}
          {status === 'paused' && <Pause className="size-5" aria-hidden="true" />}
          {t(`rec.status.${status === 'error' ? 'idle' : status}` as 'rec.status.idle')}
        </p>

        {status === 'error' && (
          <p role="alert" className="flex items-center gap-2 text-[1.25rem] font-medium text-terracotta">
            <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
            {recorder.state.error === 'no_device' ? t('errors.noDevice') : t('errors.micFailed')}
          </p>
        )}

        {!live ? (
          <>
            <button
              type="button"
              onClick={() => requestStart()}
              disabled={status === 'requesting'}
              aria-describedby="rec-start-hint"
              className="group flex flex-col items-center gap-3 rounded-[2rem] p-2 disabled:opacity-60"
            >
              <span className="flex size-[6.5rem] items-center justify-center rounded-full bg-heritage text-cream shadow-[0_12px_30px_-12px_rgba(31,77,58,0.6)] transition-transform group-hover:bg-heritage-deep group-active:scale-95">
                {status === 'requesting' ? <Spinner size="lg" decorative /> : <Mic className="size-8" aria-hidden="true" />}
              </span>
              <span className="text-[1.35rem] font-semibold text-heritage-deep">{t('rec.start')}</span>
            </button>
            <p id="rec-start-hint" className="max-w-md text-[1.25rem] text-ink-soft">
              {t('rec.startHint')} {t('rec.limit')}
            </p>
          </>
        ) : (
          <>
            <div>
              <p className="sr-only">{t('rec.elapsed')}</p>
              <p className="font-serif text-[3.25rem] font-semibold tabular-nums leading-none text-ink" aria-hidden="true">
                {formatClock(recorder.elapsed)}
              </p>
              <p className="mt-2 text-[1.25rem] text-ink-soft">{t('rec.elapsedValue', { time: formatClock(recorder.elapsed) })}</p>
            </div>

            {recorder.metered && (
            <div className="w-full max-w-sm">
              <LevelMeter read={recorder.readLevel} active={recording} label={t('rec.level')} />
              <p className="mt-2 text-[1.25rem] text-ink-soft">{!recording ? t('rec.levelPaused') : recorder.quiet ? t('rec.levelQuiet') : t('rec.levelGood')}</p>
            </div>
            )}

            {warn && (
              <p role="alert" className="rounded-2xl bg-warning-bg px-5 py-3 text-[1.25rem] font-medium text-warning-fg">
                {t('rec.warn')}
              </p>
            )}

            <button type="button" onClick={() => void recorder.stop()} aria-label={t('rec.stopLabel')} className="group relative flex flex-col items-center gap-3 rounded-[2rem] p-2">
              <span className="relative flex size-[6.5rem] items-center justify-center rounded-full bg-terracotta text-cream group-active:scale-95">
                {recording && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-terracotta/40 motion-safe:animate-ping" />}
                <Square className="relative size-7 fill-current" aria-hidden="true" />
              </span>
              <span className="text-[1.35rem] font-semibold text-terracotta">{t('rec.stop')}</span>
            </button>

            {recording ? (
              <Button size="lg" variant="secondary" onClick={recorder.pause} leftIcon={<Pause className="size-5" aria-hidden="true" />}>
                {t('rec.pause')}
              </Button>
            ) : (
              <Button size="lg" onClick={recorder.resume} leftIcon={<Play className="size-5" aria-hidden="true" />}>
                {t('rec.resume')}
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  function reviewView(current: Take) {
    const empty = current.blob.size === 0;
    // "Kể tiếp" appends to this same take (the recorder is only paused); a file or a finished take cannot grow.
    const canContinue = !fileTake && recorder.state.canContinue;
    return (
      <Card padding="none" className="p-5 sm:p-8 flex flex-col gap-5">
        <div>
          <h2 className="font-serif text-[1.5rem] font-semibold text-heritage-deep">{t('rec.reviewTitle')}</h2>
          <p className="mt-2 text-[1.25rem] leading-relaxed text-ink-soft">{t('rec.reviewDesc')}</p>
        </div>
        {recorder.state.autoStopped && !fileTake && (
          <p role="status" className="rounded-2xl bg-mint/70 px-5 py-3 text-[1.25rem] text-heritage-deep">
            {t('rec.autoStopped')}
          </p>
        )}
        {empty ? (
          <p role="alert" className="text-[1.25rem] font-medium text-terracotta">
            {t('errors.emptyTake')}
          </p>
        ) : (
          audioUrl && (
            <AudioPlayer src={audioUrl} duration={current.duration} title={current.fileName ? t('rec.fileTitle', { name: current.fileName }) : t('rec.playerTitle')} />
          )
        )}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          {!empty && (
            <Button size="xl" fullWidth onClick={() => requestKeep()} loading={busy}>
              {t('rec.keep')}
            </Button>
          )}
          <Button size="lg" variant="secondary" fullWidth disabled={busy} onClick={() => (empty ? resetTake() : setRedoOpen(true))} leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}>
            {t('rec.redo')}
          </Button>
        </div>
        {canContinue && (
          <Button size="lg" variant="ghost" fullWidth disabled={busy} onClick={recorder.continueTake} leftIcon={<Mic className="size-5 shrink-0" aria-hidden="true" />}>
            {t('rec.continue')}
          </Button>
        )}
      </Card>
    );
  }

  const thanks = (
    <p className="flex items-center justify-center gap-3 rounded-2xl bg-paper px-5 py-3 text-[1.25rem] font-semibold text-heritage-deep ring-1 ring-heritage/20">
      <Heart className="size-6 shrink-0 fill-terracotta text-terracotta" aria-hidden="true" />
      {t('rec.thanks', { who: address(narrator.display_name) })}
    </p>
  );

  function followUpView() {
    if (followUps.status === 'idle') return null;
    if (followUps.status === 'loading') {
      return (
        <p role="status" className="flex items-center justify-center gap-3 text-[1.25rem] text-ink-soft">
          <Spinner size="sm" decorative />
          {t('followUps.loading')}
        </p>
      );
    }
    if (followUps.items.length === 0) return null;
    const ai = followUps.source === 'ai';
    return (
      <section aria-labelledby="follow-ups-heading" className="flex flex-col gap-3 text-left">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id="follow-ups-heading" className="font-serif text-[1.4rem] font-semibold text-heritage-deep">
            {t('followUps.title')}
          </h3>
          {ai && <AiPill label={t('followUps.aiBadge')} />}
        </div>
        {ai && <p className="text-[1.25rem] text-ink-soft">{t('followUps.aiNote')}</p>}
        <ul className="flex flex-col gap-3">
          {followUps.items.map((item) => (
            <li key={item.questionId ?? item.text}>
              <button
                type="button"
                onClick={() => startFollowUp(item)}
                className={buttonClasses({ variant: 'secondary', size: 'xl', fullWidth: true, className: 'h-auto justify-start whitespace-normal py-4 text-left' })}
              >
                <Mic className="size-6 shrink-0 text-heritage" aria-hidden="true" />
                <span lang={lang}>{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  function phaseView() {
    switch (phase.kind) {
      case 'uploading':
        return (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-10 text-center">
            <Spinner size="lg" decorative />
            <p className="text-[1.35rem] font-semibold">{t('rec.uploading')}</p>
            <p className="text-[1.25rem] text-ink-soft">{t('rec.uploadingHint')}</p>
          </div>
        );
      case 'upload-failed': {
        const network = phase.code === 'network';
        const desc =
          phase.code === 'forbidden' ? t('errors.uploadForbidden') : phase.code === 'too_large' ? t('errors.uploadTooLarge') : phase.restored ? t('errors.restoredDesc') : network ? t('errors.networkDesc') : t('errors.uploadFailedDesc');
        const canRetry = phase.code === 'network' || phase.code === 'failed';
        return (
          <Card padding="none" className="p-5 sm:p-8 flex flex-col gap-4" role="alert">
            <h2 className="flex items-center gap-3 font-serif text-[1.5rem] font-semibold text-heritage-deep">
              <WifiOff className="size-7 shrink-0 text-terracotta" aria-hidden="true" />
              {phase.restored ? t('errors.restoredTitle') : network ? t('errors.networkTitle') : t('errors.uploadFailedTitle')}
            </h2>
            <p className="text-[1.25rem] leading-relaxed">{desc}</p>
            {phase.uploaded && <p className="text-[1.25rem] text-ink-soft">{t('errors.uploadedPart')}</p>}
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              {canRetry && (
                <Button size="xl" fullWidth onClick={() => void retryUpload()} leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}>
                  {t('errors.retryUpload')}
                </Button>
              )}
              <Button size="lg" variant="secondary" fullWidth onClick={() => setDiscardOpen(true)}>
                {t('errors.discard')}
              </Button>
            </div>
          </Card>
        );
      }
      case 'processing':
        return (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-6 text-center">
            {thanks}
            <Spinner size="lg" decorative />
            <p className="text-[1.45rem] font-semibold">{phase.step === 'transcribing' ? t('rec.transcribing') : t('rec.drafting')}</p>
            <p className="max-w-md text-[1.25rem] text-ink-soft">{t('rec.processingHint')}</p>
          </div>
        );
      case 'ai-failed':
        return (
          <Card padding="none" className="p-5 sm:p-8 flex flex-col gap-4" role="alert">
            <h2 className="font-serif text-[1.5rem] font-semibold text-heritage-deep">{t('errors.aiTitle')}</h2>
            <p className="rounded-2xl bg-mint/70 px-5 py-3 text-[1.25rem] font-medium text-heritage-deep">{t('errors.aiSafe')}</p>
            <p className="text-[1.25rem] leading-relaxed">{t(`errors.ai.${phase.code}` as 'errors.ai.internal')}</p>
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button size="xl" fullWidth onClick={() => void runAi(phase.recordingId)} leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}>
                {t('errors.aiRetry')}
              </Button>
              <Button size="lg" variant="secondary" fullWidth onClick={continueWithNext}>
                {t('errors.aiLater')}
              </Button>
            </div>
          </Card>
        );
      case 'done': {
        const first = phase.storyIds[0];
        return (
          <Card padding="none" tone="mint" className="p-5 sm:p-8 flex flex-col gap-5 text-center" role="status" aria-live="polite">
            {thanks}
            <h2 className="font-serif text-[1.7rem] font-semibold text-heritage-deep">{t('rec.doneTitle')}</h2>
            <p className="text-[1.25rem] leading-relaxed">{first ? (assisted ? t('rec.doneDescAssisted') : t('rec.doneDesc')) : t('rec.doneNoDraft')}</p>
            {first ? (
              <ButtonLink to={`/ban-nhap/${first}`} size="xl" fullWidth>
                {t('rec.view')}
              </ButtonLink>
            ) : (
              <ButtonLink to={`/ke-chuyen/cua-toi${narratorQuery}`} size="xl" fullWidth>
                {t('home.myStories')}
              </ButtonLink>
            )}
            {followUpView()}
            <Button size="lg" variant="secondary" fullWidth onClick={continueWithNext}>
              {t('rec.next')}
            </Button>
          </Card>
        );
      }
      default:
        return null;
    }
  }

  // These views draw their own card; the recorder / uploading / processing views sit on the soft panel.
  const cardView =
    phase.kind === 'upload-failed' || phase.kind === 'ai-failed' || phase.kind === 'done' || (phase.kind === 'record' && (take !== null || status === 'denied' || status === 'unsupported' || !supported));

  return (
    <div className={cn('flex flex-col gap-8', ELDER_CONTROLS)}>
      {assisted && <AssistedBanner name={narrator.display_name} />}
      <LeaveGuard when={unsaved && !leavingTo} />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <section aria-labelledby="question-heading" className="flex flex-col gap-5">
        {/* A topic this account can no longer read (disabled since) shows no label rather than a wrong "Kể tự do". */}
        {(topic || !session.topic_id) && (
          <p className="text-[1.25rem] font-medium text-ink-soft">{topic ? t('session.topic', { topic: pick({ vi: topic.title_vi, en: topic.title_en }) }) : t('session.freeTopic')}</p>
        )}
        <h1 id="question-heading" ref={headingRef} tabIndex={-1} lang={question || aiQuestion ? lang : undefined} className="font-serif text-[2rem] font-semibold leading-snug text-ink md:text-[2.4rem]">
          <span className="sr-only">{t('session.question')}: </span>
          {questionText}
        </h1>
        {aiQuestion && <AiPill label={t('followUps.aiBadge')} className="self-start" />}
        {showQuestionTools && (
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
            {(question || aiQuestion) && <ListenButton text={questionText} lang={lang} cache={audioCache} autoPlay={autoRead} />}
            {questions.length > 1 && (
              <Button size="lg" variant="ghost" className="-ml-3 px-3! sm:ml-0" onClick={changeQuestion} leftIcon={<Shuffle className="size-5" aria-hidden="true" />}>
                {t('session.change')}
              </Button>
            )}
            {(question || aiQuestion) && (
              <Button size="lg" variant="ghost" className="-ml-3 px-3! sm:ml-0" onClick={skipQuestion} leftIcon={<SkipForward className="size-5" aria-hidden="true" />}>
                {t('session.skip')}
              </Button>
            )}
          </div>
        )}
        {showQuestionTools && (question || aiQuestion) && (
          <div className="flex flex-col gap-1">
            <label htmlFor={autoReadId} className="inline-flex min-h-14 cursor-pointer items-center gap-4 self-start rounded-2xl text-[1.25rem] font-medium text-ink">
              <input
                id={autoReadId}
                type="checkbox"
                checked={autoRead}
                onChange={(e) => toggleAutoRead(e.target.checked)}
                aria-describedby={`${autoReadId}-hint`}
                className="size-7 shrink-0 cursor-pointer accent-heritage"
              />
              {t('session.autoRead')}
            </label>
            <p id={`${autoReadId}-hint`} className="pl-11 text-[1.25rem] text-ink-soft">
              {t('session.autoReadHint')}
            </p>
          </div>
        )}
      </section>

      <section className={cn(!cardView && 'rounded-[2rem] bg-paper/70 px-4 py-6 ring-1 ring-line sm:px-6 md:px-10 md:py-8')}>
        {phase.kind !== 'record' ? phaseView() : take ? reviewView(take) : recorderView()}
      </section>

      <div className="flex flex-col items-center gap-3 border-t border-line pt-6 sm:flex-row sm:justify-center">
        <Button size="lg" variant="secondary" onClick={() => setEndOpen(true)} disabled={phase.kind === 'uploading'}>
          {t('session.end')}
        </Button>
      </div>

      <NarratorHelpButton onOpen={() => setHowToOpen(true)} />
      <HowToGuide open={howToOpen} onClose={closeHowTo} />
      <Dialog
        open={consentFor !== null}
        onClose={() => setConsentFor(null)}
        title={t('consent.title')}
        description={t('consent.intro')}
        size="md"
        className={DIALOG_ELDER}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button size="lg" variant="secondary" onClick={() => setConsentFor(null)}>
              {t('consent.later')}
            </Button>
            <Button size="lg" onClick={acceptConsent}>
              {t('consent.agree')}
            </Button>
          </div>
        }
      >
        <ul className="flex list-disc flex-col gap-3 pl-6 text-[1.25rem] leading-relaxed">
          <li>{t('consent.what')}</li>
          <li>{t('consent.where')}</li>
          <li>{t('consent.how')}</li>
          <li>{t('consent.public')}</li>
        </ul>
      </Dialog>
      <Dialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        title={t('end.title')}
        size="sm"
        className={DIALOG_ELDER}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button size="lg" variant="secondary" onClick={() => setEndOpen(false)} disabled={ending}>
              {t('end.cancel')}
            </Button>
            <Button size="lg" onClick={() => void finish()} loading={ending}>
              {t('end.confirm')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-heritage-deep">{t(keptKey(kept), { count: kept, who: address(narrator.display_name) })}</p>
          {kept > 0 && <p>{t('end.thanks')}</p>}
          {unsaved && (
            <p role="alert" className="font-medium text-terracotta">
              {t('end.unsaved')}
            </p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={redoOpen}
        onClose={() => setRedoOpen(false)}
        title={t('rec.redoTitle')}
        description={t('rec.redoDesc')}
        size="sm"
        className={DIALOG_ELDER}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button size="lg" variant="secondary" onClick={() => setRedoOpen(false)}>
              {t('rec.redoCancel')}
            </Button>
            <Button
              size="lg"
              variant="terracotta"
              onClick={() => {
                setRedoOpen(false);
                resetTake();
              }}
            >
              {t('rec.redoConfirm')}
            </Button>
          </div>
        }
      />
      <Dialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={t('errors.discardTitle')}
        description={t('errors.discardDesc')}
        size="sm"
        className={DIALOG_ELDER}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button size="lg" variant="secondary" onClick={() => setDiscardOpen(false)}>
              {t('errors.discardCancel')}
            </Button>
            <Button size="lg" variant="terracotta" onClick={() => void discardPending()}>
              {t('errors.discardConfirm')}
            </Button>
          </div>
        }
      />
    </div>
  );
}
