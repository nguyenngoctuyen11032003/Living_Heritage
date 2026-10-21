// Sharing data: visibility, story_share_settings, publish_requests, preview_public_item, withdraw_public.
import type { Database, MemberRole } from '@lh/shared';
import { check, ReviewError } from '@/features/review/errors';
import { syncPublicAudio } from '@/features/review/data';
import type { Supabase } from '@/lib/supabase';
import { DEFAULT_TOGGLES, type ShareToggles } from './rules';

type Tables = Database['public']['Tables'];
export type ShareStory = Pick<Tables['stories']['Row'], 'id' | 'family_id' | 'narrator_id' | 'kind' | 'edit_status' | 'visibility' | 'recording_id'>;
export type PublishRequestRow = Pick<Tables['publish_requests']['Row'], 'id' | 'status' | 'requested_at' | 'reviewed_at' | 'note'>;

export interface ShareState {
  story: ShareStory;
  toggles: ShareToggles;
  request: PublishRequestRow | null;
  canWrite: boolean;
  canPublish: boolean;
}

export async function loadShareState(sb: Supabase, storyId: string, roleFor: (familyId: string) => MemberRole | null): Promise<ShareState> {
  const { data: story, error } = await sb
    .from('stories')
    .select('id, family_id, narrator_id, kind, edit_status, visibility, recording_id')
    .eq('id', storyId)
    .maybeSingle();
  check(error);
  if (!story) throw new ReviewError('not_found');
  const [settings, requests, canWrite, isNarrator] = await Promise.all([
    sb.from('story_share_settings').select('show_audio, show_real_name, show_region, show_photos').eq('story_id', storyId).maybeSingle(),
    sb.from('publish_requests').select('id, status, requested_at, reviewed_at, note').eq('story_id', storyId).order('requested_at', { ascending: false }).limit(1),
    sb.rpc('can_write_story', { sid: storyId }),
    sb.rpc('is_narrator_user', { nid: story.narrator_id }),
  ]);
  check(settings.error);
  const role = roleFor(story.family_id);
  return {
    story,
    toggles: settings.data ?? { ...DEFAULT_TOGGLES },
    request: requests.error ? null : (requests.data?.[0] ?? null),
    canWrite: canWrite.data === true,
    canPublish: isNarrator.data === true || role === 'owner' || role === 'manager',
  };
}

export async function setVisibility(sb: Supabase, storyId: string, visibility: 'private' | 'family'): Promise<void> {
  const { error } = await sb.from('stories').update({ visibility }).eq('id', storyId);
  check(error);
}

export async function saveToggles(sb: Supabase, storyId: string, toggles: ShareToggles, turnedOff: boolean): Promise<void> {
  const { error } = await sb.from('story_share_settings').upsert({ story_id: storyId, ...toggles }, { onConflict: 'story_id' });
  check(error);
  // Audio switched off on a public story: the server clears audio_path; remove the public copy too.
  if (turnedOff) await syncPublicAudio(sb);
}

export async function requestPublish(sb: Supabase, storyId: string): Promise<string> {
  const { data, error } = await sb.rpc('request_publish', { p_story: storyId });
  check(error);
  return data ?? '';
}

export async function withdrawPublic(sb: Supabase, storyId: string): Promise<void> {
  const { error } = await sb.rpc('withdraw_public', { p_story: storyId });
  check(error);
  await syncPublicAudio(sb);
}

/** The exact public snapshot (keys = public_items columns). */
export interface PublicPreview {
  kind: 'story' | 'experience';
  title: string;
  summary: string | null;
  body: string;
  fields: Record<string, unknown>;
  topic_slug: string | null;
  region: string | null;
  decade: number | null;
  narrator_label: string;
  audio_allowed: boolean;
}

export function parsePreview(raw: unknown): PublicPreview | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    kind: r.kind === 'experience' ? 'experience' : 'story',
    title: str(r.title) ?? '',
    summary: str(r.summary),
    body: str(r.body) ?? '',
    fields: r.fields && typeof r.fields === 'object' && !Array.isArray(r.fields) ? (r.fields as Record<string, unknown>) : {},
    topic_slug: str(r.topic_slug),
    region: str(r.region),
    decade: typeof r.decade === 'number' ? r.decade : null,
    narrator_label: str(r.narrator_label) ?? '',
    audio_allowed: r.audio_allowed === true,
  };
}

export async function loadPreview(sb: Supabase, storyId: string): Promise<PublicPreview | null> {
  const { data, error } = await sb.rpc('preview_public_item', { p_story: storyId });
  check(error);
  return parsePreview(data);
}
