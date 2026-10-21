// Network wiring only; the logic lives in handler.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { fail } from '../_shared/http.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { CACHE_MAX_BYTES, CACHE_MAX_ENTRIES, handle, type HandlerDeps } from './handler.ts';
import { createLru } from './lib/lru.ts';
import { createTts } from './lib/tts.ts';

// One cache per isolate: repeated questions cost neither quota nor a Gemini call.
const cache = createLru<Uint8Array<ArrayBuffer>>({ maxEntries: CACHE_MAX_ENTRIES, maxBytes: CACHE_MAX_BYTES, sizeOf: (v) => v.byteLength });

let admin: SupabaseClient | null = null;
const adminClient = () => (admin ??= createAdminClient());

const deps: HandlerDeps = {
  env: (k) => Deno.env.get(k),
  now: Date.now,
  verifyUser: async (jwt) => {
    const { data, error } = await createUserClient(jwt).auth.getUser(jwt);
    return error || !data.user ? null : data.user.id;
  },
  quotaConsume: async (userId, limit) => {
    const { data, error } = await adminClient().rpc('ai_quota_consume_kind', { p_user: userId, p_kind: 'tts', p_limit: limit });
    if (error) throw new Error('quotaConsume failed');
    return data === true;
  },
  quotaRefund: async (userId) => {
    const { error } = await adminClient().rpc('ai_quota_refund_kind', { p_user: userId, p_kind: 'tts' });
    if (error) throw new Error('quotaRefund failed');
  },
  logUsage: async (row) => {
    const { error } = await adminClient().from('ai_usage').insert({ ...row, job_id: null });
    if (error) throw new Error('logUsage failed');
  },
  tts: (cfg) => createTts(cfg, { fetch: (input, init) => fetch(input, init) }),
  cache,
};

Deno.serve(async (req) => {
  try {
    return await handle(req, deps);
  } catch {
    return fail('internal');
  }
});
