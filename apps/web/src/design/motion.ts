import { useReducedMotion } from 'motion/react';
import { useMotionOverride } from './motionPref';

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_CARD = [0.22, 1, 0.36, 1] as const;

/**
 * True when motion should be kept to a minimum: the saved "reduce motion" choice (html[data-motion], see Settings > Display)
 * wins; with `auto` it follows the OS setting (false during SSR/tests without matchMedia).
 */
export function useReducedMotionSafe(): boolean {
  const os = useReducedMotion() ?? false;
  const override = useMotionOverride();
  return override === null ? os : override === 'reduce';
}
