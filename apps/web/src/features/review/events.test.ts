import { beforeEach, describe, expect, it, vi } from 'vitest';

const track = vi.fn();
vi.mock('@/lib/events', () => ({ track: (code: string) => track(code) }));

const { isJustFinished, resetDraftCreatedSeen, trackDraftCreated } = await import('./events');

describe('trackDraftCreated', () => {
  beforeEach(() => {
    track.mockClear();
    resetDraftCreatedSeen();
  });

  it('fires once per story in a session, whatever re-renders or polls repeat it', () => {
    trackDraftCreated(['s1', 's2']);
    trackDraftCreated(['s1']);
    trackDraftCreated(['s1', 's2']);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('draft_created');
    trackDraftCreated(['s3']);
    expect(track).toHaveBeenCalledTimes(2);
  });

  it('ignores a job with no drafts', () => {
    trackDraftCreated([]);
    expect(track).not.toHaveBeenCalled();
  });
});

describe('isJustFinished', () => {
  const now = Date.parse('2026-10-21T10:00:00Z');
  it('counts only jobs finished in the last 10 minutes', () => {
    expect(isJustFinished('2026-10-21T09:55:00Z', now)).toBe(true);
    expect(isJustFinished('2026-10-21T09:40:00Z', now)).toBe(false);
    expect(isJustFinished('garbage', now)).toBe(false);
  });
});
