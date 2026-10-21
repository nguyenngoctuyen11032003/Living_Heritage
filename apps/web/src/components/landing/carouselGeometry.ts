// Pure geometry for the hero's curved carousel ("inside of a cylinder").
// All values are in frame units u, where u = min(100vw/1440, 100vh/1080) on desktop (and vw/640 on phones).

export const FRAME = {
  /** Frame centre x (units) on the 1440-unit design frame. */
  centre: 720,
  /** Normalising half-width: d = |x − centre| / HALF. */
  half: 706,
  /** Even spacing between card centres before the outward push. */
  pitch: 196,
  /** Base vertical centre on the 1080-unit frame. */
  centreY: 687,
  /** Corner radius. */
  radius: 15,
} as const;

/** Pushes an evenly-spaced offset t outward: x = centre + t·(1 + 0.083·(t/706)²). */
export function pushX(t: number, centre: number = FRAME.centre): number {
  const r = t / FRAME.half;
  return centre + t * (1 + 0.083 * r * r);
}

/** Card width for a normalised distance d: (170 + 48·d²). */
export function cardWidth(d: number): number {
  return 170 + 48 * d * d;
}

/** Height of one vertical edge at its own normalised distance q: (280 + 92·q^2.6). */
export function edgeHeight(q: number): number {
  return 280 + 92 * Math.pow(Math.abs(q), 2.6);
}

export interface Edge {
  x: number;
  top: number;
  bottom: number;
}

export interface CardGeometry {
  /** Pushed centre x. */
  x: number;
  /** Normalised distance of the centre. */
  d: number;
  width: number;
  /** Vertical centre (centreY − 12·d²). */
  cy: number;
  left: Edge;
  right: Edge;
}

export interface GeometryOptions {
  /** Horizontal centre in units (defaults to 720; use viewportWidth/(2u) on wide screens). */
  centre?: number;
  /** Base vertical centre in units (defaults to 687). */
  centreY?: number;
  /** Clamp normalised distances so cards don't balloon on ultra-wide screens. */
  maxD?: number;
}

/**
 * Geometry of the card whose evenly-spaced offset from the centre is t (units).
 * Each vertical edge has its own height from its own distance, so cards widen and grow taller towards the sides.
 */
export function cardGeometry(t: number, { centre = FRAME.centre, centreY = FRAME.centreY, maxD = Infinity }: GeometryOptions = {}): CardGeometry {
  const x = pushX(t, centre);
  const d = Math.min(maxD, Math.abs(x - centre) / FRAME.half);
  const width = cardWidth(d);
  const cy = centreY - 12 * d * d;
  const edge = (ex: number): Edge => {
    const q = Math.min(maxD, Math.abs(ex - centre) / FRAME.half);
    const h = edgeHeight(q);
    return { x: ex, top: cy - h / 2, bottom: cy + h / 2 };
  };
  return { x, d, width, cy, left: edge(x - width / 2), right: edge(x + width / 2) };
}

type Pt = readonly [number, number];

/** SVG path of a polygon with rounded corners (quadratic joins), for clip-path: path(). */
export function roundedPolygonPath(points: readonly Pt[], radius: number): string {
  const n = points.length;
  let path = '';
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]!;
    const cur = points[i]!;
    const next = points[(i + 1) % n]!;
    const toward = (a: Pt, b: Pt): Pt => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const r = Math.min(radius, len / 2);
      return [a[0] + (dx / len) * r, a[1] + (dy / len) * r];
    };
    const p1 = toward(cur, prev);
    const p2 = toward(cur, next);
    path += `${i === 0 ? 'M' : 'L'}${p1[0].toFixed(2)} ${p1[1].toFixed(2)}Q${cur[0].toFixed(2)} ${cur[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${path}Z`;
}

/** Wrap an offset into [−length/2, length/2) for seamless looping. */
export function wrap(value: number, length: number): number {
  return ((((value + length / 2) % length) + length) % length) - length / 2;
}
