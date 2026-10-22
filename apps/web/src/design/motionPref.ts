import { useSyncExternalStore } from 'react';

export const MOTION_PREFS = ['auto', 'reduce', 'full'] as const;
export type MotionPref = (typeof MOTION_PREFS)[number];
const KEY = 'lh.motion';

export function readMotionPref(): MotionPref {
  try {
    const v = localStorage.getItem(KEY);
    if (v && (MOTION_PREFS as readonly string[]).includes(v)) return v as MotionPref;
  } catch {
    /* storage blocked */
  }
  return 'auto';
}

/** html[data-motion] is only set for the two explicit choices; `auto` leaves the attribute off (device setting decides). */
export function applyMotionPref(pref: MotionPref): void {
  if (typeof document === 'undefined') return;
  if (pref === 'auto') delete document.documentElement.dataset.motion;
  else document.documentElement.dataset.motion = pref;
}

export function setMotionPref(pref: MotionPref): void {
  applyMotionPref(pref);
  try {
    if (pref === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage blocked */
  }
}

/** The explicit choice currently applied on <html>, or null for `auto`. */
export function motionOverride(): 'reduce' | 'full' | null {
  if (typeof document === 'undefined') return null;
  const v = document.documentElement.dataset.motion;
  return v === 'reduce' || v === 'full' ? v : null;
}

export function subscribeMotionOverride(cb: () => void): () => void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => {};
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => mo.disconnect();
}

export function useMotionOverride(): 'reduce' | 'full' | null {
  return useSyncExternalStore(subscribeMotionOverride, motionOverride, () => null);
}

// Apply the saved choice as soon as the app loads, like the saved text size.
applyMotionPref(readMotionPref());
