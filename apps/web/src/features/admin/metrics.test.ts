import { describe, expect, it } from 'vitest';
import { metricsRows, summarizeUsage, toCsv, windowStart, type MetricsSnapshot } from './metrics';

describe('summarizeUsage', () => {
  it('groups by action, counts failures and takes the median latency', () => {
    const out = summarizeUsage([
      { action: 'draft', status: 'ok', latency_ms: 300, input_bytes: 10 },
      { action: 'transcribe', status: 'ok', latency_ms: 100, input_bytes: 1000 },
      { action: 'transcribe', status: 'timeout', latency_ms: 900, input_bytes: 2000 },
      { action: 'transcribe', status: 'ok', latency_ms: 200, input_bytes: 500 },
      { action: 'draft', status: 'invalid_output', latency_ms: 500, input_bytes: 20 },
    ]);
    expect(out).toEqual([
      { action: 'transcribe', calls: 3, ok: 2, failed: 1, medianMs: 200, inputBytes: 3500 },
      { action: 'draft', calls: 2, ok: 1, failed: 1, medianMs: 400, inputBytes: 30 },
    ]);
  });

  it('returns nothing for no rows', () => {
    expect(summarizeUsage([])).toEqual([]);
  });
});

describe('toCsv', () => {
  it('quotes cells with commas, quotes or newlines and adds a BOM + CRLF', () => {
    expect(toCsv([['a', 'b,c'], ['say "hi"', 2]])).toBe('﻿a,"b,c"\r\n"say ""hi""",2\r\n');
  });
});

describe('windowStart', () => {
  it('goes back the given number of days', () => {
    expect(windowStart(new Date('2026-10-31T00:00:00Z'), 30)).toBe('2026-10-01T00:00:00.000Z');
  });
});

describe('metricsRows', () => {
  it('exports aggregate counts only, with a header row', () => {
    const m: MetricsSnapshot = {
      jobs: { queued: 1, transcribing: 0, drafting: 0, done: 5, error: 2 },
      publish: { pending: 3, approved: 4, rejected: 1, withdrawn: 0 },
      usage: [{ action: 'draft', calls: 2, ok: 1, failed: 1, medianMs: 400, inputBytes: 30 }],
    };
    const rows = metricsRows(m);
    expect(rows[0]).toEqual(['section', 'metric', 'value']);
    expect(rows).toContainEqual(['ai_jobs', 'error', 2]);
    expect(rows).toContainEqual(['publish_requests', 'approved', 4]);
    expect(rows).toContainEqual(['ai_usage_30d', 'draft.median_ms', 400]);
    expect(rows).toHaveLength(1 + 5 + 4 + 4);
  });
});
