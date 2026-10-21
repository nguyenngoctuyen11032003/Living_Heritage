import { describe, expect, it } from 'vitest';
import { canEditDraft, decideApproval, isAssistedConsentComplete, saveWithdrawal, type ApprovalInput } from './approval';

const base: ApprovalInput = { editStatus: 'pending_review', isNarratorUser: false, role: null, narratorBound: true };

describe('decideApproval', () => {
  it('shows "Xác nhận nội dung" only to the narrator user', () => {
    expect(decideApproval({ ...base, isNarratorUser: true })).toBe('narrator_confirm');
    expect(decideApproval({ ...base, isNarratorUser: true, role: 'owner' })).toBe('narrator_confirm');
    expect(decideApproval({ ...base, role: 'owner' })).not.toBe('narrator_confirm');
  });

  it('offers assisted approval to owner/manager only while the narrator has no bound device', () => {
    expect(decideApproval({ ...base, role: 'owner', narratorBound: false })).toBe('assisted');
    expect(decideApproval({ ...base, role: 'manager', narratorBound: null })).toBe('assisted');
    expect(decideApproval({ ...base, role: 'manager', narratorBound: true })).toBe('send_to_narrator');
    expect(decideApproval({ ...base, role: 'editor', narratorBound: false })).toBe('send_to_narrator');
  });

  it('gives viewers and strangers nothing to do', () => {
    expect(decideApproval({ ...base, role: 'viewer' })).toBe('read_only');
    expect(decideApproval({ ...base, role: null })).toBe('read_only');
  });

  it('reports approved stories regardless of role', () => {
    expect(decideApproval({ ...base, editStatus: 'approved', isNarratorUser: true })).toBe('approved');
    expect(decideApproval({ ...base, editStatus: 'approved', role: 'viewer' })).toBe('approved');
  });
});

describe('canEditDraft', () => {
  it('allows the narrator user and family editors', () => {
    expect(canEditDraft(true, null)).toBe(true);
    expect(canEditDraft(false, 'editor')).toBe(true);
    expect(canEditDraft(false, 'viewer')).toBe(false);
    expect(canEditDraft(false, null)).toBe(false);
  });
});

describe('isAssistedConsentComplete', () => {
  it('needs the read-back tick, a method and a helper relation (≤ 60 chars)', () => {
    const ok = { confirmed: true, method: 'assisted_phone' as const, relation: 'con gái' };
    expect(isAssistedConsentComplete(ok)).toBe(true);
    expect(isAssistedConsentComplete({ ...ok, confirmed: false })).toBe(false);
    expect(isAssistedConsentComplete({ ...ok, method: null })).toBe(false);
    expect(isAssistedConsentComplete({ ...ok, relation: '   ' })).toBe(false);
    expect(isAssistedConsentComplete({ ...ok, relation: 'x'.repeat(61) })).toBe(false);
  });
});

describe('saveWithdrawal', () => {
  it('warns before saving over a public version or a pending publish request', () => {
    expect(saveWithdrawal('public', false)).toBe('public');
    expect(saveWithdrawal('public', true)).toBe('public');
    expect(saveWithdrawal('family', true)).toBe('pending');
    expect(saveWithdrawal('private', false)).toBeNull();
  });
});
