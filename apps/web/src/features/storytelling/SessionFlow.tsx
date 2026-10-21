// The question + recording screen: one question, one primary action at a time.
// record → review → uploading → processing → done, with B16 error states at every step.
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, type AiErrorCode } from '@lh/shared';
import { CircleAlert, CircleHelp, FileAudio, Heart, Mic, Pause, Play, RefreshCw, Shuffle, SkipForward, Sparkles, Square, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AudioPlayer, Button, ButtonLink, buttonClasses, Card, Dialog, Spinner } from '@/components/ui';
import { aiErrorKey, suggestQuestions, transcribeAndDraft } from '@/features/ai/client';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { useAddress } from './address';
import { formatClock } from './clock';
import { AssistedBanner, ELDER_CONTROLS } from './components';
import { endSession, fetchJobStatus, type NarratorInfo, type Question, type SessionRow, type Topic } from './data';
import { promptIn, resolveFollowUps, seededFollowUps, textKey, type FollowUp, type FollowUpState } from './followUps';
import { HowToGuide } from './HowToGuide';
import { LeaveGuard } from './LeaveGuard';
import { ListenButton } from './ListenButton';
import { getPendingStore, pendingKey, type PendingUpload } from './pendingStore';
import { markHowToSeen, readAutoRead, shouldShowHowTo, writeAutoRead } from './prefs';
import { initialQuestion, nextQuestion } from './questions';
import { isRecordingSupported, useRecorder, WARN_AT_SECONDS, type RecordingResult } from './recorder';
import { isCapturing } from './recorderReducer';
import { keptKey } from './summary';
import { createAudioCache } from './tts';
import { supabaseUploadBackend, uploadPending, UploadError, type UploadErrorCode } from './upload';

/** Dialogs render in a portal, outside narrator mode: give their text and buttons the same size. */
const DIALOG_ELDER = `${ELDER_CONTROLS} [&_p]:text-[1.17rem]`;

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

const AUDIO_EXT = /\.(m4a|mp3|wav|ogg|oga|opus|webm|aac|flac|amr|3gp)$/i;

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
function AiPill({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full bg-[#fbecc8] px-4 py-1.5 text-[1.17rem] font-semibold text-[#5a3e0a] ring-1 ring-[#e9cf8f]', className)}>
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
  const [quiet, setQuiet] = useState(false);
  const pendingRef = useRef<PendingUpload | null>(null);
  const lastLoudRef = useRef(0);
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

  const question = questions.find((q) => q.id === currentId) ?? null;
  const questionText = aiQuestion ?? (question ? promptIn(question, lang) : t('session.freePrompt'));
  const key = pendingKey(session.id, aiQuestion ? textKey(aiQuestion) : currentId);
  const take: Take | null = fileTake ?? recorder.result;
  const status = recorder.state.status;
  const supported = isRecordingSupported();
  const narratorQuery = assisted ? `?narrator=${encodeURIComponent(narrator.id)}` : '';

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

  // A take for this question may still be waiting on this device (network failure, closed tab…).
  useEffect(() => {
    let alive = true;
    void store.get(key).then((found) => {
      if (!alive || !found) return;
      pendingRef.current = found;
      setPhase((p) => (p.kind === 'record' ? { kind: 'upload-failed', code: 'network', uploaded: found.uploaded, restored: true } : p));
    });
    return () => {
      alive = false;
    };
  }, [key, store]);

  // "Chưa nghe rõ tiếng" only after ~2.5 s of silence, so the words do not flicker.
  useEffect(() => {
    if (status !== 'recording') {
      setQuiet(false);
      return;
    }
    const now = Date.now();
    if (recorder.level > 0.06 || lastLoudRef.current === 0) lastLoudRef.current = now;
    setQuiet(now - lastLoudRef.current > 2500);
  }, [recorder.level, status]);

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
    if (currentId) nextUsed.add(currentId);
    setUsed(nextUsed);
    goToQuestion(nextQuestion(questions, currentId, nextUsed), t('session.changed'));
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
    if (!take) return;
    const pending: PendingUpload = {
      key,
      attemptId: newAttemptId(),
      blob: take.blob,
      mime: take.mime,
      duration: take.duration,
      familyId: session.family_id,
      narratorId: session.narrator_id,
      sessionId: session.id,
      questionId: currentId,
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
    const latest = (await store.get(key).catch(() => null)) ?? pendingRef.current;
    if (!latest) {
      setPhase({ kind: 'record' });
      return;
    }
    pendingRef.current = latest;
    await runUpload(latest);
  }

  async function discardPending() {
    await store.delete(key).catch(() => {});
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
    setEnding(true);
    const sb = getSupabase();
    if (sb) await endSession(sb, session.id).catch(() => {});
    setEndOpen(false);
    navigate(`/ke-chuyen${narratorQuery}`);
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
    if (!file.type.startsWith('audio/') && !AUDIO_EXT.test(file.name)) return setFileError(t('errors.fileNotAudio'));
    if (file.size > MAX_AUDIO_BYTES) return setFileError(t('errors.fileTooLarge'));
    const duration = await probeDuration(file);
    if (duration !== null && duration > MAX_RECORDING_SECONDS + 5) return setFileError(t('errors.fileTooLong'));
    const mime = file.type.startsWith('audio/') ? file.type : 'audio/mpeg';
    setFileTake({ blob: file, duration: duration ?? 0, mime, fileName: file.name });
  }

  const unsaved = isCapturing(status) || !!take || phase.kind === 'uploading' || phase.kind === 'upload-failed';
  const showQuestionTools = phase.kind === 'record' && !take && !isCapturing(status);

  // ---------------------------------------------------------------------------
  // Pieces
  // ---------------------------------------------------------------------------

  const filePicker = (
    <div className="flex flex-col gap-2">
      <label htmlFor={fileInputId} className="inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-paper px-7 text-[1.17rem] font-semibold text-ink ring-1 ring-line hover:text-heritage hover:ring-heritage/60 focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-terracotta">
        <FileAudio className="size-6" aria-hidden="true" />
        {t('errors.fileLabel')}
        <input id={fileInputId} type="file" accept="audio/*" className="sr-only" onChange={(e) => void onFile(e)} aria-describedby={`${fileInputId}-hint`} />
      </label>
      <p id={`${fileInputId}-hint`} className="text-center text-[1.17rem] text-ink-soft">
        {t('errors.fileHint')}
      </p>
      {fileError && (
        <p role="alert" className="flex items-center justify-center gap-2 text-[1.17rem] font-medium text-terracotta">
          <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
          {fileError}
        </p>
      )}
    </div>
  );

  function recorderView() {
    if (!supported || status === 'unsupported') {
      return (
        <Card padding="lg" className="flex flex-col gap-5 text-center">
          <h2 className="font-serif text-[1.5rem] font-semibold text-heritage-deep">{t('errors.unsupportedTitle')}</h2>
          <p className="text-[1.2rem] leading-relaxed text-ink">{t('errors.unsupportedDesc')}</p>
          {filePicker}
        </Card>
      );
    }
    if (status === 'denied') {
      return (
        <Card padding="lg" className="flex flex-col gap-5">
          <h2 className="font-serif text-[1.5rem] font-semibold text-heritage-deep">{t('errors.deniedTitle')}</h2>
          <p className="text-[1.2rem] leading-relaxed">{t('errors.deniedDesc')}</p>
          <ol className="list-decimal space-y-2 pl-7 text-[1.2rem] leading-relaxed">
            <li>{t('errors.deniedStep1')}</li>
            <li>{t('errors.deniedStep2')}</li>
            <li>{t('errors.deniedStep3')}</li>
          </ol>
          <p className="text-[1.17rem] text-ink-soft">{t('errors.deniedIos')}</p>
          <Button size="lg" onClick={() => void recorder.start()} leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}>
            {t('errors.retryMic')}
          </Button>
          {filePicker}
        </Card>
      );
    }

    const recording = status === 'recording';
    const live = recording || status === 'paused';
    const warn = live && recorder.elapsed >= WARN_AT_SECONDS;
    const levelPct = Math.round(recorder.level * 100);

    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <p role="status" aria-live="polite" className="flex items-center gap-3 text-[1.3rem] font-semibold text-ink">
          {recording && <span aria-hidden="true" className="size-3.5 rounded-full bg-terracotta motion-safe:animate-pulse" />}
          {status === 'paused' && <Pause className="size-5" aria-hidden="true" />}
          {t(`rec.status.${status === 'error' ? 'idle' : status}` as 'rec.status.idle')}
        </p>

        {status === 'error' && (
          <p role="alert" className="flex items-center gap-2 text-[1.17rem] font-medium text-terracotta">
            <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
            {recorder.state.error === 'no_device' ? t('errors.noDevice') : t('errors.micFailed')}
          </p>
        )}

        {!live ? (
          <>
            <button
              type="button"
              onClick={() => void recorder.start()}
              disabled={status === 'requesting'}
              aria-describedby="rec-start-hint"
              className="group flex flex-col items-center gap-3 rounded-[2rem] p-2 disabled:opacity-60"
            >
              <span className="flex size-[7.5rem] items-center justify-center rounded-full bg-heritage text-cream shadow-[0_12px_30px_-12px_rgba(31,77,58,0.6)] transition-transform group-hover:bg-heritage-deep group-active:scale-95">
                {status === 'requesting' ? <Spinner size="lg" decorative /> : <Mic className="size-12" aria-hidden="true" />}
              </span>
              <span className="text-[1.35rem] font-semibold text-heritage-deep">{t('rec.start')}</span>
            </button>
            <p id="rec-start-hint" className="max-w-md text-[1.17rem] text-ink-soft">
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
              <p className="mt-2 text-[1.17rem] text-ink-soft">{t('rec.elapsedValue', { time: formatClock(recorder.elapsed) })}</p>
            </div>

            <div className="w-full max-w-sm">
              <div
                role="meter"
                aria-label={t('rec.level')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={levelPct}
                className="h-4 w-full overflow-hidden rounded-full bg-line/60"
              >
                <div className="h-full rounded-full bg-heritage transition-[width] duration-100" style={{ width: `${Math.max(recording ? 3 : 0, levelPct)}%` }} />
              </div>
              <p className="mt-2 text-[1.17rem] text-ink-soft">{!recording ? t('rec.levelPaused') : quiet ? t('rec.levelQuiet') : t('rec.levelGood')}</p>
            </div>

            {warn && (
              <p role="alert" className="rounded-2xl bg-[#fbecc8] px-5 py-3 text-[1.17rem] font-medium text-[#5a3e0a]">
                {t('rec.warn')}
              </p>
            )}

            <button type="button" onClick={() => void recorder.stop()} aria-label={t('rec.stopLabel')} className="group relative flex flex-col items-center gap-3 rounded-[2rem] p-2">
              <span className="relative flex size-[7.5rem] items-center justify-center rounded-full bg-terracotta text-cream group-active:scale-95">
                {recording && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-terracotta/40 motion-safe:animate-ping" />}
                <Square className="relative size-11 fill-current" aria-hidden="true" />
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
    return (
      <Card padding="lg" className="flex flex-col gap-5">
        <div>
          <h2 className="font-serif text-[1.5rem] font-semibold text-heritage-deep">{t('rec.reviewTitle')}</h2>
          <p className="mt-2 text-[1.17rem] leading-relaxed text-ink-soft">{t('rec.reviewDesc')}</p>
        </div>
        {recorder.state.autoStopped && !fileTake && (
          <p role="status" className="rounded-2xl bg-mint/70 px-5 py-3 text-[1.17rem] text-heritage-deep">
            {t('rec.autoStopped')}
          </p>
        )}
        {empty ? (
          <p role="alert" className="text-[1.17rem] font-medium text-terracotta">
            {t('errors.emptyTake')}
          </p>
        ) : (
          audioUrl && (
            <AudioPlayer src={audioUrl} duration={current.duration} title={current.fileName ? t('rec.fileTitle', { name: current.fileName }) : t('rec.playerTitle')} />
          )
        )}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          {!empty && (
            <Button size="xl" fullWidth onClick={() => void keep()}>
              {t('rec.keep')}
            </Button>
          )}
          <Button size="lg" variant="secondary" fullWidth onClick={() => (empty ? resetTake() : setRedoOpen(true))} leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}>
            {t('rec.redo')}
          </Button>
        </div>
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
        <p role="status" className="flex items-center justify-center gap-3 text-[1.17rem] text-ink-soft">
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
        {ai && <p className="text-[1.17rem] text-ink-soft">{t('followUps.aiNote')}</p>}
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
            <p className="text-[1.17rem] text-ink-soft">{t('rec.uploadingHint')}</p>
          </div>
        );
      case 'upload-failed': {
        const network = phase.code === 'network';
        const desc =
          phase.code === 'forbidden' ? t('errors.uploadForbidden') : phase.code === 'too_large' ? t('errors.uploadTooLarge') : phase.restored ? t('errors.restoredDesc') : network ? t('errors.networkDesc') : t('errors.uploadFailedDesc');
        const canRetry = phase.code === 'network' || phase.code === 'failed';
        return (
          <Card padding="lg" className="flex flex-col gap-4" role="alert">
            <h2 className="flex items-center gap-3 font-serif text-[1.5rem] font-semibold text-heritage-deep">
              <WifiOff className="size-7 shrink-0 text-terracotta" aria-hidden="true" />
              {phase.restored ? t('errors.restoredTitle') : network ? t('errors.networkTitle') : t('errors.uploadFailedTitle')}
            </h2>
            <p className="text-[1.2rem] leading-relaxed">{desc}</p>
            {phase.uploaded && <p className="text-[1.17rem] text-ink-soft">{t('errors.uploadedPart')}</p>}
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
            <p className="max-w-md text-[1.17rem] text-ink-soft">{t('rec.processingHint')}</p>
          </div>
        );
      case 'ai-failed':
        return (
          <Card padding="lg" className="flex flex-col gap-4" role="alert">
            <h2 className="font-serif text-[1.5rem] font-semibold text-heritage-deep">{t('errors.aiTitle')}</h2>
            <p className="rounded-2xl bg-mint/70 px-5 py-3 text-[1.2rem] font-medium text-heritage-deep">{t('errors.aiSafe')}</p>
            <p className="text-[1.2rem] leading-relaxed">{t(`errors.ai.${phase.code}` as 'errors.ai.internal')}</p>
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
          <Card padding="lg" tone="mint" className="flex flex-col gap-5 text-center" role="status" aria-live="polite">
            {thanks}
            <h2 className="font-serif text-[1.7rem] font-semibold text-heritage-deep">{t('rec.doneTitle')}</h2>
            <p className="text-[1.2rem] leading-relaxed">{first ? (assisted ? t('rec.doneDescAssisted') : t('rec.doneDesc')) : t('rec.doneNoDraft')}</p>
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

  return (
    <div className={cn('flex flex-col gap-8', ELDER_CONTROLS)}>
      {assisted && <AssistedBanner name={narrator.display_name} />}
      <LeaveGuard when={unsaved} />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <section aria-labelledby="question-heading" className="flex flex-col gap-5">
        <p className="text-[1.17rem] font-medium text-ink-soft">{topic ? t('session.topic', { topic: pick({ vi: topic.title_vi, en: topic.title_en }) }) : t('session.freeTopic')}</p>
        <h1 id="question-heading" ref={headingRef} tabIndex={-1} lang={question || aiQuestion ? lang : undefined} className="font-serif text-[2rem] font-semibold leading-snug text-ink md:text-[2.4rem]">
          <span className="sr-only">{t('session.question')}: </span>
          {questionText}
        </h1>
        {aiQuestion && <AiPill label={t('followUps.aiBadge')} className="self-start" />}
        {showQuestionTools && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {(question || aiQuestion) && <ListenButton text={questionText} lang={lang} cache={audioCache} autoPlay={autoRead} />}
            {questions.length > 1 && (
              <Button size="lg" variant="ghost" onClick={changeQuestion} leftIcon={<Shuffle className="size-5" aria-hidden="true" />}>
                {t('session.change')}
              </Button>
            )}
            {questions.length > 1 && (
              <Button size="lg" variant="ghost" onClick={skipQuestion} leftIcon={<SkipForward className="size-5" aria-hidden="true" />}>
                {t('session.skip')}
              </Button>
            )}
          </div>
        )}
        {showQuestionTools && (question || aiQuestion) && (
          <div className="flex flex-col gap-1">
            <label htmlFor={autoReadId} className="inline-flex min-h-14 cursor-pointer items-center gap-4 self-start rounded-2xl px-1 text-[1.17rem] font-medium text-ink">
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
            <p id={`${autoReadId}-hint`} className="pl-12 text-[1.17rem] text-ink-soft">
              {t('session.autoReadHint')}
            </p>
          </div>
        )}
      </section>

      <section className={cn('rounded-[2rem] bg-paper/70 px-5 py-8 ring-1 ring-line md:px-10')}>
        {phase.kind !== 'record' ? phaseView() : take ? reviewView(take) : recorderView()}
      </section>

      <div className="flex flex-col items-center gap-3 border-t border-line pt-6 sm:flex-row sm:justify-center">
        <Button size="lg" variant="secondary" onClick={() => setEndOpen(true)} disabled={phase.kind === 'uploading'}>
          {t('session.end')}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => setHowToOpen(true)} leftIcon={<CircleHelp className="size-5" aria-hidden="true" />}>
          {t('session.howtoAgain')}
        </Button>
      </div>

      <HowToGuide open={howToOpen} onClose={closeHowTo} />
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
