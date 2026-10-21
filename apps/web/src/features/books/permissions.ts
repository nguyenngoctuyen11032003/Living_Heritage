import type { MemberRole } from '@lh/shared';

const EDIT_ROLES: readonly MemberRole[] = ['owner', 'manager', 'editor'];

/** Editors of the book's family may change, print and export it; viewers only read it in the app (B11). */
export function canEditBook(families: ReadonlyArray<{ id: string; role: MemberRole }>, familyId: string): boolean {
  const role = families.find((f) => f.id === familyId)?.role;
  return role !== undefined && EDIT_ROLES.includes(role);
}
