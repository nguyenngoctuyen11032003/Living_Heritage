// Tiny in-isolate LRU cache (Map keeps insertion order; a hit re-inserts the key as most recent).

export interface Lru<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  readonly size: number;
}

export function createLru<V>(opts: { maxEntries: number; maxBytes?: number; sizeOf?: (v: V) => number }): Lru<V> {
  const map = new Map<string, V>();
  const sizeOf = opts.sizeOf ?? (() => 0);
  const maxBytes = opts.maxBytes ?? Number.POSITIVE_INFINITY;
  let bytes = 0;

  const evictOldest = () => {
    const oldest = map.keys().next();
    if (oldest.done) return;
    bytes -= sizeOf(map.get(oldest.value)!);
    map.delete(oldest.value);
  };

  return {
    get(key) {
      const v = map.get(key);
      if (v === undefined) return undefined;
      map.delete(key);
      map.set(key, v);
      return v;
    },
    set(key, value) {
      const size = sizeOf(value);
      if (size > maxBytes || opts.maxEntries <= 0) return;
      const prev = map.get(key);
      if (prev !== undefined) {
        bytes -= sizeOf(prev);
        map.delete(key);
      }
      map.set(key, value);
      bytes += size;
      while (map.size > opts.maxEntries || bytes > maxBytes) evictOldest();
    },
    get size() {
      return map.size;
    },
  };
}
