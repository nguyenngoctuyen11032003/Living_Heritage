// Pure admin rules: who sees the console, which tabs exist, and allowed status transitions per table.

export type AdminCheck = 'pending' | 'yes' | 'no' | 'error';
export type AdminAccess = 'not-configured' | 'loading' | 'signed-out' | 'forbidden' | 'error' | 'ready';

export interface AdminAccessInput {
  configured: boolean;
  sessionLoading: boolean;
  signedIn: boolean;
  /** Narrator-link (anonymous) sessions can never be admins. */
  isAnonymous: boolean;
  adminCheck: AdminCheck;
}

export function resolveAdminAccess(i: AdminAccessInput): AdminAccess {
  if (!i.configured) return 'not-configured';
  if (i.sessionLoading) return 'loading';
  if (!i.signedIn) return 'signed-out';
  if (i.isAnonymous) return 'forbidden';
  if (i.adminCheck === 'pending') return 'loading';
  if (i.adminCheck === 'error') return 'error';
  return i.adminCheck === 'yes' ? 'ready' : 'forbidden';
}

export const ADMIN_TABS = ['publish', 'reports', 'connect', 'deletion', 'aiJobs', 'questions', 'metrics', 'loginLink'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

/** Tabs are rendered (and their data queried) only once the server confirmed is_admin(). */
export function visibleAdminTabs(access: AdminAccess): AdminTab[] {
  return access === 'ready' ? [...ADMIN_TABS] : [];
}

export function parseAdminTab(v: string | null | undefined): AdminTab {
  return (ADMIN_TABS as readonly string[]).includes(v ?? '') ? (v as AdminTab) : 'publish';
}

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const CONNECT_STATUSES = ['new', 'forwarded', 'closed'] as const;
export type ConnectStatus = (typeof CONNECT_STATUSES)[number];
/** B12: open = tiếp nhận, processing = đang xử lý, done / rejected = hoàn tất (DB check since 20261022000400). */
export const DELETION_STATUSES = ['open', 'processing', 'done', 'rejected'] as const;
export type DeletionStatus = (typeof DELETION_STATUSES)[number];
/** Deletion statuses that are not finished yet (no resolved_at / resolved_by). */
export const DELETION_UNRESOLVED: readonly DeletionStatus[] = ['open', 'processing'];

const REPORT_NEXT: Record<ReportStatus, ReportStatus[]> = { open: ['resolved', 'dismissed'], resolved: ['open'], dismissed: ['open'] };
const CONNECT_NEXT: Record<ConnectStatus, ConnectStatus[]> = { new: ['forwarded', 'closed'], forwarded: ['closed'], closed: ['new'] };
// B12: story / family requests reach 'done' only through the erase action (admin-erase); an erased request is
// never reopened (a file retry calls admin-erase again). Account deletion is manual, so it may be marked done.
const ERASED_NEXT: Record<DeletionStatus, DeletionStatus[]> = { open: ['processing', 'rejected'], processing: ['rejected'], done: [], rejected: ['open'] };
const MANUAL_NEXT: Record<DeletionStatus, DeletionStatus[]> = {
  open: ['processing', 'rejected'],
  processing: ['done', 'rejected'],
  done: ['processing'],
  rejected: ['open'],
};

function next<S extends string>(table: Record<S, S[]>, current: string): S[] {
  return (table as Record<string, S[]>)[current] ?? [];
}

export const nextReportStatuses = (s: string) => next(REPORT_NEXT, s);
export const nextConnectStatuses = (s: string) => next(CONNECT_NEXT, s);
export const nextDeletionStatuses = (s: string, scope: DeletionScope) => next(scope === 'account' ? MANUAL_NEXT : ERASED_NEXT, s);

/** Columns to write when a resolvable row changes status (reopening clears the resolution). */
export function resolutionPatch<S extends string>(status: S, openStatus: string | readonly string[], userId: string | null, now = new Date()) {
  const reopened = typeof openStatus === 'string' ? status === openStatus : openStatus.includes(status);
  return { status, resolved_at: reopened ? null : now.toISOString(), resolved_by: reopened ? null : userId };
}

export const AI_ERROR_CODES = ['quota_exceeded', 'ai_unavailable', 'audio_too_large', 'forbidden', 'not_found', 'bad_request', 'internal', 'unauthorized'] as const;
export type AiJobErrorCode = (typeof AI_ERROR_CODES)[number] | 'unknown';

/** ai-process stops re-running a job after this many quota-consuming attempts (MAX_JOB_ATTEMPTS). */
export const AI_MAX_ATTEMPTS = 10;
export const aiRetryCapped = (attempts: number) => attempts >= AI_MAX_ATTEMPTS;

/** ai_jobs.error is "code" or "code: detail". */
export function parseAiError(error: string | null | undefined): { code: AiJobErrorCode; detail: string | null } {
  const raw = (error ?? '').trim();
  const m = /^([a-z_]+)\s*(?::\s*(.*))?$/s.exec(raw);
  const code = m?.[1] && (AI_ERROR_CODES as readonly string[]).includes(m[1]) ? (m[1] as AiJobErrorCode) : 'unknown';
  const detail = code === 'unknown' ? raw || null : m?.[2]?.trim() || null;
  return { code, detail };
}

/** Map an RPC error message to a known review error code. */
export const REVIEW_ERROR_CODES = ['request_not_pending', 'story_not_approved', 'forbidden', 'not_found', 'not_authenticated'] as const;
export type ReviewErrorCode = (typeof REVIEW_ERROR_CODES)[number] | 'unknown';
export function reviewErrorCode(message: string | null | undefined): ReviewErrorCode {
  const m = (message ?? '').trim();
  return (REVIEW_ERROR_CODES as readonly string[]).includes(m) ? (m as ReviewErrorCode) : 'unknown';
}

export type DeletionScope = 'story' | 'family' | 'account';

/** deletion_requests.scope (fixed at insert by the DB); older rows / stale types fall back to the same rule. */
export function deletionScope(row: { scope?: string | null; story_id: string | null; reason: string | null }): DeletionScope {
  if (row.scope === 'story' || row.scope === 'family' || row.scope === 'account') return row.scope;
  if (row.story_id) return 'story';
  return (row.reason ?? '').startsWith('[account]') ? 'account' : 'family';
}
