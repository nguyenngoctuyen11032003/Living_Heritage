import { useEffect, useSyncExternalStore } from 'react';

// Reader text size (spec B3: "cỡ chữ có lựa chọn tăng/giảm và lưu tùy chọn"). Applied as html[data-text-scale]
// (design/global.css), restored before first paint by the inline script in index.html. One shared store, so every
// TextScaleSwitch on the page (sidebar, mobile header, settings) shows the same choice. Independent of lib/theme.ts.

export const TEXT_SCALES = ['100', '115', '130'] as const;
export type TextScale = (typeof TEXT_SCALES)[number];
export const TEXT_SCALE_KEY = 'lh.textScale';

const listeners = new Set<() => void>();
/** Fallback when storage is blocked, so the control still works for this page view. */
let memory: TextScale | null = null;

function isScale(v: unknown): v is TextScale {
  return typeof v === 'string' && (TEXT_SCALES as readonly string[]).includes(v);
}

/** Stored choice, else '100'. */
export function getTextScale(): TextScale {
  try {
    const stored = localStorage.getItem(TEXT_SCALE_KEY);
    if (isScale(stored)) return stored;
  } catch {
    /* storage blocked */
  }
  return memory ?? '100';
}

function apply(scale: TextScale): void {
  if (typeof document === 'undefined') return;
  if (scale === '100') delete document.documentElement.dataset.textScale;
  else document.documentElement.dataset.textScale = scale;
}

/** Apply, persist and broadcast a scale. Unknown values fall back to '100'. */
export function setTextScale(next: string): void {
  const scale: TextScale = isScale(next) ? next : '100';
  memory = scale;
  apply(scale);
  try {
    localStorage.setItem(TEXT_SCALE_KEY, scale);
  } catch {
    /* storage blocked */
  }
  listeners.forEach((l) => l());
}

/** One step smaller (-1) or larger (+1), clamped to the available scales. */
export function stepTextScale(current: TextScale, delta: -1 | 1): TextScale {
  const i = TEXT_SCALES.indexOf(current) + delta;
  return TEXT_SCALES[Math.max(0, Math.min(TEXT_SCALES.length - 1, i))]!;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTextScale(): [TextScale, (next: TextScale) => void] {
  const scale = useSyncExternalStore(subscribe, getTextScale, () => '100' as TextScale);
  // Keep the html attribute in step with the store (e.g. when the boot script could not run).
  useEffect(() => apply(scale), [scale]);
  return [scale, setTextScale];
}
