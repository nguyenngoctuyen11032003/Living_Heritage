// In-memory circuit breaker for the Gemini upstream (one per isolate, spec 1 §3: 5 failures / 60 s).
// closed → open after `failureThreshold` upstream failures within `windowMs`;
// open → half_open after `openMs`, where one probe is let through: success closes, failure re-opens.

export type BreakerState = 'closed' | 'open' | 'half_open';

export interface Breaker {
  canRequest(): boolean;
  onSuccess(): void;
  /** `upstream` = the failure says Gemini is unhealthy (timeout, 5xx, 429, network), not just this one request. */
  onFailure(upstream: boolean): void;
  state(): BreakerState;
}

export function createBreaker(o: { failureThreshold: number; windowMs: number; openMs: number; now: () => number }): Breaker {
  let failures: number[] = [];
  let openedAt: number | null = null;
  let probeAt: number | null = null;

  const current = (): BreakerState => {
    if (openedAt === null) return 'closed';
    return o.now() - openedAt >= o.openMs ? 'half_open' : 'open';
  };
  const open = () => {
    openedAt = o.now();
    probeAt = null;
    failures = [];
  };
  const close = () => {
    openedAt = null;
    probeAt = null;
    failures = [];
  };

  return {
    state: current,
    canRequest() {
      const s = current();
      if (s === 'closed') return true;
      if (s === 'open') return false;
      // half_open: one probe at a time; a probe that never reported back expires after openMs.
      if (probeAt !== null && o.now() - probeAt < o.openMs) return false;
      probeAt = o.now();
      return true;
    },
    onSuccess: close,
    onFailure(upstream) {
      const s = current();
      if (!upstream) {
        // The upstream answered: a half-open probe proves it is reachable again.
        if (s === 'half_open') close();
        return;
      }
      if (s !== 'closed') {
        open();
        return;
      }
      const now = o.now();
      failures = failures.filter((t) => now - t < o.windowMs);
      failures.push(now);
      if (failures.length >= o.failureThreshold) open();
    },
  };
}
