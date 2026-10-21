/** Elapsed-time accounting for a take that can be paused: paused time is never counted. */
export class DurationClock {
  private accumulated = 0;
  private startedAt: number | null = null;

  constructor(private readonly now: () => number = () => Date.now()) {}

  start(): void {
    this.accumulated = 0;
    this.startedAt = this.now();
  }

  pause(): void {
    if (this.startedAt === null) return;
    this.accumulated += this.now() - this.startedAt;
    this.startedAt = null;
  }

  resume(): void {
    if (this.startedAt === null) this.startedAt = this.now();
  }

  /** Stops the clock and returns the total in milliseconds. */
  stop(): number {
    this.pause();
    return this.accumulated;
  }

  get running(): boolean {
    return this.startedAt !== null;
  }

  elapsedMs(): number {
    return this.accumulated + (this.startedAt !== null ? this.now() - this.startedAt : 0);
  }

  elapsedSeconds(): number {
    return this.elapsedMs() / 1000;
  }
}

/** 75 → "01:15" (always mm:ss, for the big recording timer). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
