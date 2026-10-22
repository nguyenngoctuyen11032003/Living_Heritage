import { describe, expect, it, vi } from 'vitest';
import type { Supabase } from '@/lib/supabase';
import { saveDraftWithTopic } from './data';
import { reviewErrorKey } from './errors';

const args = { p_title: 't', p_summary: '', p_body: 'b', p_fields: {} };

function fakeSb(opts: { rpc?: { data: unknown; error: { message: string } | null }; update?: { data: unknown; error: { message: string } | null } }) {
  const rpc = vi.fn().mockResolvedValue(opts.rpc ?? { data: 3, error: null });
  const eq = vi.fn(() => ({ select: vi.fn().mockResolvedValue(opts.update ?? { data: [{ id: 's' }], error: null }) }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { sb: { rpc, from } as unknown as Supabase, rpc, from, update, eq };
}

describe('saveDraftWithTopic', () => {
  it('skips the topic write when unchanged', async () => {
    const f = fakeSb({});
    await expect(saveDraftWithTopic(f.sb, 's', args, false, undefined)).resolves.toBe(3);
    expect(f.from).not.toHaveBeenCalled();
  });

  it('saves the draft first, then updates topic_id (null clears)', async () => {
    const f = fakeSb({});
    await expect(saveDraftWithTopic(f.sb, 's', args, false, null)).resolves.toBe(3);
    expect(f.rpc).toHaveBeenCalledWith('save_story_draft', { p_story: 's', ...args });
    expect(f.update).toHaveBeenCalledWith({ topic_id: null });
    expect(f.eq).toHaveBeenCalledWith('id', 's');
  });

  it('does not touch the topic when the draft save fails', async () => {
    const f = fakeSb({ rpc: { data: null, error: { message: 'forbidden' } } });
    await expect(saveDraftWithTopic(f.sb, 's', args, false, 't1')).rejects.toSatisfy((e) => reviewErrorKey(e) === 'forbidden');
    expect(f.from).not.toHaveBeenCalled();
  });

  it('reports topic_failed on an error or when no row was updated', async () => {
    const a = fakeSb({ update: { data: null, error: { message: 'x' } } });
    await expect(saveDraftWithTopic(a.sb, 's', args, false, 't1')).rejects.toSatisfy((e) => reviewErrorKey(e) === 'topic_failed');
    const b = fakeSb({ update: { data: [], error: null } });
    await expect(saveDraftWithTopic(b.sb, 's', args, false, 't1')).rejects.toSatisfy((e) => reviewErrorKey(e) === 'topic_failed');
  });
});
