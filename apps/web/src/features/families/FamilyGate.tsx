import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Select, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { useCurrentFamily, type FamilySummary } from './current';
import { gateDecision, ONBOARDING_PATH } from './gate';
import { ErrorNotice, NotConfiguredNotice } from './states';

export interface FamilyGateProps {
  children: ReactNode;
  /** Show the family switcher above the content when the user belongs to more than one family (default true). */
  showSwitcher?: boolean;
  /** Custom loading placeholder (defaults to skeleton blocks). */
  fallback?: ReactNode;
}

/**
 * Wrap any signed-in family page with it:
 * - Skeleton while families load; friendly notice if Supabase is not configured; error + retry.
 * - Redirects to /gia-dinh/bat-dau when the user has no family yet.
 * - Renders a family switcher (select) when the user belongs to more than one family.
 * Children render only when `useCurrentFamily().current` is set.
 */
export function FamilyGate({ children, showSwitcher = true, fallback }: FamilyGateProps) {
  const fam = useCurrentFamily();
  const t = useT('family');
  const decision = gateDecision(fam, getSupabase() !== null);

  switch (decision) {
    case 'not-configured':
      return <NotConfiguredNotice />;
    case 'loading':
      return (
        <div aria-busy="true" aria-live="polite">
          <span className="sr-only">{t('gate.loading')}</span>
          {fallback ?? <GateSkeleton />}
        </div>
      );
    case 'error':
      return <ErrorNotice message={t('gate.error')} onRetry={() => void fam.reload()} />;
    case 'onboard':
      return <Navigate to={ONBOARDING_PATH} replace />;
    case 'ready':
      return (
        <>
          {showSwitcher && fam.families.length > 1 && fam.current && <FamilySwitcher families={fam.families} currentId={fam.current.id} onSelect={fam.select} className="mb-6" />}
          {children}
        </>
      );
  }
}

export function FamilySwitcher({ families, currentId, onSelect, className }: { families: FamilySummary[]; currentId: string; onSelect: (id: string) => void; className?: string }) {
  const t = useT('family');
  return (
    <div className={cn('flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3', className)}>
      <label htmlFor="lh-family-switcher" className="text-[0.9rem] font-semibold text-ink-soft">
        {t('gate.switchLabel')}
      </label>
      <div className="sm:w-72">
        <Select id="lh-family-switcher" value={currentId} onChange={(e) => onSelect(e.target.value)}>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function GateSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}
