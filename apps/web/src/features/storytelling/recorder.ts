// Microphone recorder: a framework-free AudioRecorder class (MediaRecorder + AnalyserNode level meter)
// and the useRecorder() hook that drives it through recorderReducer.
import { MAX_RECORDING_SECONDS } from '@lh/shared';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { track } from '@/lib/events';
import { DurationClock } from './clock';
import { initialRecorderState, recorderReducer, type RecorderErrorCode } from './recorderReducer';

// Chrome/Firefox/Android: webm; Safari/iOS: mp4 (AAC). Last entries cover older Safari builds.
export const MIME_PREFERENCE = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac'] as const;
export const WARN_AT_SECONDS = 540;

export interface RecordingResult {
  blob: Blob;
  /** seconds, pauses excluded */
  duration: number;
  mime: string;
}

export class RecorderError extends Error {
  constructor(public code: 'denied' | RecorderErrorCode) {
    super(code);
  }
}

/** First supported MIME type in preference order, or undefined to let the browser choose. */
export function pickMimeType(isTypeSupported: (type: string) => boolean = (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)): string | undefined {
  try {
    return MIME_PREFERENCE.find((m) => isTypeSupported(m));
  } catch {
    return undefined;
  }
}

export function isRecordingSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';
}

type AudioContextCtor = typeof AudioContext;

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Uint8Array<ArrayBuffer> | null = null;
  private mime: string | undefined;
  private flushWaiters: (() => void)[] = [];
  readonly clock: DurationClock;
  /** Called once when the microphone goes away mid-take (unplugged, phone call, OS took it). */
  onInterrupted: (() => void) | null = null;

  constructor(now?: () => number) {
    this.clock = new DurationClock(now);
  }

  /** Asks for the microphone and starts recording. Throws RecorderError('denied' | 'no_device' | 'failed'). */
  async start(): Promise<void> {
    this.dispose();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') throw new RecorderError('denied');
      if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') throw new RecorderError('no_device');
      throw new RecorderError('failed');
    }
    try {
      this.mime = pickMimeType();
      this.recorder = new MediaRecorder(this.stream, this.mime ? { mimeType: this.mime } : undefined);
      this.chunks = [];
      this.recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
        const waiters = this.flushWaiters;
        this.flushWaiters = [];
        waiters.forEach((w) => w());
      };
      const stream = this.stream;
      const interrupted = () => {
        if (this.stream !== stream) return;
        const cb = this.onInterrupted;
        this.onInterrupted = null;
        cb?.();
      };
      stream.getTracks().forEach((track) => track.addEventListener?.('ended', interrupted, { once: true }));
      this.recorder.addEventListener?.('error', interrupted);
      this.recorder.start(1000);
      this.clock.start();
      this.setupMeter(this.stream);
    } catch {
      this.dispose();
      throw new RecorderError('failed');
    }
  }

  /** The level meter really listens (an AudioContext that is running); otherwise level() means nothing. */
  hasMeter(): boolean {
    return !!this.analyser && this.ctx?.state === 'running';
  }

  private setupMeter(stream: MediaStream) {
    const Ctor: AudioContextCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      const source = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      source.connect(this.analyser);
      this.buffer = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
      // Safari creates the context "suspended" outside a tap handler (we are after an await): wake it up.
      if (this.ctx.state === 'suspended') void this.ctx.resume?.().catch(() => {});
    } catch {
      this.analyser = null; // meter is optional
    }
  }

  pause(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.pause();
      this.clock.pause();
    }
  }

  resume(): void {
    if (this.recorder?.state === 'paused') {
      this.recorder.resume();
      this.clock.resume();
    }
  }

  /** Input loudness 0..1 (RMS of the waveform, scaled). 0 when paused or unavailable. */
  level(): number {
    if (!this.analyser || !this.buffer || this.recorder?.state !== 'recording') return 0;
    this.analyser.getByteTimeDomainData(this.buffer);
    let sum = 0;
    for (const v of this.buffer) {
      const x = (v - 128) / 128;
      sum += x * x;
    }
    return Math.min(1, Math.sqrt(sum / this.buffer.length) * 3);
  }

  elapsedSeconds(): number {
    return this.clock.elapsedSeconds();
  }

  /**
   * "Dừng" for listening back: pauses (nothing more is captured) and resolves with everything recorded so far,
   * keeping the recorder so resume() can append to the same take. stop() still has to finish it.
   */
  async preview(flushTimeoutMs = 1500): Promise<RecordingResult> {
    const rec = this.recorder;
    if (!rec || rec.state === 'inactive') return this.stop();
    this.pause();
    // Ask for the buffered tail; a browser that never answers must not hang the screen.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, flushTimeoutMs);
      this.flushWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
      try {
        rec.requestData();
      } catch {
        clearTimeout(timer);
        resolve();
      }
    });
    const mime = rec.mimeType || this.mime || 'audio/webm';
    return { blob: new Blob(this.chunks, { type: mime }), duration: this.clock.elapsedMs() / 1000, mime };
  }

  /** Stops recording, releases the microphone and resolves with the take. */
  stop(): Promise<RecordingResult> {
    const rec = this.recorder;
    const duration = this.clock.stop() / 1000;
    if (!rec || rec.state === 'inactive') {
      const result = { blob: new Blob(this.chunks, { type: this.mime ?? 'audio/webm' }), duration, mime: this.mime ?? 'audio/webm' };
      this.dispose();
      return Promise.resolve(result);
    }
    return new Promise((resolve) => {
      rec.addEventListener(
        'stop',
        () => {
          const mime = rec.mimeType || this.mime || 'audio/webm';
          const blob = new Blob(this.chunks, { type: mime });
          this.dispose();
          resolve({ blob, duration, mime });
        },
        { once: true },
      );
      rec.stop();
    });
  }

  /** Releases the microphone tracks and the audio graph. Safe to call more than once. */
  dispose(): void {
    this.onInterrupted = null;
    const waiters = this.flushWaiters;
    this.flushWaiters = [];
    waiters.forEach((w) => w());
    if (this.recorder && this.recorder.state !== 'inactive') {
      try {
        this.recorder.ondataavailable = null;
        this.recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    this.recorder = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close().catch(() => {});
    this.ctx = null;
    this.analyser = null;
    this.buffer = null;
  }
}

export interface UseRecorderOptions {
  maxSeconds?: number;
}

/** Above this the microphone hears the narrator; "quiet" means nothing above it for QUIET_AFTER_MS. */
const LOUD_LEVEL = 0.06;
const QUIET_AFTER_MS = 2500;

/**
 * React wrapper: state machine + live elapsed time, a silence flag and auto-stop at maxSeconds.
 * The live level is read on demand (readLevel) by the meter itself, so the screen does not re-render 8×/s while recording:
 * state here changes only when the shown second, the quiet flag or the metered flag changes.
 */
export function useRecorder({ maxSeconds = MAX_RECORDING_SECONDS }: UseRecorderOptions = {}) {
  const [state, dispatch] = useReducer(recorderReducer, initialRecorderState);
  const [elapsed, setElapsed] = useState(0);
  const [quiet, setQuiet] = useState(false);
  const [metered, setMetered] = useState(false);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const recRef = useRef<AudioRecorder | null>(null);
  const stoppingRef = useRef(false);
  /** Latest status, read by stop(): a stop only counts when the microphone was actually capturing. */
  const statusRef = useRef(state.status);
  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);
  /** Bumped by reset/unmount so a permission prompt answered late never leaves the microphone on. */
  const genRef = useRef(0);

  /** Finishes the take for good and releases the microphone. */
  const finalize = useCallback(async (): Promise<RecordingResult | null> => {
    const rec = recRef.current;
    if (!rec) return null;
    recRef.current = null;
    const r = await rec.stop();
    setResult(r);
    return r;
  }, []);

  /** "Dừng": listen back with the recorder paused (Kể tiếp can append); the time limit or a lost mic ends it. */
  const stop = useCallback(
    async (auto = false, final = auto) => {
      const rec = recRef.current;
      if (!rec || stoppingRef.current) return;
      stoppingRef.current = true;
      // The mic can drop while listening back (already stopped): finishing the take then is not a new stop.
      const wasCapturing = statusRef.current === 'recording' || statusRef.current === 'paused';
      try {
        let r = final ? await rec.stop() : await rec.preview();
        let ended = final;
        // A browser that cannot hand over the audio so far (no requestData, nothing flushed yet): finish the take
        // instead of showing an empty one. "Kể tiếp" is then not offered.
        if (!ended && r.blob.size === 0) {
          r = await rec.stop();
          ended = true;
        }
        if (ended) recRef.current = null;
        setElapsed(r.duration);
        setResult(r);
        dispatch({ type: 'STOP', auto, canContinue: !ended });
        if (wasCapturing) track('record_stop');
      } finally {
        stoppingRef.current = false;
      }
    },
    [],
  );

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      dispatch({ type: 'UNSUPPORTED' });
      return;
    }
    dispatch({ type: 'REQUEST' });
    setResult(null);
    setElapsed(0);
    const gen = ++genRef.current;
    const rec = new AudioRecorder();
    try {
      await rec.start();
      if (gen !== genRef.current) {
        rec.dispose(); // the screen moved on while the browser was asking
        return;
      }
      recRef.current = rec;
      rec.onInterrupted = () => void stop(false, true);
      setMetered(rec.hasMeter());
      dispatch({ type: 'GRANTED' });
      track('record_start');
    } catch (e) {
      rec.dispose();
      if (gen !== genRef.current) return;
      const code = e instanceof RecorderError ? e.code : 'failed';
      dispatch(code === 'denied' ? { type: 'DENIED' } : { type: 'FAIL', error: code });
    }
  }, [stop]);

  const pause = useCallback(() => {
    recRef.current?.pause();
    dispatch({ type: 'PAUSE' });
  }, []);

  const resume = useCallback(() => {
    recRef.current?.resume();
    dispatch({ type: 'RESUME' });
  }, []);

  /** "Kể tiếp" from the review: same recorder, same take, the clock carries on. */
  const continueTake = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    rec.resume();
    setResult(null);
    dispatch({ type: 'CONTINUE' });
    // Every captured segment is a start/stop pair, so "Kể tiếp" counts as a start (pause/resume does not).
    track('record_start');
  }, []);

  const reset = useCallback(() => {
    genRef.current++;
    recRef.current?.dispose();
    recRef.current = null;
    setResult(null);
    setElapsed(0);
    dispatch({ type: 'RESET' });
  }, []);

  const readLevel = useCallback(() => recRef.current?.level() ?? 0, []);

  // Live clock + silence detection while the microphone is on. Setting an unchanged value does not re-render.
  // "Quiet" only after ~2.5 s of silence, so the words do not flicker; without a working meter (e.g. a suspended
  // AudioContext) silence cannot be told apart, so it stays false.
  useEffect(() => {
    if (state.status !== 'recording' && state.status !== 'paused') {
      setQuiet(false);
      return;
    }
    let lastLoud = 0;
    const id = window.setInterval(() => {
      const rec = recRef.current;
      if (!rec) return;
      const secs = rec.elapsedSeconds();
      const hasMeter = rec.hasMeter();
      setElapsed(Math.floor(secs)); // the clock shows whole seconds: re-render once a second, not every tick
      setMetered(hasMeter);
      if (state.status === 'recording' && hasMeter) {
        const now = Date.now();
        if (rec.level() > LOUD_LEVEL || lastLoud === 0) lastLoud = now;
        setQuiet(now - lastLoud > QUIET_AFTER_MS);
      } else {
        lastLoud = 0;
        setQuiet(false);
      }
      if (secs >= maxSeconds) void stop(true);
    }, 120);
    return () => window.clearInterval(id);
  }, [state.status, maxSeconds, stop]);

  // Always release the microphone when the component goes away (also a permission prompt still open).
  useEffect(
    () => () => {
      genRef.current++;
      recRef.current?.dispose();
      recRef.current = null;
    },
    [],
  );

  return { state, elapsed, quiet, metered, readLevel, result, start, pause, resume, continueTake, finalize, stop: () => stop(false), reset };
}
