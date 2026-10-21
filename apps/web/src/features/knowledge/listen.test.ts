import { describe, expect, it, vi } from 'vitest';
import type { Supabase } from '@/lib/supabase';
import { loadListen } from './listen';

const STORY = '11111111-2222-4333-8444-555555555555';

/** Minimal fake of the supabase query builder: from(table).select().eq().maybeSingle(). */
function fakeSb(tables: Record<string, unknown>, signed: { signedUrl: string } | null = { signedUrl: 'https://x/signed' }) {
  const createSignedUrl = vi.fn(async () => ({ data: signed, error: signed ? null : { message: 'nope' } }));
  const sb = {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: tables[table] ?? null, error: null }) }) }),
    }),
    storage: { from: () => ({ createSignedUrl }) },
  };
  return { sb: sb as unknown as Supabase, createSignedUrl };
}

describe('loadListen (QR page)', () => {
  it('is forbidden for invalid ids without querying', async () => {
    const { sb } = fakeSb({ stories: { title: 'Bí mật' } });
    expect(await loadListen(sb, 'not-a-uuid')).toEqual({ status: 'forbidden' });
  });

  it('is forbidden, with no title, when RLS hides the story', async () => {
    const { sb, createSignedUrl } = fakeSb({});
    const r = await loadListen(sb, STORY);
    expect(r).toEqual({ status: 'forbidden' });
    expect(JSON.stringify(r)).not.toContain('title');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns title, narrator and a 1-hour signed URL when readable', async () => {
    const { sb, createSignedUrl } = fakeSb({
      stories: { id: STORY, title: 'Cái Tết đầu tiên', narrator_id: 'n1', recording_id: 'r1' },
      narrators: { display_name: 'Bà Ba', pen_name: null },
      recordings: { storage_path: 'f/n/a.webm', duration_s: 58 },
    });
    const r = await loadListen(sb, STORY);
    expect(r).toEqual({ status: 'ready', title: 'Cái Tết đầu tiên', narrator: 'Bà Ba', audioUrl: 'https://x/signed', durationS: 58, audioError: false });
    expect(createSignedUrl).toHaveBeenCalledWith('f/n/a.webm', 3600);
  });

  it('reports a missing recording and signing errors', async () => {
    const noRec = fakeSb({ stories: { id: STORY, title: 'T', narrator_id: 'n1', recording_id: null } });
    expect(await loadListen(noRec.sb, STORY)).toMatchObject({ status: 'ready', audioUrl: null, audioError: false });
    const badSign = fakeSb({ stories: { id: STORY, title: 'T', narrator_id: 'n1', recording_id: 'r1' }, recordings: { storage_path: 'p', duration_s: 3 } }, null);
    expect(await loadListen(badSign.sb, STORY)).toMatchObject({ status: 'ready', audioUrl: null, audioError: true });
  });
});
