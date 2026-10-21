import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Supabase } from '@/lib/supabase';
import type { NarratorInfo } from './data';
import { startSession } from './startSession';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/events', () => ({ track }));
vi.mock('./data', () => ({
  fetchTopics: vi.fn(async () => [{ id: 't1', slug: 'tuoi-tho' }]),
  fetchAllQuestions: vi.fn(async () => [
    { id: 'q1', topic_id: 't1', sort: 1 },
    { id: 'qx', topic_id: 't-disabled', sort: 0 },
  ]),
  createSession: vi.fn(async () => 'sess-1'),
}));

const sb = {} as Supabase;
const narrator = { id: 'n1', family_id: 'f1' } as NarratorInfo;

describe('startSession', () => {
  it('"Chưa biết kể gì" never picks a question of a disabled topic', async () => {
    for (let i = 0; i < 5; i++) expect(await startSession(sb, narrator, 'goi-y')).toMatchObject({ questionId: 'q1' });
  });

  beforeEach(() => track.mockClear());

  it('counts topic_start once per opened session', async () => {
    expect(await startSession(sb, narrator, 'tuoi-tho')).toEqual({ sessionId: 'sess-1', questionId: null });
    expect(await startSession(sb, narrator, 'goi-y')).toEqual({ sessionId: 'sess-1', questionId: 'q1' });
    expect(track.mock.calls).toEqual([['topic_start'], ['topic_start']]);
  });

  it('does not count an unknown topic', async () => {
    expect(await startSession(sb, narrator, 'khong-co')).toBe('not-found');
    expect(track).not.toHaveBeenCalled();
  });
});
