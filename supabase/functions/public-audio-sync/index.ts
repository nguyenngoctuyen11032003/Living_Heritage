// Network wiring only; logic in handler.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { fail } from '../_shared/http.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { collectPages, handle, PUBLIC_AUDIO_CACHE_SECONDS, type SyncStore } from './handler.ts';

const PUBLIC_BUCKET = 'public-audio';
const PRIVATE_BUCKET = 'recordings';

function createStore(admin: SupabaseClient): SyncStore {
  return {
    listPublishedAudio() {
      // Paged with a stable order: an unpaged read stops at max_rows and the rest would be deleted as orphans.
      return collectPages(async (offset, limit) => {
        const { data, error } = await admin
          .from('public_items')
          .select('id, audio_path, stories(recordings(storage_path))')
          .eq('audio_allowed', true)
          .not('audio_path', 'is', null)
          .order('id')
          .range(offset, offset + limit - 1);
        if (error) throw error;
        return (data ?? []).map((row) => {
          const r = row as unknown as { id: string; audio_path: string; stories: { recordings: { storage_path: string } | null } | null };
          return { id: r.id, audio_path: r.audio_path, source_path: r.stories?.recordings?.storage_path ?? null };
        });
      });
    },
    async listPublicFiles() {
      const entries = await collectPages(async (offset, limit) => {
        const { data, error } = await admin.storage.from(PUBLIC_BUCKET).list('items', {
          limit,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        });
        if (error) throw error;
        return data ?? [];
      });
      return entries.filter((f) => f.id).map((f) => `items/${f.name}`);
    },
    async copyToPublic(sourcePath, targetPath) {
      const { data, error } = await admin.storage.from(PRIVATE_BUCKET).download(sourcePath);
      if (error || !data) throw error ?? new Error('download failed');
      const up = await admin.storage.from(PUBLIC_BUCKET).upload(targetPath, data, {
        contentType: data.type || 'audio/webm',
        upsert: true,
        cacheControl: String(PUBLIC_AUDIO_CACHE_SECONDS),
      });
      if (up.error) throw up.error;
    },
    async removePublic(paths) {
      const { error } = await admin.storage.from(PUBLIC_BUCKET).remove(paths);
      if (error) throw error;
    },
  };
}

Deno.serve(async (req) => {
  try {
    return await handle(req, {
      verifyUser: async (jwt) => {
        const { data, error } = await createUserClient(jwt).auth.getUser(jwt);
        return !error && Boolean(data.user);
      },
      store: () => createStore(createAdminClient()),
    });
  } catch {
    return fail('internal');
  }
});
