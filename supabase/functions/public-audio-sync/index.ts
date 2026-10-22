// Network wiring only; logic in handler.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { fail } from '../_shared/http.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { handle, type SyncStore } from './handler.ts';

const PUBLIC_BUCKET = 'public-audio';
const PRIVATE_BUCKET = 'recordings';

function createStore(admin: SupabaseClient): SyncStore {
  return {
    async listPublishedAudio() {
      const { data, error } = await admin
        .from('public_items')
        .select('id, audio_path, stories(recordings(storage_path))')
        .eq('audio_allowed', true)
        .not('audio_path', 'is', null);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as unknown as { id: string; audio_path: string; stories: { recordings: { storage_path: string } | null } | null };
        return { id: r.id, audio_path: r.audio_path, source_path: r.stories?.recordings?.storage_path ?? null };
      });
    },
    async listPublicFiles() {
      const names: string[] = [];
      for (let offset = 0;; offset += 1000) {
        const { data, error } = await admin.storage.from(PUBLIC_BUCKET).list('items', { limit: 1000, offset });
        if (error) throw error;
        names.push(...(data ?? []).filter((f) => f.id).map((f) => `items/${f.name}`));
        if (!data || data.length < 1000) break;
      }
      return names;
    },
    async copyToPublic(sourcePath, targetPath) {
      const { data, error } = await admin.storage.from(PRIVATE_BUCKET).download(sourcePath);
      if (error || !data) throw error ?? new Error('download failed');
      const up = await admin.storage.from(PUBLIC_BUCKET).upload(targetPath, data, {
        contentType: data.type || 'audio/webm',
        upsert: true,
        cacheControl: '3600',
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
