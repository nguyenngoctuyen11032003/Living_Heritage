// Reconciles the public `public-audio` bucket with `public_items` (spec 1 §7 invariants):
// - every public item with audio_path gets its file copied from the private `recordings` bucket;
// - every file under items/ that no public item references any more (withdrawn, audio switched off) is deleted.
// Idempotent and safe to call by any signed-in user: it only ever exposes audio that review_publish already
// approved for publication, and only ever removes audio that is no longer approved.
import { fail, json } from '../_shared/http.ts';
import { preflight } from '../_shared/cors.ts';

export interface PublicItemAudio {
  id: string;
  audio_path: string;
  /** recordings.storage_path of the story's source recording (null if the story has none). */
  source_path: string | null;
}

export interface SyncStore {
  /** Public items with audio_path set, joined to their source recording path. */
  listPublishedAudio(): Promise<PublicItemAudio[]>;
  /** Object names currently under public-audio/items/. */
  listPublicFiles(): Promise<string[]>;
  copyToPublic(sourcePath: string, targetPath: string): Promise<void>;
  removePublic(paths: string[]): Promise<void>;
}

export interface SyncDeps {
  verifyUser(jwt: string): Promise<boolean>;
  store(): SyncStore;
}

export interface SyncResult {
  copied: string[];
  removed: string[];
  failed: string[];
}

/** Only flat object names under items/ are ever copied into the public bucket. */
const SAFE_AUDIO_PATH = /^items\/[A-Za-z0-9._-]{1,120}$/;

export async function reconcile(store: SyncStore): Promise<SyncResult> {
  const [items, files] = await Promise.all([store.listPublishedAudio(), store.listPublicFiles()]);
  const present = new Set(files);
  const wanted = new Set(items.map((i) => i.audio_path));
  const result: SyncResult = { copied: [], removed: [], failed: [] };

  for (const item of items) {
    if (!SAFE_AUDIO_PATH.test(item.audio_path)) {
      result.failed.push(item.id);
      continue;
    }
    if (present.has(item.audio_path)) continue;
    if (!item.source_path) {
      result.failed.push(item.id);
      continue;
    }
    try {
      await store.copyToPublic(item.source_path, item.audio_path);
      result.copied.push(item.audio_path);
    } catch {
      result.failed.push(item.id);
    }
  }

  const orphans = files.filter((f) => !wanted.has(f));
  if (orphans.length > 0) {
    await store.removePublic(orphans);
    result.removed.push(...orphans);
  }
  return result;
}

export async function handle(req: Request, deps: SyncDeps): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('bad_request');
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt || !(await deps.verifyUser(jwt))) return fail('unauthorized');
  try {
    return json(200, await reconcile(deps.store()));
  } catch {
    return fail('internal');
  }
}
