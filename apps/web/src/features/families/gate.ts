import type { CurrentFamilyState } from './current';

export type GateDecision = 'not-configured' | 'loading' | 'error' | 'onboard' | 'ready';

/** Pure decision behind <FamilyGate>. */
export function gateDecision(state: Pick<CurrentFamilyState, 'loading' | 'error' | 'families' | 'current'>, configured: boolean): GateDecision {
  if (!configured) return 'not-configured';
  if (state.loading) return 'loading';
  if (state.error && state.families.length === 0) return 'error';
  if (state.families.length === 0 || !state.current) return 'onboard';
  return 'ready';
}

export const ONBOARDING_PATH = '/gia-dinh/bat-dau';
