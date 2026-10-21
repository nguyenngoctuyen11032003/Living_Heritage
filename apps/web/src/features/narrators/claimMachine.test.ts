import { describe, expect, it } from 'vitest';
import { translate } from '@/i18n';
import { claimErrorCode, claimReducer, initialClaimState, looksLikeToken, type ClaimErrorCode, type ClaimEvent, type ClaimState } from './claimMachine';

const run = (events: ClaimEvent[], from: ClaimState = initialClaimState) => events.reduce(claimReducer, from);

describe('claimReducer', () => {
  it('signed out: signs in anonymously, claims, done', () => {
    let s = run([{ type: 'SESSION', session: 'none' }]);
    expect(s.kind).toBe('signing_in');
    s = run([{ type: 'SIGNED_IN' }], s);
    expect(s.kind).toBe('claiming');
    s = run([{ type: 'CLAIMED', narratorId: 'n1' }], s);
    expect(s).toEqual({ kind: 'done', attempt: 0, narratorId: 'n1' });
  });

  it('already anonymous: claims directly', () => {
    expect(run([{ type: 'SESSION', session: 'anonymous' }]).kind).toBe('claiming');
  });

  it('family account: asks to sign out first, never claims on its own', () => {
    let s = run([{ type: 'SESSION', session: 'family' }]);
    expect(s.kind).toBe('needs_signout');
    expect(run([{ type: 'SIGNED_IN' }, { type: 'CLAIMED', narratorId: 'x' }], s).kind).toBe('needs_signout');
    s = run([{ type: 'SIGNED_OUT' }], s);
    expect(s.kind).toBe('signing_in');
  });

  it('ignores session updates after leaving checking', () => {
    const s = run([{ type: 'SESSION', session: 'none' }, { type: 'SESSION', session: 'family' }]);
    expect(s.kind).toBe('signing_in');
  });

  it.each<ClaimErrorCode>(['link_expired', 'link_revoked', 'link_already_claimed', 'link_not_found', 'anonymous_disabled'])('fails with %s', (code) => {
    const s = run([{ type: 'SESSION', session: 'anonymous' }, { type: 'FAILED', code }]);
    expect(s).toEqual({ kind: 'error', attempt: 0, code });
  });

  it('retry restarts from checking with a new attempt; not_configured cannot retry', () => {
    const failed = run([{ type: 'SESSION', session: 'none' }, { type: 'FAILED', code: 'network' }]);
    expect(run([{ type: 'RETRY' }], failed)).toEqual({ kind: 'checking', attempt: 1 });
    const nc = run([{ type: 'NOT_CONFIGURED' }]);
    expect(run([{ type: 'RETRY' }], nc)).toBe(nc);
  });

  it('a late failure never overrides done', () => {
    const done = run([{ type: 'SESSION', session: 'anonymous' }, { type: 'CLAIMED', narratorId: 'n' }]);
    expect(run([{ type: 'FAILED', code: 'unknown' }], done)).toBe(done);
  });
});

describe('claimErrorCode', () => {
  it('maps RPC codes', () => {
    expect(claimErrorCode({ message: 'link_expired' })).toBe('link_expired');
    expect(claimErrorCode({ message: 'link_revoked' })).toBe('link_revoked');
    expect(claimErrorCode({ message: 'link_already_claimed' })).toBe('link_already_claimed');
    expect(claimErrorCode({ message: 'link_not_found' })).toBe('link_not_found');
  });
  it('maps anonymous sign-in disabled and network errors', () => {
    expect(claimErrorCode({ code: 'anonymous_provider_disabled', message: 'x' })).toBe('anonymous_disabled');
    expect(claimErrorCode({ message: 'Anonymous sign-ins are disabled' })).toBe('anonymous_disabled');
    expect(claimErrorCode(new TypeError('Failed to fetch'))).toBe('network');
    expect(claimErrorCode({ message: 'weird' })).toBe('unknown');
  });
  it('every error has copy in both languages', () => {
    const codes: ClaimErrorCode[] = ['link_expired', 'link_revoked', 'link_already_claimed', 'link_not_found', 'anonymous_disabled', 'not_configured', 'network', 'unknown'];
    for (const c of codes) for (const l of ['vi', 'en'] as const) expect(translate(l, 'auth', `link.errors.${c}.title`)).not.toContain('link.errors');
  });
});

describe('looksLikeToken', () => {
  it('accepts URL-safe tokens and rejects garbage', () => {
    expect(looksLikeToken('Abc_def-0123456789ABCDEFGHIJKLMN')).toBe(true);
    expect(looksLikeToken('short')).toBe(false);
    expect(looksLikeToken('has spaces in it 1234567890')).toBe(false);
    expect(looksLikeToken(undefined)).toBe(false);
  });
});
