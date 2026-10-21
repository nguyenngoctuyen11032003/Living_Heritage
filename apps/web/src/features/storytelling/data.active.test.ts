import { describe, expect, it } from 'vitest';
import type { Supabase } from '@/lib/supabase';
import { fetchAllQuestions, fetchQuestions, fetchTopics } from './data';

/** Records the filters of one query chain and resolves with no rows. */
function fakeSb() {
  const eqs: [string, unknown][] = [];
  const chain = {
    select: () => chain,
    eq: (col: string, v: unknown) => {
      eqs.push([col, v]);
      return chain;
    },
    order: async () => ({ data: [], error: null }),
  };
  return { sb: { from: () => chain } as unknown as Supabase, eqs };
}

describe('storytelling reads only active topics and questions', () => {
  it('filters questions (per topic and all) on active', async () => {
    const a = fakeSb();
    await fetchQuestions(a.sb, 't1');
    expect(a.eqs).toContainEqual(['active', true]);
    const b = fakeSb();
    await fetchAllQuestions(b.sb);
    expect(b.eqs).toEqual([['active', true]]);
  });

  it('filters topics on active unless an open session needs its (possibly disabled) topic name', async () => {
    const a = fakeSb();
    await fetchTopics(a.sb);
    expect(a.eqs).toEqual([['active', true]]);
    const b = fakeSb();
    await fetchTopics(b.sb, { activeOnly: false });
    expect(b.eqs).toEqual([]);
  });
});
