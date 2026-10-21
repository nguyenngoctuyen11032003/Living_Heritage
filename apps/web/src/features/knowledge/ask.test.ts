import { describe, expect, it, vi } from 'vitest';
import { askElders, AskError, askErrorFrom, askOutcome, isValidQuestion, normalizeQuestion, splitCitations } from './ask';

const CONFIG = { url: 'https://demo.supabase.co/', key: 'sb_publishable_test', configured: true };

const okBody = {
  answer: 'Tuốt lá vào rằm tháng Chạp [1].',
  cited: [1],
  sources: [{ id: 'a1', title: 'Tuốt lá mai', kind: 'experience', narrator_label: 'Ông Tư', topic_slug: 'lam-vuon', similarity: 0.8 }],
  reason: null,
};

function fakeFetch(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe('askElders', () => {
  it('POSTs the normalized question with the publishable key and parses the answer', async () => {
    const f = fakeFetch(200, okBody);
    const r = await askElders('  Ông bà   chăm mai thế nào? ', 'vi', { fetchImpl: f as unknown as typeof fetch, config: CONFIG });
    expect(r.answer).toBe(okBody.answer);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe('https://demo.supabase.co/functions/v1/knowledge-ask');
    const headers = init!.headers as Record<string, string>;
    expect(headers.apikey).toBe('sb_publishable_test');
    expect(headers.authorization).toBe('Bearer sb_publishable_test');
    expect(JSON.parse(String(init!.body))).toEqual({ action: 'ask', question: 'Ông bà chăm mai thế nào?', lang: 'vi' });
  });

  it('maps errors: rate limit (with retry), global cap, unavailable, network, not configured, invalid', async () => {
    const call = (status: number, body: unknown) => askElders('Kho cá thế nào?', 'vi', { fetchImpl: fakeFetch(status, body) as unknown as typeof fetch, config: CONFIG });
    await expect(call(429, { error: 'quota_exceeded', scope: 'ip', retry_after_s: 42 })).rejects.toMatchObject({ kind: 'rate_limited', retryAfterS: 42 });
    await expect(call(429, { error: 'quota_exceeded', scope: 'global' })).rejects.toMatchObject({ kind: 'busy' });
    await expect(call(503, { error: 'ai_unavailable' })).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(call(200, { nope: 1 })).rejects.toMatchObject({ kind: 'unavailable' });
    const broken = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(askElders('Kho cá thế nào?', 'vi', { fetchImpl: broken as unknown as typeof fetch, config: CONFIG })).rejects.toMatchObject({ kind: 'network' });
    await expect(askElders('Kho cá?', 'vi', { config: { ...CONFIG, configured: false } })).rejects.toMatchObject({ kind: 'not_configured' });
    await expect(askElders('ab', 'vi', { config: CONFIG })).rejects.toBeInstanceOf(AskError);
  });
});

describe('helpers', () => {
  it('validates the normalized length', () => {
    expect(normalizeQuestion('  a \n b ')).toBe('a b');
    expect(isValidQuestion('  ab ')).toBe(false);
    expect(isValidQuestion('abc')).toBe(true);
    expect(isValidQuestion('x'.repeat(301))).toBe(false);
  });

  it('askErrorFrom falls back on the HTTP status', () => {
    expect(askErrorFrom(429, null).kind).toBe('rate_limited');
    expect(askErrorFrom(400, null).kind).toBe('invalid');
    expect(askErrorFrom(500, null).kind).toBe('unavailable');
  });

  it('splitCitations keeps only markers that point at a source', () => {
    expect(splitCitations('A [1]. B [3] C [2][1].', 2)).toEqual(['A ', 1, '. B [3] C ', 2, 1, '.']);
    expect(splitCitations('Không có.', 2)).toEqual(['Không có.']);
  });
});

describe('askOutcome', () => {
  const src = okBody.sources as never;
  it('shows an answer only when it cites a returned source', () => {
    expect(askOutcome({ answer: 'A [1].', cited: [1], sources: src, reason: null })).toBe('answer');
    expect(askOutcome({ answer: 'A.', cited: [], sources: src, reason: null })).toBe('not_in_sources');
    expect(askOutcome({ answer: 'A [3].', cited: [3], sources: src, reason: null })).toBe('not_in_sources');
    expect(askOutcome({ answer: '  ', cited: [1], sources: src, reason: null })).toBe('not_in_sources');
    expect(askOutcome({ answer: null, cited: [], sources: src, reason: 'not_in_sources' })).toBe('not_in_sources');
  });
  it('says clearly when there is nothing to cite', () => {
    expect(askOutcome({ answer: null, cited: [], sources: [], reason: 'no_sources' })).toBe('no_sources');
    expect(askOutcome({ answer: 'Made up.', cited: [1], sources: [], reason: null })).toBe('no_sources');
  });
});
