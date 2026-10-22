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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
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

describe('AudioRecorder race conditions', () => {
  it('releases a microphone granted after dispose() (permission prompt still open)', async () => {
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    const stopTrack = vi.fn();
    let grant!: (s: unknown) => void;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(() => new Promise((r) => (grant = r))) },
    });
    const rec = new AudioRecorder();
    const started = rec.start().catch((e: unknown) => e);
    rec.dispose();
    grant({ getTracks: () => [{ stop: stopTrack }] });
    const err = await started;
    expect((err as RecorderError).code).toBe('cancelled');
    expect(stopTrack).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
