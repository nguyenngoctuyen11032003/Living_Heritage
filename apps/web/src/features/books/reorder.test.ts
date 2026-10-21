import { describe, expect, it } from 'vitest';
import { byPosition, moveBy, moveItem, nextPosition, positionUpdates, renumber } from './reorder';

const rows = (ids: string[], positions?: number[]) => ids.map((id, i) => ({ story_id: id, position: positions?.[i] ?? i }));

describe('moveItem / moveBy', () => {
  it('moves items and clamps the target', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 7, 0)).toEqual(['a', 'b']);
  });
  it('steps up and down without mutating the input', () => {
    const list = ['a', 'b', 'c'];
    expect(moveBy(list, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveBy(list, 2, 1)).toEqual(['a', 'b', 'c']);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});

describe('positions', () => {
  it('reports only rows whose position changed', () => {
    const moved = moveBy(rows(['a', 'b', 'c']), 2, -1);
    expect(positionUpdates(moved)).toEqual([
      { story_id: 'c', position: 1 },
      { story_id: 'b', position: 2 },
    ]);
    expect(renumber(moved).map((r) => r.position)).toEqual([0, 1, 2]);
  });
  it('normalises sparse positions and appends after the max', () => {
    const sparse = rows(['x', 'y'], [5, 9]);
    expect(positionUpdates(sparse)).toHaveLength(2);
    expect(nextPosition(sparse)).toBe(10);
    expect(nextPosition([])).toBe(0);
  });
  it('sorts by position, stable on ties', () => {
    expect(byPosition(rows(['a', 'b', 'c'], [2, 0, 0])).map((r) => r.story_id)).toEqual(['b', 'c', 'a']);
  });
});
