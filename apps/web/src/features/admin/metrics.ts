// Pure helpers for the admin "Metrics" tab: content-free aggregates only (counts, bytes, latency).
// No narration, transcript, search text or per-user identifiers ever enter these structures.

export const METRICS_WINDOW_DAYS = 30;
export const JOB_STATUSES = ['queued', 'transcribing', 'drafting', 'done', 'error'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const PUBLISH_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/** One ai_usage row as read by the admin (metadata only). */
export interface UsageInput {
  action: string;
  status: string;
  latency_ms: number;
  input_bytes: number;
}

export interface UsageSummary {
  action: string;
  calls: number;
  ok: number;
  failed: number;
  /** Median latency in ms (0 when there are no calls). */
  medianMs: number;
  inputBytes: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

/** Groups ai_usage rows by action ('ok' is success, any other status is a failure), busiest first. */
export function summarizeUsage(rows: UsageInput[]): UsageSummary[] {
  const groups = new Map<string, UsageInput[]>();
  for (const r of rows) {
    const list = groups.get(r.action);
    if (list) list.push(r);
    else groups.set(r.action, [r]);
  }
  return [...groups.entries()]
    .map(([action, list]) => {
      const ok = list.filter((r) => r.status === 'ok').length;
      return {
        action,
        calls: list.length,
        ok,
        failed: list.length - ok,
        medianMs: median(list.map((r) => Math.max(0, r.latency_ms))),
        inputBytes: list.reduce((n, r) => n + Math.max(0, r.input_bytes), 0),
      };
    })
    .sort((a, b) => b.calls - a.calls || a.action.localeCompare(b.action));
}

/** ISO start of the rolling window (now − days). */
export function windowStart(now: Date, days = METRICS_WINDOW_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV (CRLF, quoted when needed) with a UTF-8 BOM so spreadsheet apps keep Vietnamese diacritics. */
export function toCsv(rows: (string | number)[][]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export interface MetricsSnapshot {
  jobs: Record<JobStatus, number>;
  publish: Record<PublishStatus, number>;
  usage: UsageSummary[];
}

/** Flat section,metric,value rows for export (aggregates only). */
export function metricsRows(m: MetricsSnapshot): (string | number)[][] {
  const out: (string | number)[][] = [['section', 'metric', 'value']];
  for (const s of JOB_STATUSES) out.push(['ai_jobs', s, m.jobs[s]]);
  for (const s of PUBLISH_STATUSES) out.push(['publish_requests', s, m.publish[s]]);
  for (const u of m.usage) {
    out.push([`ai_usage_${METRICS_WINDOW_DAYS}d`, `${u.action}.calls`, u.calls]);
    out.push([`ai_usage_${METRICS_WINDOW_DAYS}d`, `${u.action}.failed`, u.failed]);
    out.push([`ai_usage_${METRICS_WINDOW_DAYS}d`, `${u.action}.median_ms`, u.medianMs]);
    out.push([`ai_usage_${METRICS_WINDOW_DAYS}d`, `${u.action}.input_bytes`, u.inputBytes]);
  }
  return out;
}
