// A take that is kept on this device until it is safely stored on the server (B16: network failures keep the source).
// Keyed by `${sessionId}/${questionId}` so a retry for the same question reuses the same attempt id (no duplicates).

export interface PendingUpload {
  key: string;
  /** Fixed per attempt: becomes the file name, so retries never create a second object or row. */
  attemptId: string;
  blob: Blob;
  mime: string;
  duration: number;
  familyId: string;
  narratorId: string;
  sessionId: string;
  questionId: string | null;
  createdAt: number;
  /** The object is in Storage (only the database row may still be missing). */
  uploaded: boolean;
  recordingId: string | null;
}

export interface PendingStore {
  get(key: string): Promise<PendingUpload | null>;
  put(item: PendingUpload): Promise<void>;
  delete(key: string): Promise<void>;
}

export function pendingKey(sessionId: string, questionId: string | null): string {
  return `${sessionId}/${questionId ?? 'free'}`;
}

/** In-memory store: tests, and the fallback when IndexedDB is unavailable (private mode, old browsers). */
export function createMemoryPendingStore(): PendingStore {
  const map = new Map<string, PendingUpload>();
  return {
    get: async (key) => map.get(key) ?? null,
    put: async (item) => {
      map.set(item.key, item);
    },
    delete: async (key) => {
      map.delete(key);
    },
  };
}

const DB_NAME = 'lh-storytelling';
const STORE = 'pending-uploads';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        t.onerror = () => {
          db.close();
          reject(t.error ?? req.error);
        };
        t.onabort = () => {
          db.close();
          reject(t.error ?? req.error);
        };
      }),
  );
}

export function createIdbPendingStore(): PendingStore {
  return {
    get: async (key) => ((await tx('readonly', (s) => s.get(key))) as PendingUpload | undefined) ?? null,
    put: async (item) => {
      await tx('readwrite', (s) => s.put(item));
    },
    delete: async (key) => {
      await tx('readwrite', (s) => s.delete(key));
    },
  };
}

/** IndexedDB when it works, memory otherwise (never throws on access). */
export function createPendingStore(): PendingStore {
  const memory = createMemoryPendingStore();
  if (typeof indexedDB === 'undefined') return memory;
  const idb = createIdbPendingStore();
  const safe = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, fallback: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      try {
        return await fn(...a);
      } catch {
        return fallback(...a);
      }
    };
  return {
    get: async (key) => (await safe(idb.get, memory.get)(key)) ?? (await memory.get(key)),
    put: async (item) => {
      await memory.put(item);
      await safe(idb.put, async () => {})(item);
    },
    delete: async (key) => {
      await memory.delete(key);
      await safe(idb.delete, async () => {})(key);
    },
  };
}

let shared: PendingStore | null = null;
export function getPendingStore(): PendingStore {
  shared ??= createPendingStore();
  return shared;
}
