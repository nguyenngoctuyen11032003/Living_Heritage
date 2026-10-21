// /nghe/:storyId (QR target in memory books). Everything goes through RLS: if the signed-in user cannot read
// the story, the result is 'forbidden' and nothing about the story (not even the title) is returned.
import { BUCKET_RECORDINGS } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';
import { isUuid } from './types';

export type ListenResult =
  | { status: 'forbidden' }
  | { status: 'ready'; title: string; narrator: string | null; audioUrl: string | null; durationS: number | null; audioError: boolean };

export async function loadListen(sb: Supabase, storyId: string | undefined): Promise<ListenResult> {
  if (!isUuid(storyId)) return { status: 'forbidden' };
  const { data: story, error } = await sb.from('stories').select('id, title, narrator_id, recording_id').eq('id', storyId).maybeSingle();
  if (error) throw error;
  if (!story) return { status: 'forbidden' };

  const { data: narrator } = await sb.from('narrators').select('display_name, pen_name').eq('id', story.narrator_id).maybeSingle();
  const narratorName = narrator ? narrator.display_name || narrator.pen_name : null;

  if (!story.recording_id) return { status: 'ready', title: story.title, narrator: narratorName, audioUrl: null, durationS: null, audioError: false };

  const { data: rec } = await sb.from('recordings').select('storage_path, duration_s').eq('id', story.recording_id).maybeSingle();
  if (!rec) return { status: 'ready', title: story.title, narrator: narratorName, audioUrl: null, durationS: null, audioError: false };
  const { data: signed, error: signError } = await sb.storage.from(BUCKET_RECORDINGS).createSignedUrl(rec.storage_path, 3600);
  return {
    status: 'ready',
    title: story.title,
    narrator: narratorName,
    audioUrl: signed?.signedUrl ?? null,
    durationS: rec.duration_s,
    audioError: Boolean(signError) || !signed?.signedUrl,
  };
}
