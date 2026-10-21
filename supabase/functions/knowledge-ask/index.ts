// Network wiring only; the logic lives in handler.ts. verify_jwt = false (supabase/config.toml): anonymous visitors
// call `ask` with the publishable key; `reindex` checks for an admin session itself.
import { fail } from '../_shared/http.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { createBreaker } from '../ai-process/lib/breaker.ts';
import { DEFAULT_DAILY_CAP, handle, type KnowledgeDeps, RATE_LIMIT_PER_MIN } from './handler.ts';
import { createKnowledgeAi } from './lib/ai.ts';
import { checkAdmin, createKnowledgeDb, type KnowledgeDb } from './lib/db.ts';
import { createDailyCap, createRateLimiter } from './lib/limits.ts';

const intEnv = (k: string, fallback: number) => {
  const n = Number(Deno.env.get(k) ?? '');
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// One of each per isolate (in memory).
const breaker = createBreaker({ failureThreshold: 5, windowMs: 60_000, openMs: 60_000, now: Date.now });
const limiter = createRateLimiter({ limit: intEnv('KNOWLEDGE_RATE_PER_MIN', RATE_LIMIT_PER_MIN), windowMs: 60_000, now: Date.now });
const dailyCap = createDailyCap({ cap: intEnv('KNOWLEDGE_DAILY_CAP', DEFAULT_DAILY_CAP), now: Date.now });

let db: KnowledgeDb | null = null;

const deps: KnowledgeDeps = {
  env: (k) => Deno.env.get(k),
  now: Date.now,
  db: () => (db ??= createKnowledgeDb(createAdminClient())),
  checkAdmin: (jwt) => checkAdmin(createUserClient(jwt), jwt),
  ai: (cfg) =>
    createKnowledgeAi(cfg, {
      fetch: (input, init) => fetch(input, init),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      random: Math.random,
      breaker,
    }),
  limiter,
  dailyCap,
};

Deno.serve(async (req) => {
  try {
    return await handle(req, deps);
  } catch {
    return fail('internal');
  }
});
