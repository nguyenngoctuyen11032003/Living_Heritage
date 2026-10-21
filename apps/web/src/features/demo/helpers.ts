// Small pure helpers for the walkthrough views (kept apart from components for fast refresh and tests).
import { filtersToParams } from '@/features/knowledge/filters';
import type { DemoLine } from './data';

/** m:ss */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Index of the line being "said" at time `t` (-1 before the first line). */
export function lineAt(lines: readonly DemoLine[], t: number): number {
  let i = -1;
  for (let k = 0; k < lines.length; k++) if (lines[k]!.t <= t) i = k;
  return i;
}

/** The mai know-how card the visitor can find on /kham-pha. */
export const EXPLORE_SAMPLE_ID = 'demo-tuot-la-mai';

/** /kham-pha filtered to one topic's know-how cards. */
export function explorePath(topic: string): string {
  return `/kham-pha?${filtersToParams({ q: '', topic, kind: 'experience', region: null, decade: null }).toString()}`;
}
