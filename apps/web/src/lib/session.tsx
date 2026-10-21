// Shared auth/session contract (lead-owned). Workstream E builds the auth pages on top of this.
import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { getSupabase } from './supabase';

export interface SessionState {
  session: Session | null;
  user: User | null;
  /** true until the first getSession() resolves */
  loading: boolean;
  /** Narrator signed in through a storytelling link (Supabase anonymous user). */
  isAnonymous: boolean;
}

const SessionContext = createContext<SessionState>({ session: null, user: null, loading: true, isAnonymous: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    let alive = true;
    void sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = sb.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionState>(
    () => ({ session, user: session?.user ?? null, loading, isAnonymous: session?.user.is_anonymous ?? false }),
    [session, loading],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

/** Redirects to /dang-nhap?next=… when signed out. Anonymous (narrator-link) users are allowed only if allowAnonymous. */
export function RequireAuth({ children, allowAnonymous = false }: { children: ReactNode; allowAnonymous?: boolean }) {
  const { user, loading, isAnonymous } = useSession();
  const location = useLocation();
  if (loading) return <div className="min-h-[50vh]" aria-busy="true" />;
  if (!user || (isAnonymous && !allowAnonymous)) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/dang-nhap?next=${next}`} replace />;
  }
  return <>{children}</>;
}
