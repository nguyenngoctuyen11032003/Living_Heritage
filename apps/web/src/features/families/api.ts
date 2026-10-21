import type { MemberRole } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';

export interface MemberView {
  user_id: string;
  role: MemberRole;
  relation: string | null;
  created_at: string;
  /** From profiles when readable (co-members can read each other's display name). */
  display_name: string | null;
}

export interface InviteView {
  id: string;
  email: string;
  role: MemberRole;
  relation: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface OnboardingProgress {
  narrators: number;
  links: number;
  /** Members other than the caller, plus pending/accepted invites. */
  relatives: number;
}

/** Members of a family with display names (profiles are fetched separately: no FK between the two tables). */
export async function loadMembers(sb: Supabase, familyId: string): Promise<MemberView[]> {
  const { data, error } = await sb.from('family_members').select('user_id, role, relation, created_at').eq('family_id', familyId).order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const names = new Map<string, string | null>();
  if (rows.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, display_name')
      .in(
        'id',
        rows.map((r) => r.user_id),
      );
    for (const p of profiles ?? []) names.set(p.id, p.display_name);
  }
  return rows.map((r) => ({ ...r, display_name: names.get(r.user_id) ?? null }));
}

/** Invites (owner/manager only by RLS; others get an empty list). */
export async function loadInvites(sb: Supabase, familyId: string): Promise<InviteView[]> {
  const { data, error } = await sb
    .from('family_invites')
    .select('id, email, role, relation, expires_at, accepted_at, created_at')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadProgress(sb: Supabase, familyId: string): Promise<OnboardingProgress> {
  const [narr, members, invites] = await Promise.all([
    sb.from('narrators').select('id').eq('family_id', familyId),
    sb.from('family_members').select('user_id', { count: 'exact', head: true }).eq('family_id', familyId),
    sb.from('family_invites').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
  ]);
  if (narr.error) throw narr.error;
  const ids = (narr.data ?? []).map((n) => n.id);
  let links = 0;
  if (ids.length > 0) {
    const res = await sb.from('narrator_links').select('id', { count: 'exact', head: true }).in('narrator_id', ids);
    links = res.count ?? 0;
  }
  return { narrators: ids.length, links, relatives: Math.max(0, (members.count ?? 1) - 1) + (invites.count ?? 0) };
}

/** Roles an owner/manager may assign (owner is never assignable from the app). */
export const ASSIGNABLE_ROLES: readonly MemberRole[] = ['manager', 'editor', 'viewer'];
