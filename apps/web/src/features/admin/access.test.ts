import { describe, expect, it } from 'vitest';
import {
  ADMIN_TABS,
  nextConnectStatuses,
  nextDeletionStatuses,
  nextReportStatuses,
  parseAdminTab,
  parseAiError,
  resolutionPatch,
  resolveAdminAccess,
  reviewErrorCode,
  visibleAdminTabs,
  type AdminAccessInput,
} from './access';

const base: AdminAccessInput = { configured: true, sessionLoading: false, signedIn: true, isAnonymous: false, adminCheck: 'yes' };

describe('admin access gating', () => {
  it('only a confirmed admin gets the console and its tabs', () => {
    expect(resolveAdminAccess(base)).toBe('ready');
    expect(visibleAdminTabs('ready')).toEqual([...ADMIN_TABS]);
  });

  it('hides every tab in all other states', () => {
    const cases: [Partial<AdminAccessInput>, string][] = [
      [{ configured: false }, 'not-configured'],
      [{ sessionLoading: true }, 'loading'],
      [{ signedIn: false }, 'signed-out'],
      [{ isAnonymous: true }, 'forbidden'],
      [{ adminCheck: 'pending' }, 'loading'],
      [{ adminCheck: 'no' }, 'forbidden'],
      [{ adminCheck: 'error' }, 'error'],
    ];
    for (const [patch, expected] of cases) {
      const access = resolveAdminAccess({ ...base, ...patch });
      expect(access).toBe(expected);
      expect(visibleAdminTabs(access)).toEqual([]);
    }
  });

  it('anonymous narrator sessions are forbidden even if the check said yes', () => {
    expect(resolveAdminAccess({ ...base, isAnonymous: true, adminCheck: 'yes' })).toBe('forbidden');
  });

  it('parses ?tab= with a safe default', () => {
    expect(parseAdminTab('reports')).toBe('reports');
    expect(parseAdminTab('aiJobs')).toBe('aiJobs');
    expect(parseAdminTab('hack')).toBe('publish');
    expect(parseAdminTab(null)).toBe('publish');
  });
});

describe('status transitions', () => {
  it('reports, connect requests and deletion requests', () => {
    expect(nextReportStatuses('open')).toEqual(['resolved', 'dismissed']);
    expect(nextReportStatuses('resolved')).toEqual(['open']);
    expect(nextConnectStatuses('new')).toEqual(['forwarded', 'closed']);
    expect(nextConnectStatuses('forwarded')).toEqual(['closed']);
    expect(nextDeletionStatuses('open')).toEqual(['in_progress', 'rejected']);
    expect(nextDeletionStatuses('in_progress')).toEqual(['done', 'rejected', 'open']);
    expect(nextDeletionStatuses('done')).toEqual(['open']);
    expect(nextDeletionStatuses('weird')).toEqual([]);
  });

  it('resolution columns are set on close and cleared on reopen', () => {
    const now = new Date('2026-10-21T10:00:00Z');
    expect(resolutionPatch('done', 'open', 'u1', now)).toEqual({ status: 'done', resolved_at: now.toISOString(), resolved_by: 'u1' });
    expect(resolutionPatch('open', 'open', 'u1', now)).toEqual({ status: 'open', resolved_at: null, resolved_by: null });
  });
});

describe('error code parsing', () => {
  it('ai_jobs.error', () => {
    expect(parseAiError('quota_exceeded')).toEqual({ code: 'quota_exceeded', detail: null });
    expect(parseAiError('ai_unavailable: 503 from model')).toEqual({ code: 'ai_unavailable', detail: '503 from model' });
    expect(parseAiError('Something odd')).toEqual({ code: 'unknown', detail: 'Something odd' });
    expect(parseAiError(null)).toEqual({ code: 'unknown', detail: null });
  });

  it('review_publish errors', () => {
    expect(reviewErrorCode('request_not_pending')).toBe('request_not_pending');
    expect(reviewErrorCode('boom')).toBe('unknown');
  });
});
