import { describe, expect, it } from 'vitest';
import { confirmMatches, eraseErrorCode, isMissingFunction, parseEraseResult, tableRows, takedownReasonValid, toTable } from './adminApi';

describe('admin-erase result', () => {
  it('complete when every file was erased', () => {
    expect(parseEraseResult({ request_id: 'r', db_done: true, removed: 3, failed: 0, skipped: 0, storage_complete: true })).toEqual({
      removed: 3,
      failed: 0,
      skipped: 0,
      outcome: 'complete',
    });
  });

  it('asks for a retry when files failed (even if some were skipped) and a manual check when only skipped', () => {
    expect(parseEraseResult({ db_done: true, removed: 1, failed: 2, skipped: 1 })?.outcome).toBe('retry');
    expect(parseEraseResult({ db_done: true, removed: 1, failed: 0, skipped: 1 })?.outcome).toBe('review');
  });

  it('rejects bodies that are not a finished DB step', () => {
    expect(parseEraseResult(null)).toBeNull();
    expect(parseEraseResult({ db_done: false })).toBeNull();
    expect(parseEraseResult({ error: 'forbidden' })).toBeNull();
  });

  it('maps error payloads to known codes', () => {
    expect(eraseErrorCode({ error: 'forbidden', message: 'x' })).toBe('forbidden');
    expect(eraseErrorCode({ error: 'not_found' })).toBe('not_found');
    expect(eraseErrorCode({ error: 'weird' })).toBe('internal');
    expect(eraseErrorCode(null)).toBe('internal');
  });
});

describe('typed confirmation', () => {
  it('accepts the word regardless of case, spaces and Unicode composition', () => {
    expect(confirmMatches(' xóa ', 'XÓA')).toBe(true);
    expect(confirmMatches('XÓA', 'XÓA')).toBe(true); // decomposed ó
    expect(confirmMatches('delete', 'DELETE')).toBe(true);
  });
  it('rejects anything else', () => {
    expect(confirmMatches('XOA', 'XÓA')).toBe(false);
    expect(confirmMatches('', 'XÓA')).toBe(false);
    expect(confirmMatches('', '')).toBe(false);
  });
});

describe('takedown reason', () => {
  it('is mandatory and bounded', () => {
    expect(takedownReasonValid('  ')).toBe(false);
    expect(takedownReasonValid('Sai sự thật')).toBe(true);
    expect(takedownReasonValid('x'.repeat(500))).toBe(true);
    expect(takedownReasonValid('x'.repeat(501))).toBe(false);
  });
});

describe('aggregate RPC tables', () => {
  it('flattens rows, one object or nothing', () => {
    // pilot_summary() rows (migration 20261022000600); counts is jsonb {event_code: n}.
    expect(
      toTable([
        { participant_code: 'P01', event_count: 3, counts: { topic_start: 1, approve: 1, help_opened: 1 }, completed: true, help_opened: 1 },
        { participant_code: 'P02', event_count: 1, counts: { topic_start: 1 }, completed: false, help_opened: 0, extra: [1, 2] },
      ]),
    ).toEqual({
      columns: ['participant_code', 'event_count', 'counts', 'completed', 'help_opened', 'extra'],
      rows: [
        ['P01', 3, 'topic_start: 1; approve: 1; help_opened: 1', true, 1, null],
        ['P02', 1, 'topic_start: 1', false, 0, '[1,2]'],
      ],
    });
    // content_counts() returns one row.
    expect(toTable([{ approved_sources: 4, approved_items: 6, public_items: 2, drafts: 1 }]).rows).toEqual([[4, 6, 2, 1]]);
    expect(toTable({ stories: 4 })).toEqual({ columns: ['stories'], rows: [[4]] });
    expect(toTable(null)).toEqual({ columns: [], rows: [] });
  });

  it('treats a function that is not deployed as unavailable', () => {
    expect(isMissingFunction({ code: 'PGRST202', message: 'Could not find the function public.pilot_summary' })).toBe(true);
    expect(isMissingFunction({ code: '42501', message: 'forbidden' })).toBe(false);
    expect(isMissingFunction(null)).toBe(false);
  });
});

describe('tableRows', () => {
  it('puts the header first and blanks nulls', () => {
    expect(tableRows({ columns: ['code', 'done', 'help'], rows: [['P01', 2, null], ['P02', 0, true]] })).toEqual([
      ['code', 'done', 'help'],
      ['P01', 2, ''],
      ['P02', 0, 'true'],
    ]);
  });
});
