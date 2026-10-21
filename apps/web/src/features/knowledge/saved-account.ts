// "Lưu để xem sau" for signed-in users: the `saved_items` table is the source of truth. On the first sign-in on a
// device the device-local list is merged up once (DỰ ÁN B5: /da-luu khi có tài khoản); signed-out visitors keep the
// device list (saved.ts). Illustrative samples ('mau-…') are not public items, so they always stay on the device.
import { readSaved, writeSaved, type SavedEntry } from './saved';
import { isUuid, type KnowledgeItem } from './types';

/** Server calls, injected so the store can be tested without Supabase. */
export interface SavedApi {
  list(): Promise<SavedEntry[]>;
  /** Adds the ids that are still public; ignores ones already saved. Resolves to the ids skipped as no longer public. */
  add(ids: readonly string[]): Promise<string[]>;
  remove(id: string): Promise<void>;
}

export type AccountStatus = 'loading' | 'ready' | 'error';

export interface AccountSnapshot {
  status: AccountStatus;
  entries: SavedEntry[];
  /** Uploading the device list failed; it stays on the device and is retried on the next load. */
  mergeFailed: boolean;
}

/** Thrown by toggle() when the item was withdrawn from the public hub after the page loaded. */
export class SavedWithdrawnError extends Error {
  constructor() {
    super('withdrawn');
  }
}

/** Device entries that can be uploaded (real public items only; samples stay local). */
export function mergeCandidates(local: readonly SavedEntry[], server: readonly SavedEntry[]): string[] {
  const have = new Set(server.map((e) => e.id));
  return local.filter((e) => isUuid(e.id) && !have.has(e.id)).map((e) => e.id);
}

export class SavedAccountStore {
  private snap: AccountSnapshot = { status: 'loading', entries: [], mergeFailed: false };
  private listeners = new Set<() => void>();
  private loading: Promise<void> | null = null;

  constructor(
    private api: SavedApi,
    readonly userId: string,
  ) {}

  getSnapshot = (): AccountSnapshot => this.snap;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(patch: Partial<AccountSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  /** Loads once (merging the device list on the first sign-in); call reload() to retry after an error. */
  ensureLoaded(): Promise<void> {
    if (!this.loading) this.loading = this.load();
    return this.loading;
  }

  reload(): Promise<void> {
    this.loading = this.load();
    return this.loading;
  }

  private async load() {
    this.set({ status: 'loading' });
    let mergeFailed = false;
    // Every load (each sign-in): anything saved on this device while signed out is moved up. Idempotent: duplicates
    // are ignored and withdrawn items skipped. Afterwards only what cannot be uploaded (samples) stays on the device.
    const local = readSaved();
    const ids = mergeCandidates(local, []);
    if (ids.length > 0) {
      try {
        await this.api.add(ids);
        writeSaved(local.filter((e) => !isUuid(e.id)));
      } catch {
        mergeFailed = true;
      }
    }
    try {
      const entries = await this.api.list();
      this.set({ status: 'ready', entries, mergeFailed });
    } catch {
      this.set({ status: 'error', mergeFailed });
    }
  }

  has(id: string): boolean {
    return this.snap.entries.some((e) => e.id === id);
  }

  /** Optimistic toggle; reverts and rethrows when the server call fails (the caller tells the user). */
  async toggle(item: KnowledgeItem, entry: SavedEntry): Promise<boolean> {
    const before = this.snap.entries;
    if (this.has(item.id)) {
      this.set({ entries: before.filter((e) => e.id !== item.id) });
      try {
        await this.api.remove(item.id);
      } catch (e) {
        this.set({ entries: before });
        throw e;
      }
      return false;
    }
    this.set({ entries: [entry, ...before] });
    let skipped: string[];
    try {
      skipped = await this.api.add([item.id]);
    } catch (e) {
      this.set({ entries: before });
      throw e;
    }
    if (skipped.includes(item.id)) {
      this.set({ entries: before });
      throw new SavedWithdrawnError();
    }
    return true;
  }

  async remove(id: string): Promise<void> {
    const before = this.snap.entries;
    this.set({ entries: before.filter((e) => e.id !== id) });
    try {
      await this.api.remove(id);
    } catch (e) {
      this.set({ entries: before });
      throw e;
    }
  }
}
