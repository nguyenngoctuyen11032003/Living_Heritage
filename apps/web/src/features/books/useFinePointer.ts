import { useSyncExternalStore } from 'react';

const QUERY = '(hover: hover) and (pointer: fine)';

function subscribe(onChange: () => void): () => void {
  const mq = typeof window !== 'undefined' ? window.matchMedia?.(QUERY) : undefined;
  if (!mq) return () => {};
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const snapshot = () => (typeof window !== 'undefined' && window.matchMedia?.(QUERY).matches) || false;

/** True on devices with a mouse/trackpad (and so usually a keyboard); false on touch screens. */
export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
