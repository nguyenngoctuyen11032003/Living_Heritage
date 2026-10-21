import { describe, expect, it } from 'vitest';
import { canEditDraft, decideApproval, type ApprovalInput } from './approval';

const base: ApprovalInput = { editStatus: 'pending_review', isNarratorUser: false, role: null, narratorBound: true };

describe('decideApproval', () => {
  it('shows "Xác nhận đúng ý tôi" only to the narrator user', () => {
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
