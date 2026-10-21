// Every table / column / RPC name used by knowledge-ask lives here. The handler sees the narrow interfaces below,
// which handler_test.ts fakes. All reads and writes run as service_role: public_items rows are public anyway, the
// embedding columns are writable only by service_role, and match_public_items is not executable by anon.
import type { SupabaseClient } from '@supabase/supabase-js';

export class DbError extends Error {
  constructor(op: string, message: string) {
    super(`db ${op}: ${message}`);
    this.name = 'DbError';
  }
}

/** A public item still waiting for its embedding. */
export interface UnembeddedRow {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  fields: unknown;
  /** Compare-and-set token: the embedding is written only if the row did not change meanwhile. */
  updated_at: string;
}

/** A match_public_items row. */
export interface MatchRow {
  id: string;
  kind: 'story' | 'experience';
  title: string;
  summary: string | null;
  body: string | null;
  fields: unknown;
  topic_slug: string | null;
  narrator_label: string;
  region: string | null;
  decade: number | null;
  similarity: number;
}

export interface KnowledgeDb {
  listUnembedded(limit: number): Promise<UnembeddedRow[]>;
  /** false when the row changed (or was embedded) since it was listed. */
  saveEmbedding(row: UnembeddedRow, vector: number[], nowIso: string): Promise<boolean>;
  countUnembedded(): Promise<number>;
  match(vector: number[], limit: number, minSimilarity: number): Promise<MatchRow[]>;
}

/** 'admin' | 'not_admin' for a valid user JWT; 'invalid' when the token is not a valid session. */
export type AdminCheck = 'admin' | 'not_admin' | 'invalid';

// deno-lint-ignore no-explicit-any
type Client = SupabaseClient<any, any, any>;
type Row = Record<string, unknown>;

function check(op: string, error: { message: string } | null): void {
  if (error) throw new DbError(op, error.message);
}

/** pgvector text form ('[0.1,0.2,…]'), accepted by PostgREST for vector columns and RPC args. */
export const toPgVector = (v: number[]): string => `[${v.join(',')}]`;

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function createKnowledgeDb(admin: Client): KnowledgeDb {
  return {
    async listUnembedded(limit) {
      const { data, error } = await admin
        .from('public_items')
        .select('id, title, summary, body, fields, updated_at')
        .is('embedding', null)
        .order('published_at', { ascending: false })
        .limit(limit);
      check('listUnembedded', error);
      return ((data ?? []) as Row[]).map((r) => ({
        id: String(r.id),
        title: String(r.title ?? ''),
        summary: str(r.summary),
        body: str(r.body),
        fields: r.fields ?? {},
        updated_at: String(r.updated_at ?? ''),
      }));
    },

    async saveEmbedding(row, vector, nowIso) {
      const { data, error } = await admin
        .from('public_items')
        .update({ embedding: toPgVector(vector), embedded_at: nowIso })
        .eq('id', row.id)
        .eq('updated_at', row.updated_at)
        .is('embedding', null)
        .select('id');
      check('saveEmbedding', error);
      return ((data ?? []) as Row[]).length > 0;
    },

    async countUnembedded() {
      const { count, error } = await admin.from('public_items').select('id', { count: 'exact', head: true }).is('embedding', null);
      check('countUnembedded', error);
      return count ?? 0;
    },

    async match(vector, limit, minSimilarity) {
      const { data, error } = await admin.rpc('match_public_items', {
        p_embedding: toPgVector(vector),
        p_limit: limit,
        p_min_similarity: minSimilarity,
      });
      check('match', error);
      return ((data ?? []) as Row[]).map((r) => ({
        id: String(r.id),
        kind: r.kind === 'experience' ? 'experience' : 'story',
        title: String(r.title ?? ''),
        summary: str(r.summary),
        body: str(r.body),
        fields: r.fields ?? {},
        topic_slug: str(r.topic_slug),
        narrator_label: String(r.narrator_label ?? ''),
        region: str(r.region),
        decade: typeof r.decade === 'number' ? r.decade : null,
        similarity: Number(r.similarity ?? 0),
      }));
    },
  };
}

/** Validates the JWT, then asks is_admin() as that user (RLS context). */
export async function checkAdmin(user: Client, jwt: string): Promise<AdminCheck> {
  const { data, error } = await user.auth.getUser(jwt);
  if (error || !data.user) return 'invalid';
  const res = await user.rpc('is_admin');
  check('is_admin', res.error);
  return res.data === true ? 'admin' : 'not_admin';
}
