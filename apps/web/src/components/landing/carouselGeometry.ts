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

/**
 * CSS matrix3d() (transform-origin 0 0) mapping the box [0,w]×[0,h] onto the quad tl, tr, br, bl (projective, Heckbert).
 * Lets a fixed-size card take any trapezoid shape with a compositor-only transform: no layout, no repaint per frame.
 */
export function quadMatrix3d(w: number, h: number, tl: Pt, tr: Pt, br: Pt, bl: Pt): string {
  const [x0, y0] = tl;
  const [x1, y1] = tr;
  const [x2, y2] = br;
  const [x3, y3] = bl;
  const dx3 = x0 - x1 + x2 - x3;
  const dy3 = y0 - y1 + y2 - y3;
  let g = 0;
  let k = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const dx1 = x1 - x2;
    const dx2 = x3 - x2;
    const dy1 = y1 - y2;
    const dy2 = y3 - y2;
    const det = dx1 * dy2 - dx2 * dy1 || 1e-9;
    g = (dx3 * dy2 - dx2 * dy3) / det;
    k = (dx1 * dy3 - dx3 * dy1) / det;
  }
  const a = (x1 - x0 + g * x1) / w;
  const d = (y1 - y0 + g * y1) / w;
  const b = (x3 - x0 + k * x3) / h;
  const e = (y3 - y0 + k * y3) / h;
  // The perspective terms are ~1e-5: keep enough digits that corners land within 0.001 px.
  const f = (n: number) => +n.toFixed(10);
  return `matrix3d(${f(a)},${f(d)},0,${f(g / w)},${f(b)},${f(e)},0,${f(k / h)},0,0,1,0,${f(x0)},${f(y0)},0,1)`;
}

/** Wrap an offset into [−length/2, length/2) for seamless looping. */
export function wrap(value: number, length: number): number {
  return ((((value + length / 2) % length) + length) % length) - length / 2;
}
