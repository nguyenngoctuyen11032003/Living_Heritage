// Admin calls whose backend lives outside this folder: the `admin-erase` Edge Function and the A10 RPCs
// (admin_withdraw_public, pilot_summary, content_counts). Parsing is pure and unit tested.
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Supabase } from '@/lib/supabase';

// ---- admin-erase (B12 real erase of a deletion request) -----------------------------------------------------

export const ERASE_ERROR_CODES = ['unauthorized', 'forbidden', 'not_found', 'bad_request', 'internal'] as const;
export type EraseErrorCode = (typeof ERASE_ERROR_CODES)[number];

export interface EraseResult {
  removed: number;
  failed: number;
  skipped: number;
  /** complete: DB + every file erased; retry: some files failed (same call again); review: some objects were refused. */
  outcome: 'complete' | 'retry' | 'review';
}

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/** 200 body → result; null when the body is not a successful erase. A failed file wins over a skipped one (retry first). */
export function parseEraseResult(data: unknown): EraseResult | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.db_done !== true) return null;
  const removed = count(d.removed);
  const failed = count(d.failed);
  const skipped = count(d.skipped);
  return { removed, failed, skipped, outcome: failed > 0 ? 'retry' : skipped > 0 ? 'review' : 'complete' };
}

export function eraseErrorCode(payload: unknown): EraseErrorCode {
  const e = payload && typeof payload === 'object' ? (payload as { error?: unknown }).error : undefined;
  return (ERASE_ERROR_CODES as readonly string[]).includes(e as string) ? (e as EraseErrorCode) : 'internal';
}

export class EraseError extends Error {
  constructor(public code: EraseErrorCode) {
    super(code);
  }
}

/** The word the admin types to confirm an irreversible erase (case-, accent-composition- and space-insensitive). */
export function confirmMatches(input: string, word: string): boolean {
  const norm = (s: string) => s.normalize('NFC').trim().toLocaleUpperCase('vi');
  return word.length > 0 && norm(input) === norm(word);
}

export async function invokeErase(sb: Supabase, requestId: string): Promise<EraseResult> {
  const { data, error } = await sb.functions.invoke('admin-erase', { body: { requestId } });
  if (error) {
    let payload: unknown = null;
    if (error instanceof FunctionsHttpError) {
      try {
        payload = await (error.context as Response).json();
      } catch {
        /* non-JSON body */
      }
    }
    throw new EraseError(eraseErrorCode(payload));
  }
  const result = parseEraseResult(data);
  if (!result) throw new EraseError('internal');
  return result;
}

// ---- A10 RPCs (migration 20261022000600) ------------------------------------------------------------------


export const TAKEDOWN_REASON_MAX = 500; // admin_withdraw_public: 3..500 characters after trimming
export const takedownReasonValid = (reason: string) => reason.trim().length >= 3 && reason.trim().length <= TAKEDOWN_REASON_MAX;

/** B5/B11: admin takes a reported public item off the hub (reason mandatory, audited by the RPC). */
export async function withdrawPublicItem(sb: Supabase, itemId: string, reason: string): Promise<{ ok: true } | { ok: false; code: string }> {
  const { error } = await sb.rpc('admin_withdraw_public', { p_item: itemId, p_reason: reason.trim() });
  return error ? { ok: false, code: error.message.trim() } : { ok: true };
}

export type Cell = string | number | boolean | null;
export interface Table {
  columns: string[];
  rows: Cell[][];
}

/** pilot_summary.counts is {event_code: n}: shown as "code: n; …" rather than JSON. */
function isFlatRecord(v: unknown): v is Record<string, string | number | boolean> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v) && Object.values(v as object).every((x) => ['string', 'number', 'boolean'].includes(typeof x));
}

/** RPC result (rows or one object) → a flat table; flat objects become "k: v; …", other nested values JSON. */
export function toTable(data: unknown): Table {
  const list = Array.isArray(data) ? data : data && typeof data === 'object' ? [data] : [];
  const objs = list.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x));
  const columns: string[] = [];
  for (const o of objs) for (const k of Object.keys(o)) if (!columns.includes(k)) columns.push(k);
  const cell = (v: unknown): Cell =>
    v === undefined || v === null
      ? null
      : typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        ? v
        : isFlatRecord(v)
          ? Object.entries(v).map(([k, n]) => `${k}: ${n}`).join('; ')
          : JSON.stringify(v);
  return { columns, rows: objs.map((o) => columns.map((c) => cell(o[c]))) };
}

/** A missing function (not deployed yet) is "unavailable", not an error. */
export function isMissingFunction(err: { code?: string; message?: string } | null): boolean {
  return Boolean(err && (err.code === 'PGRST202' || err.code === '42883' || /could not find the function/i.test(err.message ?? '')));
}

/** Read-only aggregate RPC: table, 'unavailable' when not deployed, throws on other errors. */
export async function loadAggregate(sb: Supabase, fn: 'pilot_summary' | 'content_counts'): Promise<Table | 'unavailable'> {
  const { data, error } = fn === 'pilot_summary' ? await sb.rpc('pilot_summary') : await sb.rpc('content_counts');
  if (error) {
    if (isMissingFunction(error)) return 'unavailable';
    throw new Error(error.message);
  }
  return toTable(data);
}

/** Table → CSV rows (header first; null → empty, booleans → true/false). */
export function tableRows(t: Table): (string | number)[][] {
  return [t.columns, ...t.rows.map((r) => r.map((c) => (c === null ? '' : typeof c === 'boolean' ? String(c) : c)))];
}
