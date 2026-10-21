// Who sees which action in the approval bar (DỰ ÁN.md B8/B11, spec "Approval").
import type { EditStatus, MemberRole } from '@lh/shared';

export type ApprovalMode =
  /** Already confirmed: show the confirmation note and the next step (sharing). */
  | 'approved'
  /** The narrator user: "Xác nhận nội dung". */
  | 'narrator_confirm'
  /** Owner/manager while the narrator has no bound device: approve with explicit consent. */
  | 'assisted'
  /** Other editors (or owner/manager when the narrator has a device): save and let the narrator confirm. */
  | 'send_to_narrator'
  /** Viewers: nothing to do. */
  | 'read_only';

export interface ApprovalInput {
  editStatus: EditStatus;
  isNarratorUser: boolean;
  /** Viewer's role in the story's family (null when not a member, e.g. the anonymous narrator). */
  role: MemberRole | null;
  /** narrators.user_id is set. null when the narrator row could not be read (treated as not bound). */
  narratorBound: boolean | null;
}

export function canEditDraft(isNarratorUser: boolean, role: MemberRole | null): boolean {
  return isNarratorUser || role === 'owner' || role === 'manager' || role === 'editor';
}

export function decideApproval({ editStatus, isNarratorUser, role, narratorBound }: ApprovalInput): ApprovalMode {
  if (editStatus === 'approved') return 'approved';
  if (isNarratorUser) return 'narrator_confirm';
  if ((role === 'owner' || role === 'manager') && narratorBound !== true) return 'assisted';
  if (canEditDraft(false, role)) return 'send_to_narrator';
  return 'read_only';
}

/** How the narrator confirmed an assisted approval (approve_story p_consent_method, DỰ ÁN.md B11). */
export const CONSENT_METHODS = ['assisted_in_person', 'assisted_phone', 'assisted_video'] as const;
export type ConsentMethod = (typeof CONSENT_METHODS)[number];
export const HELPER_RELATION_MAX = 60;

/** The helper's record for an assisted approval: read back + how the narrator agreed + who the helper is. */
export interface AssistedConsent {
  confirmed: boolean;
  method: ConsentMethod | null;
  relation: string;
}

export const EMPTY_ASSISTED_CONSENT: AssistedConsent = { confirmed: false, method: null, relation: '' };

/** All three parts are required before "Duyệt thay người kể" is enabled. */
export function isAssistedConsentComplete(c: AssistedConsent): boolean {
  const r = c.relation.trim();
  return c.confirmed && c.method !== null && r.length > 0 && r.length <= HELPER_RELATION_MAX;
}

/**
 * What saving an edit will withdraw, so the user is warned first (DỰ ÁN.md B8/B12): the public version, or a
 * publish request still waiting for the admin. null = nothing is withdrawn.
 */
export function saveWithdrawal(visibility: string, pendingPublish: boolean): 'public' | 'pending' | null {
  if (visibility === 'public') return 'public';
  return pendingPublish ? 'pending' : null;
}
