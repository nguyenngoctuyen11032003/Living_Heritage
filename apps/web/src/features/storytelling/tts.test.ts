import { describe, expect, it, vi } from 'vitest';
import { createAudioCache, decideVoice, fallbackAfterFailure, fetchQuestionAudio, serverAccepts, TtsError, voiceKey, type TtsTransport } from './tts';

function urls() {
  let n = 0;
  const revoked: string[] = [];
  return {
    revoked,
    create: () => `blob:${++n}`,
    revoke: (u: string) => {
      revoked.push(u);
    },
  };
}

describe('decideVoice', () => {
  it('prefers the server voice, then the browser voice, then none', () => {
    expect(decideVoice({ serverPossible: true, serverDisabled: false, speechSupported: true })).toBe('server');
    expect(decideVoice({ serverPossible: true, serverDisabled: false, speechSupported: false })).toBe('server');
    expect(decideVoice({ serverPossible: true, serverDisabled: true, speechSupported: true })).toBe('browser');
    expect(decideVoice({ serverPossible: false, serverDisabled: false, speechSupported: true })).toBe('browser');
    expect(decideVoice({ serverPossible: false, serverDisabled: false, speechSupported: false })).toBe('none');
  });

  it('falls back to the browser after a server failure when it can speak', () => {
    expect(fallbackAfterFailure(true)).toBe('browser');
    expect(fallbackAfterFailure(false)).toBe('none');
  });

  it('only sends texts the server accepts', () => {
    expect(serverAccepts('Bà nhớ gì?')).toBe(true);
    expect(serverAccepts('   ')).toBe(false);
    expect(serverAccepts('x'.repeat(401))).toBe(false);
    expect(voiceKey('vi', '  a   b ')).toBe('vi|a b');
  });
});

describe('createAudioCache', () => {
  it('fetches each question once, shares in-flight requests and revokes on clear', async () => {
    const u = urls();
    const cache = createAudioCache(u);
    const fetchBlob = vi.fn(() => Promise.resolve(new Blob(['x'])));
    const [a, b] = await Promise.all([cache.load('k', fetchBlob), cache.load('k', fetchBlob)]);
    expect(a).toBe('blob:1');
    expect(b).toBe('blob:1');
    expect(await cache.load('k', fetchBlob)).toBe('blob:1');
    expect(fetchBlob).toHaveBeenCalledTimes(1);
    expect(cache.get('k')).toBe('blob:1');
    cache.clear();
    expect(u.revoked).toEqual(['blob:1']);
    expect(cache.get('k')).toBeUndefined();
  });

  it('does not keep a failed fetch, and revokes a result that arrives after clear()', async () => {
    const u = urls();
    const cache = createAudioCache(u);
    await expect(cache.load('k', () => Promise.reject(new TtsError('ai_unavailable')))).rejects.toThrow();
    expect(cache.get('k')).toBeUndefined();
    let resolve: (b: Blob) => void = () => {};
    const late = cache.load(
      'late',
      () =>
        new Promise<Blob>((r) => {
          resolve = r;
        }),
    );
    cache.clear();
    resolve(new Blob(['x']));
    await expect(late).rejects.toThrow();
    expect(u.revoked).toEqual(['blob:1']);
  });

  it('gives up the server voice for the session on sticky errors or repeated transient ones', () => {
    const sticky = createAudioCache(urls());
    sticky.recordFailure('quota_exceeded');
    expect(sticky.serverDisabled).toBe(true);

    const flaky = createAudioCache(urls());
    flaky.recordFailure('network');
    expect(flaky.serverDisabled).toBe(false);
    flaky.recordFailure('ai_unavailable');
    expect(flaky.serverDisabled).toBe(true);
  });
});

describe('fetchQuestionAudio', () => {
  const transport = (res: Response | Error, token: string | null = 'tok') => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => (res instanceof Error ? Promise.reject(res) : Promise.resolve(res)));
    const tr: TtsTransport = { url: 'https://x.supabase.co/', apiKey: 'pk', getToken: () => Promise.resolve(token), fetch: fetchImpl as unknown as typeof fetch };
    return { tr, fetchImpl };
  };

  it('posts text + lang with the session token and returns the audio blob', async () => {
    const { tr, fetchImpl } = transport(new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/wav' } }));
    const blob = await fetchQuestionAudio('Câu hỏi?', 'vi', tr);
    expect(blob.size).toBe(2);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://x.supabase.co/functions/v1/question-tts');
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'Câu hỏi?', lang: 'vi' });
  });

  it('maps failures to codes', async () => {
    await expect(fetchQuestionAudio('q', 'vi', transport(new Response('', { status: 200 }), null).tr)).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(fetchQuestionAudio('q', 'vi', transport(new Error('offline')).tr)).rejects.toMatchObject({ code: 'network' });
    const quota = new Response(JSON.stringify({ error: 'quota_exceeded' }), { status: 429, headers: { 'content-type': 'application/json' } });
    await expect(fetchQuestionAudio('q', 'vi', transport(quota).tr)).rejects.toMatchObject({ code: 'quota_exceeded' });
    await expect(fetchQuestionAudio('q', 'vi', transport(new Response('oops', { status: 502 })).tr)).rejects.toMatchObject({ code: 'ai_unavailable' });
    const json = new Response('{}', { headers: { 'content-type': 'application/json' } });
    await expect(fetchQuestionAudio('q', 'vi', transport(json).tr)).rejects.toMatchObject({ code: 'not_audio' });
  });
});
