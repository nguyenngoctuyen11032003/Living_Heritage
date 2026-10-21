// Small per-device storytelling preferences (localStorage; every access may throw in private mode).

export const AUTO_READ_KEY = 'lh.narrator.autoRead';
export const HOWTO_KEY = 'lh.narrator.howtoSeen.v1';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function storage(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function read(key: string, store: KeyValueStore | null): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string, store: KeyValueStore | null): void {
  try {
    store?.setItem(key, value);
  } catch {
    /* storage full or blocked: the preference just lasts for this visit */
  }
}

/** "Tự đọc câu hỏi": off unless the narrator turned it on. */
export function readAutoRead(store: KeyValueStore | null = storage()): boolean {
  return read(AUTO_READ_KEY, store) === '1';
}

export function writeAutoRead(on: boolean, store: KeyValueStore | null = storage()): void {
  write(AUTO_READ_KEY, on ? '1' : '0', store);
}

/** The first-time "Cách kể chuyện" guide shows until it is dismissed once on this device. */
export function shouldShowHowTo(store: KeyValueStore | null = storage()): boolean {
  return read(HOWTO_KEY, store) !== '1';
}

export function markHowToSeen(store: KeyValueStore | null = storage()): void {
  write(HOWTO_KEY, '1', store);
}
