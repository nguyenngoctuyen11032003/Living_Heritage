import { describe, expect, it } from 'vitest';
import { translate } from '@/i18n';
import { AUDIT_ACTIONS, AUDIT_TARGETS, auditActionLabel, auditActorKind, isKnownAuditAction, pageCount, pageRange } from './audit';
import { ACCOUNT_MARKER, deletionStatus, describeDeletionRow, hasErrors, hasOpenDuplicate, REASON_MAX, toDeletionInsert, validateDeletionForm, type DeletionForm } from './deletion';
import { activeLinks } from './links';
import { dataCenterAccess, familySettingsPermissions, validateName, validateNewPassword } from './permissions';

describe('audit action labels', () => {
  const tr = (locale: 'vi' | 'en') => (code: string) => translate(locale, 'settings', `audit.actions.${code}`);

  it('translates every known action in both languages', () => {
    for (const locale of ['vi', 'en'] as const) {
      for (const a of AUDIT_ACTIONS) {
        const label = auditActionLabel(a, tr(locale));
        expect(label).not.toBe(`audit.actions.${a}`);
        expect(label).not.toBe(a);
      }
    }
    expect(auditActionLabel('approve_story', tr('vi'))).toBe('Người kể xác nhận câu chuyện');
    expect(auditActionLabel('revoke_narrator_link', tr('en'))).toBe('Revoked a storytelling link');
  });

  it('shows unknown codes raw and never calls the translator for them', () => {
    let called = false;
    expect(
      auditActionLabel('purge_cache', () => {
        called = true;
        return 'x';
      }),
    ).toBe('purge_cache');
    expect(called).toBe(false);
    expect(isKnownAuditAction('purge_cache')).toBe(false);
  });

  it('covers the codes written by the database RPCs', () => {
    for (const code of ['create_family', 'create_invite', 'accept_invite', 'create_narrator_link', 'claim_narrator_link', 'revoke_narrator_link', 'approve_story', 'auto_withdraw', 'request_publish', 'approve_publish', 'reject_publish', 'withdraw_public', 'review_publish'])
      expect(isKnownAuditAction(code)).toBe(true);
  });

  it('has target labels in both languages', () => {
    for (const locale of ['vi', 'en'] as const) for (const t of AUDIT_TARGETS) expect(translate(locale, 'settings', `audit.target.${t}`)).not.toContain('audit.');
  });

  it('resolves actors without guessing names', () => {
    const names = new Map([['u1', 'Minh']]);
    expect(auditActorKind('u1', 'approve_story', names)).toEqual({ kind: 'named', name: 'Minh' });
    expect(auditActorKind('u9', 'approve_story', names)).toEqual({ kind: 'member' });
    expect(auditActorKind('anon', 'claim_narrator_link', names)).toEqual({ kind: 'narratorDevice' });
    expect(auditActorKind(null, 'auto_withdraw', names)).toEqual({ kind: 'system' });
  });

  it('paginates', () => {
    expect(pageRange(0)).toEqual([0, 19]);
    expect(pageRange(2, 10)).toEqual([20, 29]);
    expect(pageRange(-1)).toEqual([0, 19]);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(20)).toBe(1);
    expect(pageCount(21)).toBe(2);
  });
});

describe('hasOpenDuplicate', () => {
  const ins = { family_id: 'f1', story_id: 's1', reason: 'x' };
  it('detects an open request for the same story only', () => {
    expect(hasOpenDuplicate([{ story_id: 's1', reason: 'a', status: 'open', family_id: 'f1' }], ins)).toBe(true);
    expect(hasOpenDuplicate([{ story_id: 's2', reason: 'a', status: 'open', family_id: 'f1' }], ins)).toBe(false);
    expect(hasOpenDuplicate([{ story_id: 's1', reason: 'a', status: 'done', family_id: 'f1' }], ins)).toBe(false);
  });
  it('treats family and account scopes separately', () => {
    const fam = { family_id: 'f1', story_id: null, reason: 'x' };
    const acc = { family_id: 'f1', story_id: null, reason: '[account] x' };
    const rows = [{ story_id: null, reason: '[account] y', status: 'open', family_id: 'f1' }];
    expect(hasOpenDuplicate(rows, acc)).toBe(true);
    expect(hasOpenDuplicate(rows, fam)).toBe(false);
  });
});

describe('deletion request form', () => {
  const base: DeletionForm = { scope: 'story', storyId: 's1', reason: 'Bà muốn xoá chuyện này', confirmed: false };

  it('accepts a valid story request without confirmation', () => {
    expect(validateDeletionForm(base, 'f1')).toEqual({});
  });

  it('requires a story for story scope', () => {
    expect(validateDeletionForm({ ...base, storyId: '  ' }, 'f1').story).toBe('required');
  });

  it('validates the reason length', () => {
    expect(validateDeletionForm({ ...base, reason: '   ' }, 'f1').reason).toBe('required');
    expect(validateDeletionForm({ ...base, reason: 'abc' }, 'f1').reason).toBe('tooShort');
    expect(validateDeletionForm({ ...base, reason: 'x'.repeat(REASON_MAX + 1) }, 'f1').reason).toBe('tooLong');
    expect(validateDeletionForm({ ...base, reason: 'x'.repeat(REASON_MAX) }, 'f1').reason).toBeUndefined();
  });

  it('requires explicit confirmation for family and account scopes', () => {
    expect(validateDeletionForm({ ...base, scope: 'family' }, 'f1').confirmed).toBe('required');
    expect(validateDeletionForm({ ...base, scope: 'account' }, 'f1').confirmed).toBe('required');
    expect(validateDeletionForm({ ...base, scope: 'family', confirmed: true }, 'f1')).toEqual({});
  });

  it('requires a family', () => {
    const errs = validateDeletionForm(base, null);
    expect(errs.family).toBe('required');
    expect(hasErrors(errs)).toBe(true);
  });

  it('builds insert rows with only the granted columns', () => {
    expect(toDeletionInsert({ ...base, reason: '  lý do  ' }, 'f1')).toEqual({ family_id: 'f1', story_id: 's1', reason: 'lý do' });
    expect(toDeletionInsert({ ...base, scope: 'family' }, 'f1').story_id).toBeNull();
    const acc = toDeletionInsert({ ...base, scope: 'account', reason: 'không dùng nữa' }, 'f1');
    expect(acc).toEqual({ family_id: 'f1', story_id: null, reason: `${ACCOUNT_MARKER} không dùng nữa` });
    expect(acc.reason.length).toBeLessThanOrEqual(1000);
  });

  it('reads back the scope of stored rows', () => {
    expect(describeDeletionRow({ story_id: null, reason: `${ACCOUNT_MARKER} bye` })).toEqual({ scope: 'account', reason: 'bye' });
    expect(describeDeletionRow({ story_id: 's1', reason: 'r' })).toEqual({ scope: 'story', reason: 'r' });
    expect(describeDeletionRow({ story_id: null, reason: null })).toEqual({ scope: 'family', reason: '' });
  });

  it('maps statuses', () => {
    expect(deletionStatus('open')).toBe('open');
    expect(deletionStatus('done')).toBe('done');
    expect(deletionStatus('rejected')).toBe('rejected');
    expect(deletionStatus('weird')).toBe('unknown');
  });
});

describe('permission gating', () => {
  it('lets owners and managers rename; everyone but the owner leave', () => {
    expect(familySettingsPermissions('owner')).toEqual({ canRename: true, canLeave: false });
    expect(familySettingsPermissions('manager')).toEqual({ canRename: true, canLeave: true });
    expect(familySettingsPermissions('editor')).toEqual({ canRename: false, canLeave: true });
    expect(familySettingsPermissions('viewer')).toEqual({ canRename: false, canLeave: true });
    expect(familySettingsPermissions(null)).toEqual({ canRename: false, canLeave: false });
  });

  it('opens the data center sections by role', () => {
    expect(dataCenterAccess('owner')).toEqual({ export: true, audit: true, links: true, deletion: true });
    expect(dataCenterAccess('manager')).toEqual({ export: true, audit: true, links: true, deletion: true });
    expect(dataCenterAccess('editor')).toEqual({ export: false, audit: false, links: false, deletion: true });
    expect(dataCenterAccess('viewer')).toEqual({ export: false, audit: false, links: false, deletion: true });
    expect(dataCenterAccess(undefined)).toEqual({ export: false, audit: false, links: false, deletion: false });
  });

  it('validates names and passwords', () => {
    expect(validateName('  ', 80)).toBe('required');
    expect(validateName('x'.repeat(81), 80)).toBe('tooLong');
    expect(validateName(' Minh ', 80)).toBeNull();
    expect(validateNewPassword('short', 'short')).toBe('tooShort');
    expect(validateNewPassword('longenough', 'different')).toBe('mismatch');
    expect(validateNewPassword('longenough', 'longenough')).toBeNull();
  });
});

describe('active links', () => {
  const now = Date.parse('2026-10-21T00:00:00Z');
  const link = (id: string, o: Partial<{ expires_at: string; claimed_at: string | null; revoked_at: string | null; created_at: string }>) => ({
    id,
    narrator_id: 'n1',
    created_at: o.created_at ?? '2026-10-01T00:00:00Z',
    expires_at: o.expires_at ?? '2026-11-01T00:00:00Z',
    claimed_at: o.claimed_at ?? null,
    revoked_at: o.revoked_at ?? null,
  });

  it('keeps open and device-bound links, drops revoked and expired unclaimed ones', () => {
    const list = [
      link('open', { created_at: '2026-10-02T00:00:00Z' }),
      link('revoked', { revoked_at: '2026-10-05T00:00:00Z' }),
      link('expired', { expires_at: '2026-10-10T00:00:00Z' }),
      link('bound-expired', { expires_at: '2026-10-10T00:00:00Z', claimed_at: '2026-10-03T00:00:00Z', created_at: '2026-10-03T00:00:00Z' }),
    ];
    expect(activeLinks(list, now).map((l) => l.id)).toEqual(['bound-expired', 'open']);
  });
});
