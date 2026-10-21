import type { MemberRole } from '@lh/shared';

/** What the settings page lets a member do in the current family (the database enforces the same rules). */
export function familySettingsPermissions(role: MemberRole | null | undefined) {
  return {
    /** families: owner/manager rename policy */
    canRename: role === 'owner' || role === 'manager',
    /** family_members delete policy: anyone but the owner may leave */
    canLeave: role != null && role !== 'owner',
  };
}

/** Sections of /gia-dinh/du-lieu available to a role. */
export function dataCenterAccess(role: MemberRole | null | undefined) {
  const manage = role === 'owner' || role === 'manager';
  return {
    /** export reads every table the family has; meaningful only with full read access */
    export: manage,
    /** audit_log policy: owner/manager */
    audit: manage,
    /** narrator_links policy and revoke_narrator_link: owner/manager */
    links: manage,
    /** deletion_requests insert policy: any family member */
    deletion: role != null,
  };
}

export const DISPLAY_NAME_MAX = 80;
export const FAMILY_NAME_MAX = 120;

export type NameError = 'required' | 'tooLong' | null;

export function validateName(value: string, max: number): NameError {
  const v = value.trim();
  if (!v) return 'required';
  if (v.length > max) return 'tooLong';
  return null;
}

export type PasswordError = 'tooShort' | 'mismatch' | null;

export function validateNewPassword(password: string, confirm: string, min = 8): PasswordError {
  if (password.length < min) return 'tooShort';
  if (password !== confirm) return 'mismatch';
  return null;
}
