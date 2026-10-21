// Pure tiering for the family tree: narrators grouped by generation (1 = oldest), sorted by birth year.

export const GENERATIONS = [1, 2, 3, 4, 5, 6] as const;
export type Generation = (typeof GENERATIONS)[number];

export interface TreeNarrator {
  id: string;
  display_name: string;
  birth_year: number | null;
  generation: number | null;
  created_at?: string;
}

export interface Tier<N> {
  generation: Generation;
  narrators: N[];
}

export function isGeneration(v: unknown): v is Generation {
  return typeof v === 'number' && (GENERATIONS as readonly number[]).includes(v);
}

/** Oldest first; unknown birth years after known ones; then by name (Vietnamese collation). */
export function compareNarrators(a: TreeNarrator, b: TreeNarrator): number {
  const ya = a.birth_year ?? Number.POSITIVE_INFINITY;
  const yb = b.birth_year ?? Number.POSITIVE_INFINITY;
  if (ya !== yb) return ya < yb ? -1 : 1;
  return a.display_name.localeCompare(b.display_name, 'vi');
}

/** Tiers for generations that have at least one narrator (oldest tier first), plus the narrators without a generation. */
export function buildTiers<N extends TreeNarrator>(narrators: readonly N[]): { tiers: Tier<N>[]; unplaced: N[] } {
  const by = new Map<Generation, N[]>();
  const unplaced: N[] = [];
  for (const n of narrators) {
    if (isGeneration(n.generation)) {
      const list = by.get(n.generation) ?? [];
      list.push(n);
      by.set(n.generation, list);
    } else unplaced.push(n);
  }
  const tiers = GENERATIONS.filter((g) => by.has(g)).map((g) => ({ generation: g, narrators: [...by.get(g)!].sort(compareNarrators) }));
  return { tiers, unplaced: unplaced.sort(compareNarrators) };
}

/** Horizontal centres (0..100) of n equal columns. */
export function columnCenters(n: number): number[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => ((i + 0.5) / n) * 100);
}

/**
 * Horizontal centres (0..100) of n fixed-width cards centred in a row sized for `widest` cards:
 * row width = widest·card + (widest−1)·gap, cards packed with `gap` between them (a centred flex row).
 */
export function packedCenters(n: number, widest: number, card: number, gap: number): number[] {
  const cols = Math.max(widest, n, 1);
  const total = cols * card + (cols - 1) * gap;
  const used = n * card + Math.max(0, n - 1) * gap;
  const offset = (total - used) / 2;
  return Array.from({ length: Math.max(0, n) }, (_, i) => ((offset + card / 2 + i * (card + gap)) / total) * 100);
}

/**
 * SVG connector between an upper tier (m cards) and a lower tier (n cards), in a 100×40 box:
 * stems down from each upper card, one horizontal bar, drops into each lower card.
 * `centers` maps a card count to its x positions (equal columns by default).
 */
export function connectorPaths(m: number, n: number, centers: (count: number) => number[] = columnCenters): string[] {
  if (m <= 0 || n <= 0) return [];
  const up = centers(m);
  const down = centers(n);
  const all = [...up, ...down];
  const left = Math.min(...all);
  const right = Math.max(...all);
  const r = (x: number) => Math.round(x * 100) / 100;
  return [
    ...up.map((x) => `M${r(x)} 0V20`),
    ...(right > left ? [`M${r(left)} 20H${r(right)}`] : []),
    ...down.map((x) => `M${r(x)} 20V40`),
  ];
}

/** Count approved stories per narrator id. */
export function countByNarrator(rows: ReadonlyArray<{ narrator_id: string }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.narrator_id, (m.get(r.narrator_id) ?? 0) + 1);
  return m;
}

/** Avatar initial: first letter of the last word ("Bà nội Lan" → "L"), upper-cased. */
export function initialOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const w = words[words.length - 1] ?? '';
  return (Array.from(w)[0] ?? '?').toLocaleUpperCase('vi');
}

/** Vault list filtered by storyteller (the `nguoi-ke` query param read by features/vault/filter.ts). */
export function vaultByNarratorPath(narratorId: string): string {
  return `/gia-dinh?nguoi-ke=${encodeURIComponent(narratorId)}`;
}

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Reads every page of an ordered query (`page(from, to)` applies `.range(from, to)`): PostgREST caps one response at
 * max_rows = 1000. Returns `{ data, error }` like a single query; the first error stops the read.
 */
export async function readPaged<T>(page: (from: number, to: number) => PageResult<T>, size = 1000): Promise<{ data: T[]; error: unknown }> {
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) return { data: out, error };
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) return { data: out, error: null };
  }
}
