// Deletion requests (DỰ ÁN.md B12: tiếp nhận → đang xử lý → hoàn tất). A person on the team processes every request;
// nothing is deleted automatically. The table has no account scope, so an account request is filed against the
// current family with a marker at the start of the reason.

export type DeletionScope = 'family' | 'story' | 'account';
export const ACCOUNT_MARKER = '[account]';
export const REASON_MIN = 5;
/** DB limit is 1000; keep room for the account marker. */
export const REASON_MAX = 980;

export interface DeletionForm {
  scope: DeletionScope;
  storyId: string;
  reason: string;
  /** Explicit confirmation for the whole-family and account scopes. */
  confirmed: boolean;
}

export type DeletionFormErrors = Partial<Record<'story' | 'reason' | 'confirmed' | 'family', 'required' | 'tooShort' | 'tooLong'>>;

export function validateDeletionForm(form: DeletionForm, familyId: string | null | undefined): DeletionFormErrors {
  const errors: DeletionFormErrors = {};
  if (!familyId) errors.family = 'required';
  if (form.scope === 'story' && !form.storyId.trim()) errors.story = 'required';
  const reason = form.reason.trim();
  if (!reason) errors.reason = 'required';
  else if (reason.length < REASON_MIN) errors.reason = 'tooShort';
  else if (reason.length > REASON_MAX) errors.reason = 'tooLong';
  if (form.scope !== 'story' && !form.confirmed) errors.confirmed = 'required';
  return errors;
}

export function hasErrors(errors: DeletionFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Row to insert into deletion_requests (only the granted columns). */
export function toDeletionInsert(form: DeletionForm, familyId: string): { family_id: string; story_id: string | null; reason: string } {
  const reason = form.reason.trim();
  return {
    family_id: familyId,
    story_id: form.scope === 'story' ? form.storyId : null,
    reason: form.scope === 'account' ? `${ACCOUNT_MARKER} ${reason}` : reason,
  };
}

/** Scope of an existing row, and its reason without the marker. */
export function describeDeletionRow(row: { story_id: string | null; reason: string | null }): { scope: DeletionScope; reason: string } {
  const raw = row.reason ?? '';
  if (raw.startsWith(ACCOUNT_MARKER)) return { scope: 'account', reason: raw.slice(ACCOUNT_MARKER.length).trim() };
  return { scope: row.story_id ? 'story' : 'family', reason: raw };
}

/** True when the same scope already has an open (unprocessed) request, so a double submit is not filed twice. */
export function hasOpenDuplicate(
  rows: ReadonlyArray<{ story_id: string | null; reason: string | null; status: string; family_id?: string }>,
  insert: { family_id: string; story_id: string | null; reason: string },
): boolean {
  const wanted = describeDeletionRow(insert).scope;
  return rows.some((r) => {
    if (r.status !== 'open' && r.status !== 'in_progress') return false;
    if (r.family_id && r.family_id !== insert.family_id) return false;
    const { scope } = describeDeletionRow(r);
    if (scope !== wanted) return false;
    return scope === 'story' ? r.story_id === insert.story_id : true;
  });
}

export type DeletionStatus = 'open' | 'in_progress' | 'done' | 'rejected' | 'unknown';

export function deletionStatus(status: string): DeletionStatus {
  return status === 'open' || status === 'in_progress' || status === 'done' || status === 'rejected' ? status : 'unknown';
}
