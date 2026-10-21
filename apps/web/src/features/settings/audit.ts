// Access log (audit_log) helpers: action codes written by the database RPCs → translated labels.

/** Every action code the RPCs write today (see supabase/migrations lh_audit calls), plus review_publish. */
export const AUDIT_ACTIONS = [
  'create_family',
  'create_invite',
  'accept_invite',
  'create_narrator_link',
  'claim_narrator_link',
  'revoke_narrator_link',
  'approve_story',
  'auto_withdraw',
  'request_publish',
  'review_publish',
  'approve_publish',
  'reject_publish',
  'withdraw_public',
  // 20261022000400_access_hardening: an admin opened a private story to review a publish request; a deletion request changed status.
  'admin_preview',
  'deletion_status',
  // 20261022000600_pilot_admin_ops: admin_process_deletion erased a story or a whole family.
  'erase_story',
  'erase_family',
  'admin_withdraw',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const KNOWN = new Set<string>(AUDIT_ACTIONS);

export function isKnownAuditAction(code: string): code is AuditAction {
  return KNOWN.has(code);
}

/**
 * Label for an action code. `translateKnown` receives a known code and returns its translation;
 * unknown codes are shown raw so nothing in the log is ever hidden.
 */
export function auditActionLabel(code: string, translateKnown: (code: AuditAction) => string): string {
  return isKnownAuditAction(code) ? translateKnown(code) : code;
}

export const AUDIT_TARGETS = ['family', 'family_invite', 'narrator_link', 'story', 'deletion_request'] as const;
export type AuditTarget = (typeof AUDIT_TARGETS)[number];

export function isKnownAuditTarget(type: string | null): type is AuditTarget {
  return type !== null && (AUDIT_TARGETS as readonly string[]).includes(type);
}

/**
 * Who did it. Resolved from co-member profiles when possible; a narrator device claiming a link is labelled as such;
 * otherwise a neutral "member" label (we never guess names).
 */
export function auditActorKind(actor: string | null, action: string, names: ReadonlyMap<string, string>): { kind: 'named'; name: string } | { kind: 'narratorDevice' | 'system' | 'member' } {
  if (!actor) return { kind: 'system' };
  const name = names.get(actor);
  if (name) return { kind: 'named', name };
  if (action === 'claim_narrator_link') return { kind: 'narratorDevice' };
  return { kind: 'member' };
}

export const AUDIT_PAGE_SIZE = 20;

/** Supabase .range() bounds for a 0-based page. */
export function pageRange(page: number, size = AUDIT_PAGE_SIZE): [number, number] {
  const p = Math.max(0, Math.floor(page));
  return [p * size, p * size + size - 1];
}

export function pageCount(total: number, size = AUDIT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / size));
}

/** Values of audit_log.actor_role (20261022000400_access_hardening, lh_audit_enrich). 'none' and null get no label. */
export const AUDIT_ROLES = ['owner', 'manager', 'editor', 'viewer', 'narrator', 'admin', 'service'] as const;
export type AuditRole = (typeof AUDIT_ROLES)[number];

/** Translation key suffix for an actor role, or null when there is nothing meaningful to show. */
export function auditRoleKey(role: string | null | undefined): AuditRole | null {
  return role && (AUDIT_ROLES as readonly string[]).includes(role) ? (role as AuditRole) : null;
}
