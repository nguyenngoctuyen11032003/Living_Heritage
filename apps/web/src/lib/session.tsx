// Shared auth/session contract (lead-owned). Workstream E builds the auth pages on top of this.
import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ensureSupabase, hasStoredSession, onSupabaseReady } from './supabase';

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
    let alive = true;
    let started = false;
    let unsubscribe = () => {};
    const start = () => {
      if (started) return;
      started = true;
      ensureSupabase().then(
        (sb) => {
          if (!alive) return;
          if (!sb) {
            setLoading(false);
            return;
          }
          sb.auth
            .getSession()
            .then(({ data }) => {
              if (alive) setSession((prev) => (sameSession(prev, data.session) ? prev : data.session));
            })
            .catch(() => {
              /* treat as signed out */
            })
            .finally(() => {
              if (alive) setLoading(false);
            });
          // Supabase re-emits SIGNED_IN with a freshly parsed session on every tab focus: keep the old object when
          // nothing changed, otherwise every consumer keyed on `user` refetches and gated pages remount (losing drafts,
          // recordings).
          const { data } = sb.auth.onAuthStateChange((_event, next) => setSession((prev) => (sameSession(prev, next) ? prev : next)));
          unsubscribe = () => data.subscription.unsubscribe();
        },
        () => alive && setLoading(false),
      );
    };
    // A stored session (signed-in or narrator-link visitor) needs the SDK now. A first-time visitor on the landing
    // page does not: load it once the page is idle, or as soon as a route asks for it (onSupabaseReady).
    const stopReady = onSupabaseReady(start);
    let idleId: number | undefined;
    if (hasStoredSession()) start();
    else idleId = (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000)))(start);
    return () => {
      alive = false;
      stopReady();
      if (idleId !== undefined) (window.cancelIdleCallback ?? window.clearTimeout)(idleId);
      unsubscribe();
    };
  }, []);

  // A token refresh replaces the session but not the person: keep `user` identity stable across it.
  const userRef = useRef<User | null>(null);
  const next = session?.user ?? null;
  if (!sameUser(userRef.current, next)) userRef.current = next;
  const user = userRef.current;

  const value = useMemo<SessionState>(() => ({ session, user, loading, isAnonymous: user?.is_anonymous ?? false }), [session, user, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function sameUser(a: User | null, b: User | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.is_anonymous === b.is_anonymous && a.updated_at === b.updated_at && a.email === b.email;
}

function sameSession(a: Session | null, b: Session | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.access_token === b.access_token && sameUser(a.user, b.user);
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
