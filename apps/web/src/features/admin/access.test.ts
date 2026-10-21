import { describe, expect, it } from 'vitest';
import {
  ADMIN_TABS,
  AI_MAX_ATTEMPTS,
  aiRetryCapped,
  DELETION_UNRESOLVED,
  deletionScope,
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
    expect(parseAdminTab('metrics')).toBe('metrics');
    expect(parseAdminTab('questions')).toBe('questions');
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
    // B12: tiếp nhận (open) → đang xử lý (processing) → hoàn tất (done / rejected).
    // Story / family: 'done' only through the erase action, and an erased request is never reopened.
    expect(nextDeletionStatuses('open', 'story')).toEqual(['processing', 'rejected']);
    expect(nextDeletionStatuses('processing', 'story')).toEqual(['rejected']);
    expect(nextDeletionStatuses('processing', 'family')).toEqual(['rejected']);
    expect(nextDeletionStatuses('done', 'family')).toEqual([]);
    expect(nextDeletionStatuses('rejected', 'story')).toEqual(['open']);
    // Account deletion is handled by hand, so it can be marked done (and reopened).
    expect(nextDeletionStatuses('processing', 'account')).toEqual(['done', 'rejected']);
    expect(nextDeletionStatuses('done', 'account')).toEqual(['processing']);
    expect(nextDeletionStatuses('weird', 'story')).toEqual([]);
  });

  it('resolution columns are set on close and cleared on reopen', () => {
    const now = new Date('2026-10-21T10:00:00Z');
    expect(resolutionPatch('done', 'open', 'u1', now)).toEqual({ status: 'done', resolved_at: now.toISOString(), resolved_by: 'u1' });
    expect(resolutionPatch('open', 'open', 'u1', now)).toEqual({ status: 'open', resolved_at: null, resolved_by: null });
  });

  it('an in-progress deletion request is not resolved yet', () => {
    const now = new Date('2026-10-21T10:00:00Z');
    expect(resolutionPatch('processing', DELETION_UNRESOLVED, 'u1', now)).toEqual({ status: 'processing', resolved_at: null, resolved_by: null });
    expect(resolutionPatch('done', DELETION_UNRESOLVED, 'u1', now)).toEqual({ status: 'done', resolved_at: now.toISOString(), resolved_by: 'u1' });
  });

  it('flags AI jobs that reached the retry cap', () => {
    expect(aiRetryCapped(AI_MAX_ATTEMPTS)).toBe(true);
    expect(aiRetryCapped(AI_MAX_ATTEMPTS - 1)).toBe(false);
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

describe('deletionScope', () => {
  it('uses the stored scope, else the DB insert rule', () => {
    expect(deletionScope({ scope: 'family', story_id: null, reason: null })).toBe('family');
    // A story request keeps scope 'story' after the story row is gone (story_id set null).
    expect(deletionScope({ scope: 'story', story_id: null, reason: null })).toBe('story');
    expect(deletionScope({ story_id: 's1', reason: null })).toBe('story');
    expect(deletionScope({ story_id: null, reason: '[account] xoá tài khoản' })).toBe('account');
    expect(deletionScope({ story_id: null, reason: 'Xoá hết' })).toBe('family');
  });
});
