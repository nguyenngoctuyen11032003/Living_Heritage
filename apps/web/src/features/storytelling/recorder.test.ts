import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioRecorder, pickMimeType, RecorderError } from './recorder';

class FakeMediaRecorder extends EventTarget {
  static supported = new Set(['audio/mp4']);
  static isTypeSupported = (t: string) => FakeMediaRecorder.supported.has(t);
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  constructor(_stream: unknown, opts?: { mimeType?: string }) {
    super();
    this.mimeType = opts?.mimeType ?? 'audio/webm';
  }
  start() {
    this.state = 'recording';
  }
  pause() {
    this.state = 'paused';
  }
  resume() {
    this.state = 'recording';
  }
  requestData() {
    queueMicrotask(() => this.ondataavailable?.({ data: new Blob(['ab']) }));
  }
  stop() {
    this.ondataavailable?.({ data: new Blob(['xyz']) });
    this.state = 'inactive';
    this.dispatchEvent(new Event('stop'));
  }
}

describe('pickMimeType', () => {
  it('prefers opus webm, then webm, then mp4, else browser default', () => {
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickMimeType((t) => t === 'audio/webm')).toBe('audio/webm');
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType(() => false)).toBeUndefined();
  });
});

describe('AudioRecorder', () => {
  const stopTrack = vi.fn();
  let track: EventTarget & { stop: typeof stopTrack };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          track = Object.assign(new EventTarget(), { stop: stopTrack });
          return { getTracks: () => [track] };
        }),
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    stopTrack.mockReset();
  });

  it('records, excludes paused time and releases the microphone', async () => {
    const rec = new AudioRecorder();
    await rec.start();
    vi.advanceTimersByTime(3000);
    rec.pause();
    vi.advanceTimersByTime(10_000);
    rec.resume();
    vi.advanceTimersByTime(2000);
    const result = await rec.stop();
    expect(result.duration).toBe(5);
    expect(result.mime).toBe('audio/mp4');
    expect(result.blob.size).toBe(3);
    expect(stopTrack).toHaveBeenCalled();
  });

  it('maps a refused permission to RecorderError("denied")', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
    const err = await new AudioRecorder().start().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RecorderError);
    expect((err as RecorderError).code).toBe('denied');
  });
});

describe('AudioRecorder — listen back, then "Kể tiếp"', () => {
  const stopTrack = vi.fn();
  let track: EventTarget & { stop: typeof stopTrack };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          track = Object.assign(new EventTarget(), { stop: stopTrack });
          return { getTracks: () => [track] };
        }),
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    stopTrack.mockReset();
  });

  it('preview pauses capture, keeps the microphone, and resume appends to the same take', async () => {
    const rec = new AudioRecorder();
    await rec.start();
    vi.advanceTimersByTime(2000);
    const preview = await rec.preview();
    expect(preview.duration).toBe(2);
    expect(preview.blob.size).toBe(2);
    expect(stopTrack).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000); // listening back is not counted
    rec.resume();
    vi.advanceTimersByTime(3000);
    const final = await rec.stop();
    expect(final.duration).toBe(5);
    expect(final.blob.size).toBe(5); // preview chunk + final chunk, one file
    expect(stopTrack).toHaveBeenCalled();
  });

  it('a browser that never flushes does not hang the preview', async () => {
    const rec = new AudioRecorder();
    await rec.start();
    const fake = (rec as unknown as { recorder: FakeMediaRecorder }).recorder;
    fake.requestData = () => {};
    const p = rec.preview(500);
    vi.advanceTimersByTime(500);
    await expect(p).resolves.toMatchObject({ duration: 0 });
  });

  it('reports a microphone that disappears mid-take', async () => {
    const rec = new AudioRecorder();
    const lost = vi.fn();
    await rec.start();
    rec.onInterrupted = lost;
    track.dispatchEvent(new Event('ended'));
    expect(lost).toHaveBeenCalledTimes(1);
  });
});
