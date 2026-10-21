// Microphone recorder: a framework-free AudioRecorder class (MediaRecorder + AnalyserNode level meter)
// and the useRecorder() hook that drives it through recorderReducer.
import { MAX_RECORDING_SECONDS } from '@lh/shared';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { DurationClock } from './clock';
import { initialRecorderState, recorderReducer, type RecorderErrorCode } from './recorderReducer';

export const MIME_PREFERENCE = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'] as const;
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
  readonly clock: DurationClock;

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
      };
      this.recorder.start(1000);
      this.clock.start();
      this.setupMeter(this.stream);
    } catch {
      this.dispose();
      throw new RecorderError('failed');
    }
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

/** React wrapper: state machine + live elapsed time and level, auto-stop at maxSeconds. */
export function useRecorder({ maxSeconds = MAX_RECORDING_SECONDS }: UseRecorderOptions = {}) {
  const [state, dispatch] = useReducer(recorderReducer, initialRecorderState);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const recRef = useRef<AudioRecorder | null>(null);
  const stoppingRef = useRef(false);

  const stop = useCallback(async (auto = false) => {
    const rec = recRef.current;
    if (!rec || stoppingRef.current) return;
    stoppingRef.current = true;
    try {
      const r = await rec.stop();
      setElapsed(r.duration);
      setLevel(0);
      setResult(r);
      dispatch({ type: 'STOP', auto });
    } finally {
      recRef.current = null;
      stoppingRef.current = false;
    }
  }, []);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      dispatch({ type: 'UNSUPPORTED' });
      return;
    }
    dispatch({ type: 'REQUEST' });
    setResult(null);
    setElapsed(0);
    const rec = new AudioRecorder();
    try {
      await rec.start();
      recRef.current = rec;
      dispatch({ type: 'GRANTED' });
    } catch (e) {
      rec.dispose();
      const code = e instanceof RecorderError ? e.code : 'failed';
      dispatch(code === 'denied' ? { type: 'DENIED' } : { type: 'FAIL', error: code });
    }
  }, []);

  const pause = useCallback(() => {
    recRef.current?.pause();
    dispatch({ type: 'PAUSE' });
  }, []);

  const resume = useCallback(() => {
    recRef.current?.resume();
    dispatch({ type: 'RESUME' });
  }, []);

  const reset = useCallback(() => {
    recRef.current?.dispose();
    recRef.current = null;
    setResult(null);
    setElapsed(0);
    setLevel(0);
    dispatch({ type: 'RESET' });
  }, []);

  // Live clock + level meter while the microphone is on.
  useEffect(() => {
    if (state.status !== 'recording' && state.status !== 'paused') return;
    const id = window.setInterval(() => {
      const rec = recRef.current;
      if (!rec) return;
      const secs = rec.elapsedSeconds();
      setElapsed(secs);
      setLevel(rec.level());
      if (secs >= maxSeconds) void stop(true);
    }, 120);
    return () => window.clearInterval(id);
  }, [state.status, maxSeconds, stop]);

  // Always release the microphone when the component goes away.
  useEffect(() => () => recRef.current?.dispose(), []);

  return { state, elapsed, level, result, start, pause, resume, stop: () => stop(false), reset };
}
