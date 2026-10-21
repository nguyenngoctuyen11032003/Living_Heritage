// admin-erase: carries out a deletion request (B12 "yêu cầu xóa"). The DB step runs as the caller through
// admin_process_deletion (is_admin checked there, one transaction); then the returned storage objects are erased with
// the service role, per bucket, in batches, only from allowed buckets and only for the object shapes the app writes.
// A storage failure never undoes the DB step: it is reported (and logged) so the admin can run it again with the same
// request id (idempotent: the RPC returns the stored objects again, and removing a missing object is a no-op).
import { z } from 'zod';
import { preflight } from '../_shared/cors.ts';
import { fail, json, readLimited } from '../_shared/http.ts';
import { type EraseRpcResult, isErasable, type StorageObject } from './lib/db.ts';

export const REMOVE_BATCH = 100;
const BODY_MAX_BYTES = 1024;

export const EraseRequest = z.object({ requestId: z.uuid() });

export interface EraseResponse {
  request_id: string;
  /** DB rows are deleted and the request is done (always true on 200). */
  db_done: true;
  /** Storage objects erased (or already absent). */
  removed: number;
  /** Objects whose removal failed: run the same request again to retry. */
  failed: number;
  /** Objects refused (unknown bucket or unexpected path): never removed, logged. */
  skipped: number;
  /** failed === 0 and skipped === 0. */
  storage_complete: boolean;
}

export interface EraseDeps {
  /** Validates the JWT; the user id or null. */
  verifyUser(jwt: string): Promise<string | null>;
  /** admin_process_deletion as the caller. */
  eraseRpc(jwt: string, requestId: string): Promise<EraseRpcResult>;
  /** service_role storage removal of ≤ REMOVE_BATCH names in one bucket; false on failure. */
  remove(bucket: string, paths: string[]): Promise<boolean>;
  log(message: string): void;
}

export async function eraseObjects(
  deps: EraseDeps,
  objects: StorageObject[],
): Promise<{ removed: number; failed: number; skipped: number }> {
  const byBucket = new Map<string, string[]>();
  let skipped = 0;
  for (const o of objects) {
    if (!isErasable(o)) {
      skipped++;
      continue;
    }
    const list = byBucket.get(o.bucket) ?? [];
    list.push(o.path);
    byBucket.set(o.bucket, list);
  }
  let removed = 0;
  let failed = 0;
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
      const batch = paths.slice(i, i + REMOVE_BATCH);
      let ok = false;
      try {
        ok = await deps.remove(bucket, batch);
      } catch {
        ok = false;
      }
      if (ok) removed += batch.length;
      else failed += batch.length;
    }
  }
  return { removed, failed, skipped };
}

export async function handle(req: Request, deps: EraseDeps): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('bad_request');

  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')?.trim() ?? '');
  if (!m) return fail('unauthorized');
  const jwt = m[1]!;
  let userId: string | null;
  try {
    userId = await deps.verifyUser(jwt);
  } catch {
    userId = null;
  }
  if (!userId) return fail('unauthorized');

  const text = await readLimited(req, BODY_MAX_BYTES);
  if (text === null) return fail('bad_request');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail('bad_request');
  }
  const parsed = EraseRequest.safeParse(body);
  if (!parsed.success) return fail('bad_request');
  const { requestId } = parsed.data;

  let rpc: EraseRpcResult;
  try {
    rpc = await deps.eraseRpc(jwt, requestId);
  } catch {
    rpc = { ok: false, reason: 'failed' };
  }
  if (!rpc.ok) {
    if (rpc.reason === 'failed') deps.log(`admin-erase: request ${requestId}: database step failed`);
    return fail(rpc.reason === 'failed' ? 'internal' : rpc.reason);
  }

  const { removed, failed, skipped } = await eraseObjects(deps, rpc.objects);
  if (failed > 0 || skipped > 0) {
    deps.log(`admin-erase: request ${requestId}: storage incomplete (removed ${removed}, failed ${failed}, skipped ${skipped})`);
  }
  const out: EraseResponse = {
    request_id: requestId,
    db_done: true,
    removed,
    failed,
    skipped,
    storage_complete: failed === 0 && skipped === 0,
  };
  return json(200, out);
}
