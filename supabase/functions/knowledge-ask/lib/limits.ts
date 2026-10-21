// In-memory abuse limits for the anonymous `ask` action (one set per isolate; no table is involved).
// - per client IP: at most `limit` questions per sliding `windowMs`;
// - global: at most `cap` questions per UTC day per isolate (a cost circuit breaker for the Gemini key).
// Isolates are recycled and several may run at once, so these are soft limits that bound cost, not quotas.

export interface RateLimiter {
  /** Counts one hit for `key`; ok=false (and nothing counted) when the key is over its limit. */
  take(key: string): { ok: true } | { ok: false; retryAfterMs: number };
}

export function createRateLimiter(o: { limit: number; windowMs: number; now: () => number; maxKeys?: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  const maxKeys = o.maxKeys ?? 10_000;

  const prune = (now: number) => {
    for (const [k, ts] of hits) {
      const kept = ts.filter((t) => now - t < o.windowMs);
      if (kept.length === 0) hits.delete(k);
      else hits.set(k, kept);
    }
  };

  return {
    take(key) {
      const now = o.now();
      if (!hits.has(key) && hits.size >= maxKeys) prune(now);
      const ts = (hits.get(key) ?? []).filter((t) => now - t < o.windowMs);
      if (ts.length >= o.limit) {
        hits.set(key, ts);
        return { ok: false, retryAfterMs: Math.max(1, o.windowMs - (now - ts[0]!)) };
      }
      ts.push(now);
      hits.set(key, ts);
      return { ok: true };
    },
  };
}

export interface DailyCap {
  /** Counts one unit for today (UTC); false when today's cap is already used up. */
  take(): boolean;
  /** Gives one unit back (the request never reached Gemini). */
  refund(): void;
}

export function createDailyCap(o: { cap: number; now: () => number }): DailyCap {
  let day = '';
  let used = 0;
  const today = () => new Date(o.now()).toISOString().slice(0, 10);
  const roll = () => {
    const d = today();
    if (d !== day) {
      day = d;
      used = 0;
    }
  };
  return {
    take() {
      roll();
      if (used >= o.cap) return false;
      used++;
      return true;
    },
    refund() {
      roll();
      if (used > 0) used--;
    },
  };
}

/** Client IP as seen by the Supabase edge (cf-connecting-ip, else the first x-forwarded-for hop). */
export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (xff) return xff;
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}
