// Who sees which action in the approval bar (DỰ ÁN.md B8/B11, spec "Approval").
import type { EditStatus, MemberRole } from '@lh/shared';

export type ApprovalMode =
  /** Already confirmed: show the confirmation note and the next step (sharing). */
  | 'approved'
  /** The narrator user: "Xác nhận đúng ý tôi". */
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
