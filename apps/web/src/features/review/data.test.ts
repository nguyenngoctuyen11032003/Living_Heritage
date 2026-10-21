import { describe, expect, it, vi } from 'vitest';
import type { Supabase } from '@/lib/supabase';
import { approve, approveArgs, currentVersion, isJobRunning, isJobStale, jobFromResponse, saveDraft, saveDraftArgs, saveTranscript, STALE_JOB_MS } from './data';

/** Minimal chainable fake: rpc resolves to `rpc`; insert().select().single() resolves to `insert`. */
function fakeSb(opts: { row?: unknown; rpc?: { data: unknown; error: unknown }; insert?: { data: unknown; error: unknown } }) {
  const rpc = vi.fn(async () => opts.rpc ?? { data: 7, error: null });
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: opts.row ?? null, error: null }), insert: () => ({ select: () => ({ single: async () => opts.insert ?? { data: null, error: null } }) }) };
  const sb = { from: vi.fn(() => chain), rpc, functions: { invoke: vi.fn(async () => ({})) } };
  return { sb: sb as unknown as Supabase, rpc };
}

const args = { p_title: 'T', p_summary: '', p_body: 'B', p_fields: {}, p_topic_id: null };

describe('optimistic concurrency (server-atomic p_expected_version)', () => {
  it('sends the version on screen with every save and approval', async () => {
    const { sb, rpc } = fakeSb({ rpc: { data: 4, error: null } });
    await expect(saveDraft(sb, 's1', args, false, 3)).resolves.toBe(4);
    expect(rpc).toHaveBeenLastCalledWith('save_story_draft', { p_story: 's1', p_title: 'T', p_summary: '', p_body: 'B', p_fields: {}, p_expected_version: 3 });
    await approve(sb, 's1', null, 3);
    expect(rpc).toHaveBeenLastCalledWith('approve_story', { p_story: 's1', p_assisted_consent: false, p_expected_version: 3 });
  });

  it('maps the server stale_version error to a conflict', async () => {
    const { sb } = fakeSb({ rpc: { data: null, error: { message: 'stale_version' } } });
    await expect(saveDraft(sb, 's1', args, false, 3)).rejects.toMatchObject({ code: 'stale_version' });
    await expect(approve(sb, 's1', null, 3)).rejects.toMatchObject({ code: 'stale_version' });
  });

  it('sends p_topic_id only when the topic changed', () => {
    expect(saveDraftArgs('s', { ...args, p_topic_id: 't2' }, 1)).toMatchObject({ p_topic_id: 't2' });
    expect(saveDraftArgs('s', args, 1)).not.toHaveProperty('p_topic_id');
  });
});

describe('currentVersion', () => {
  it('reads the newest version so "keep my version" can save over it deliberately', async () => {
    await expect(currentVersion(fakeSb({ row: { current_version: 9 } }).sb, 's1')).resolves.toBe(9);
    await expect(currentVersion(fakeSb({ row: null }).sb, 's1')).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('approveArgs', () => {
  it('sends the consent method and trimmed helper relation only on the assisted path', () => {
    expect(approveArgs('s', null, 2)).toEqual({ p_story: 's', p_assisted_consent: false, p_expected_version: 2 });
    expect(approveArgs('s', { method: 'assisted_video', relation: ' cháu nội ' }, 2)).toEqual({ p_story: 's', p_assisted_consent: true, p_consent_method: 'assisted_video', p_helper_relation: 'cháu nội', p_expected_version: 2 });
  });
});

describe('saveTranscript', () => {
  it('inserts the next version and keeps the original', async () => {
    const row = { id: 't2', version: 2, text: 'sửa', created_at: '2026-10-21T00:00:00Z' };
    const { sb } = fakeSb({ insert: { data: row, error: null } });
    await expect(saveTranscript(sb, 'r1', 1, 'sửa')).resolves.toEqual(row);
  });

  it('maps a unique violation (someone saved that version first) to stale_version', async () => {
    const { sb } = fakeSb({ insert: { data: null, error: { code: '23505', message: 'duplicate key' } } });
    await expect(saveTranscript(sb, 'r1', 1, 'x')).rejects.toMatchObject({ code: 'stale_version' });
  });
});

describe('job state', () => {
  const now = Date.parse('2026-10-21T10:00:00Z');
  const at = (ms: number) => new Date(now - ms).toISOString();

  it('treats an in-progress job untouched past the server stale limit as stale (retry offered)', () => {
    expect(isJobStale({ status: 'transcribing', updated_at: at(STALE_JOB_MS + 1) }, now)).toBe(true);
    expect(isJobRunning({ status: 'transcribing', updated_at: at(STALE_JOB_MS + 1) }, now)).toBe(false);
    expect(isJobRunning({ status: 'drafting', updated_at: at(60_000) }, now)).toBe(true);
    expect(isJobStale({ status: 'error', updated_at: at(STALE_JOB_MS * 2) }, now)).toBe(false);
    expect(isJobRunning(null, now)).toBe(false);
  });

  it('follows the job returned by a retry', () => {
    expect(jobFromResponse({ job_id: 'j', status: 'transcribing', story_ids: [], error: null }, 'T')).toEqual({ id: 'j', status: 'transcribing', story_ids: [], error: null, updated_at: 'T' });
  });
});
