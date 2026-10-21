import { describe, expect, it } from 'vitest';
import { mayResign, msUntilResign, RESIGN_MIN_GAP_MS, URL_REFRESH_MS } from './hooks';
import { SIGNED_URL_TTL } from './photos';

describe('signed URL freshness', () => {
  it('re-signs before the 1 h URLs expire', () => {
    expect(URL_REFRESH_MS).toBeLessThan(SIGNED_URL_TTL * 1000);
    expect(URL_REFRESH_MS).toBeGreaterThan(30 * 60 * 1000);
    expect(msUntilResign(1_000, 1_000)).toBe(URL_REFRESH_MS);
    expect(msUntilResign(0, URL_REFRESH_MS + 5)).toBe(0);
  });
  it('throttles re-signing triggered by broken images', () => {
    expect(mayResign(0, RESIGN_MIN_GAP_MS)).toBe(true);
    expect(mayResign(10_000, 10_000 + RESIGN_MIN_GAP_MS - 1)).toBe(false);
  });
});
