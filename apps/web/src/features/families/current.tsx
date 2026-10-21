// Shared contract (lead-owned): which family vault the signed-in user is working in.
// Workstream E builds onboarding/members pages; F and G only consume useCurrentFamily().
import type { MemberRole } from '@lh/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export interface FamilySummary {
  id: string;
  name: string;
  role: MemberRole;
}

export interface CurrentFamilyState {
  families: FamilySummary[];
  current: FamilySummary | null;
  loading: boolean;
  error: string | null;
  select: (familyId: string) => void;
  reload: () => Promise<void>;
  /** owner/manager/editor may edit drafts; owner/manager manage members, narrators and links. */
  canEdit: boolean;
  canManage: boolean;
}

const KEY = 'lh.currentFamily';
const Ctx = createContext<CurrentFamilyState | null>(null);

export function CurrentFamilyProvider({ children }: { children: ReactNode }) {
  const { user, isAnonymous } = useSession();
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user || isAnonymous) {
      setFamilies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await sb.from('family_members').select('role, families(id, name)').eq('user_id', user.id);
    if (err) {
      setError(err.message);
      setFamilies([]);
    } else {
      setError(null);
      const rows = (data ?? []) as unknown as Array<{ role: MemberRole; families: { id: string; name: string } | null }>;
      setFamilies(rows.filter((r) => r.families).map((r) => ({ id: r.families!.id, name: r.families!.name, role: r.role })));
    }
    setLoading(false);
  }, [user, isAnonymous]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* storage blocked */
    }
  }, []);

  const value = useMemo<CurrentFamilyState>(() => {
    const current = families.find((f) => f.id === selectedId) ?? families[0] ?? null;
    const role = current?.role;
    return {
      families,
      current,
      loading,
      error,
      select,
      reload,
      canEdit: role === 'owner' || role === 'manager' || role === 'editor',
      canManage: role === 'owner' || role === 'manager',
    };
  }, [families, selectedId, loading, error, select, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrentFamily(): CurrentFamilyState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCurrentFamily must be used inside <CurrentFamilyProvider>');
  return ctx;
}
