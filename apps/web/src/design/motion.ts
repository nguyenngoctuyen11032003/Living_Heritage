import { useReducedMotion } from 'motion/react';
import { useMotionOverride } from './motionPref';

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_CARD = [0.22, 1, 0.36, 1] as const;

/** True when the user asked the OS for reduced motion (false during SSR/tests without matchMedia). */
export function useReducedMotionSafe(): boolean {
  const os = useReducedMotion() ?? false;
  const override = useMotionOverride();
  return override === null ? os : override === 'reduce';
}
