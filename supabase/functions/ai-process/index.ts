// Network wiring only; the pipeline lives in handler.ts (spec 1 §8).
import { fail } from '../_shared/http.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { handle, type HandlerDeps } from './handler.ts';
import { createBreaker } from './lib/breaker.ts';
import { type AdminDb, createAdminDb, createUserDb } from './lib/db.ts';
import { createGemini } from './lib/gemini.ts';

// One breaker per isolate (in memory, spec 1 §3: 5 failures / 60 s).
const breaker = createBreaker({ failureThreshold: 5, windowMs: 60_000, openMs: 60_000, now: Date.now });

let admin: AdminDb | null = null;

const deps: HandlerDeps = {
  env: (k) => Deno.env.get(k),
  now: Date.now,
  userClient: (jwt) => createUserDb(createUserClient(jwt), jwt),
  adminClient: () => (admin ??= createAdminDb(createAdminClient())),
  gemini: (cfg) =>
    createGemini(cfg, {
      fetch: (input, init) => fetch(input, init),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      random: Math.random,
      breaker,
    }),
};

Deno.serve(async (req) => {
  try {
    return await handle(req, deps);
  } catch {
    return fail('internal');
  }
});
