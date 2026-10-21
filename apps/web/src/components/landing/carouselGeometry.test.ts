import { describe, expect, it } from 'vitest';
import { cardGeometry, cardWidth, edgeHeight, FRAME, pushX, roundedPolygonPath, wrap } from './carouselGeometry';

describe('curved carousel geometry', () => {
  it('centre card is 170 × 280 units at d = 0', () => {
    const g = cardGeometry(0);
    expect(g.x).toBe(720);
    expect(g.d).toBe(0);
    expect(g.width).toBe(170);
    expect(g.cy).toBe(FRAME.centreY);
    expect(g.left.bottom - g.left.top).toBeCloseTo(280, 0);
    expect(g.right.bottom - g.right.top).toBeCloseTo(280, 0);
    expect(edgeHeight(0)).toBe(280);
  });

  it('an edge at q = 1 is ≈ 372 units tall and width grows with d²', () => {
    expect(edgeHeight(1)).toBeCloseTo(372, 5);
    expect(cardWidth(1)).toBe(218);
  });

  it('pushes the centre outward: t = 706 lands at ≈ 720 + 706·1.083', () => {
    expect(pushX(706) - 720).toBeCloseTo(706 * 1.083, 5);
    expect(pushX(-706) - 720).toBeCloseTo(-706 * 1.083, 5);
    expect(cardGeometry(706).x).toBeCloseTo(720 + 706 * 1.083, 5);
  });

  it('outer edge is taller than the inner edge and the card centre rises (687 − 12d²)', () => {
    const g = cardGeometry(392);
    const inner = g.left.bottom - g.left.top;
    const outer = g.right.bottom - g.right.top;
    expect(outer).toBeGreaterThan(inner);
    expect(g.cy).toBeCloseTo(687 - 12 * g.d * g.d, 8);
    const mirrored = cardGeometry(-392);
    expect(mirrored.left.bottom - mirrored.left.top).toBeCloseTo(outer, 8);
  });

  it('maxD clamps growth on ultra-wide screens', () => {
    expect(cardGeometry(2000, { maxD: 1.2 }).d).toBe(1.2);
  });

  it('wraps offsets seamlessly and builds a closed rounded path', () => {
    expect(wrap(0, 100)).toBe(0);
    expect(wrap(60, 100)).toBe(-40);
    expect(wrap(-60, 100)).toBe(40);
    const p = roundedPolygonPath(
      [
        [0, 0],
        [100, 10],
        [100, 190],
        [0, 200],
      ],
      15,
    );
    expect(p.startsWith('M')).toBe(true);
    expect(p.endsWith('Z')).toBe(true);
    expect(p.match(/Q/g)).toHaveLength(4);
  });
});
