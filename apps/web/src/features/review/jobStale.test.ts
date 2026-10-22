import { describe, expect, it } from 'vitest';
import { isJobStale, JOB_STALE_MS } from './data';

describe('isJobStale', () => {
  const now = Date.parse('2026-10-22T10:00:00Z');
  const at = (ms: number) => new Date(now - ms).toISOString();
  it('is false for a fresh active job', () => expect(isJobStale({ status: 'drafting', updated_at: at(1000) }, now)).toBe(false));
  it('is true for an active job that stopped moving', () => expect(isJobStale({ status: 'queued', updated_at: at(JOB_STALE_MS + 1) }, now)).toBe(true));
  it('is false for finished or missing jobs', () => {
    expect(isJobStale({ status: 'error', updated_at: at(JOB_STALE_MS * 5) }, now)).toBe(false);
    expect(isJobStale(null, now)).toBe(false);
  });
});
