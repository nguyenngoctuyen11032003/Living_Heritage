/** Pure ordering helpers shared by book chapters and collection items (both have a `position` column). */

/** Move the item at `from` to index `to` (clamped). Returns a new array; out-of-range `from` returns a copy. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item as T);
  return next;
}

/** Move one step up (-1) or down (+1). */
export function moveBy<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  return moveItem(list, index, index + delta);
}

export interface Positioned {
  story_id: string;
  position: number;
}

/** Rows whose stored position differs from their index in `ordered` (positions are renumbered 0..n-1). */
export function positionUpdates<T extends Positioned>(ordered: readonly T[]): Array<{ story_id: string; position: number }> {
  const out: Array<{ story_id: string; position: number }> = [];
  ordered.forEach((row, i) => {
    if (row.position !== i) out.push({ story_id: row.story_id, position: i });
  });
  return out;
}

/** Same list with positions rewritten to match the order. */
export function renumber<T extends Positioned>(ordered: readonly T[]): T[] {
  return ordered.map((row, i) => (row.position === i ? row : { ...row, position: i }));
}

/** Position for a new item appended at the end. */
export function nextPosition(list: readonly Positioned[]): number {
  return list.reduce((max, r) => Math.max(max, r.position), -1) + 1;
}

/** Sort by stored position, stable on ties. */
export function byPosition<T extends Positioned>(list: readonly T[]): T[] {
  return list
    .map((row, i) => ({ row, i }))
    .sort((a, b) => a.row.position - b.row.position || a.i - b.i)
    .map((x) => x.row);
}
