// Every RPC / bucket name used by admin-erase lives here, so a change on the DB side is adapted in one place.
import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET_MEDIA, BUCKET_PUBLIC_AUDIO, BUCKET_RECORDINGS } from '../../_shared/constants.ts';

/**
 * The deletion RPC (migration by the DB owner). Runs as the caller: it checks is_admin(), deletes the rows in one
 * transaction, audits, sets the request 'done' and returns the storage objects to erase as `{ bucket, path }[]`
 * (setof rows or a json array). Calling it again for a done request returns the stored objects again (or none).
 */
export const ERASE_RPC = 'admin_process_deletion';
export const ERASE_RPC_ARG = 'p_request';

export interface StorageObject {
  bucket: string;
  path: string;
}

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const NAME = '[A-Za-z0-9_-]{1,64}\\.[A-Za-z0-9]{1,8}';

/** Buckets this function may erase from, each with the only object-name shapes the app writes there. */
export const ERASABLE: Record<string, RegExp> = {
  // `${family_id}/${narrator_id}/${uuid}.webm`
  [BUCKET_RECORDINGS]: new RegExp(`^${UUID}/${UUID}/${NAME}$`),
  // `${family_id}/${uuid}.${ext}` (one optional sub-folder)
  [BUCKET_MEDIA]: new RegExp(`^${UUID}/(?:[A-Za-z0-9_-]{1,64}/)?${NAME}$`),
  // `items/${public_item_id}.webm`
  [BUCKET_PUBLIC_AUDIO]: new RegExp(`^items/${NAME}$`),
};

export function isErasable(o: StorageObject): boolean {
  const re = Object.hasOwn(ERASABLE, o.bucket) ? ERASABLE[o.bucket] : undefined;
  return re !== undefined && re.test(o.path);
}

/** RPC result → objects. Accepts rows / a json array, or `{ objects: [...] }`; malformed entries are dropped. */
export function parseObjects(data: unknown): StorageObject[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object' && Array.isArray((data as { objects?: unknown }).objects)) {
    list = (data as { objects: unknown[] }).objects;
  }
  const out: StorageObject[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    const r = x as { bucket?: unknown; path?: unknown } | null;
    if (!r || typeof r.bucket !== 'string' || typeof r.path !== 'string') continue;
    const key = `${r.bucket}\u0000${r.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ bucket: r.bucket, path: r.path });
  }
  return out;
}

export type EraseFailure = 'forbidden' | 'not_found' | 'bad_request' | 'failed';

export type EraseRpcResult = { ok: true; objects: StorageObject[] } | { ok: false; reason: EraseFailure };

/** Postgres error code → reason (42501 = not admin, P0002 = no such request, 22023 / 22P02 = invalid argument). */
export function rpcFailure(code: string | undefined): EraseFailure {
  if (code === '42501') return 'forbidden';
  if (code === 'P0002') return 'not_found';
  if (code === '22023' || code === '22P02') return 'bad_request';
  return 'failed';
}

// deno-lint-ignore no-explicit-any
type Client = SupabaseClient<any, any, any>;

/** As the caller (anon key + JWT): the DB decides whether they are an admin. */
export async function callEraseRpc(user: Client, requestId: string): Promise<EraseRpcResult> {
  const { data, error } = await user.rpc(ERASE_RPC, { [ERASE_RPC_ARG]: requestId });
  if (error) return { ok: false, reason: rpcFailure((error as { code?: string }).code) };
  return { ok: true, objects: parseObjects(data) };
}

/** service_role removal of up to 100 names in one bucket; true when the call succeeded. */
export async function removeObjects(admin: Client, bucket: string, paths: string[]): Promise<boolean> {
  const { error } = await admin.storage.from(bucket).remove(paths);
  return !error;
}
