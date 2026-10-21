import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DurationClock, formatClock } from './clock';

describe('DurationClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T08:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('counts running time only, excluding pauses', () => {
    const clock = new DurationClock();
    clock.start();
    vi.advanceTimersByTime(10_000);
    clock.pause();
    vi.advanceTimersByTime(60_000); // paused: not counted
    expect(clock.elapsedSeconds()).toBe(10);
    clock.resume();
    vi.advanceTimersByTime(5_500);
    expect(clock.elapsedMs()).toBe(15_500);
    expect(clock.stop()).toBe(15_500);
    vi.advanceTimersByTime(30_000);
    expect(clock.elapsedMs()).toBe(15_500);
  });

  it('ignores repeated pause/resume calls', () => {
    const clock = new DurationClock();
    clock.start();
    vi.advanceTimersByTime(1_000);
    clock.pause();
    clock.pause();
    vi.advanceTimersByTime(1_000);
    clock.resume();
    vi.advanceTimersByTime(1_000);
    clock.resume();
    vi.advanceTimersByTime(1_000);
    expect(clock.elapsedMs()).toBe(3_000);
    expect(clock.running).toBe(true);
  });

  it('start() resets the total', () => {
    const clock = new DurationClock();
    clock.start();
    vi.advanceTimersByTime(4_000);
    clock.start();
    vi.advanceTimersByTime(1_000);
    expect(clock.elapsedMs()).toBe(1_000);
  });
});

describe('formatClock', () => {
  it('pads mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(75.9)).toBe('01:15');
    expect(formatClock(600)).toBe('10:00');
  });
});
