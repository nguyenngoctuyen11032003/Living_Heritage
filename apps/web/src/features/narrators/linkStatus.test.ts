import { describe, expect, it } from 'vitest';
import { linkStatus } from './linkStatus';

const now = Date.parse('2026-10-22T00:00:00Z');
const base = { revoked_at: null, claimed_at: null, expires_at: '2026-11-01T00:00:00Z' };

describe('linkStatus', () => {
  it('is active before expiry', () => expect(linkStatus(base, now)).toBe('active'));
  it('is expired at or after expiry', () => expect(linkStatus({ ...base, expires_at: '2026-10-22T00:00:00Z' }, now)).toBe('expired'));
  it('stays claimed after expiry', () => expect(linkStatus({ ...base, claimed_at: '2026-10-01T00:00:00Z', expires_at: '2026-10-10T00:00:00Z' }, now)).toBe('claimed'));
  it('revoked wins over claimed', () => expect(linkStatus({ ...base, claimed_at: '2026-10-01T00:00:00Z', revoked_at: '2026-10-02T00:00:00Z' }, now)).toBe('revoked'));
});
