import type { Supabase } from '@/lib/supabase';
import { STORY_COLUMNS, type VaultStory } from './types';

export interface CollectionSummary {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  count: number;
}

export interface CollectionItemRow {
  story_id: string;
  position: number;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function listCollections(sb: Supabase, familyId: string): Promise<CollectionSummary[]> {
  const res = await sb
    .from('collections')
    .select('id, title, description, created_at, collection_items(count)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  fail(res.error);
  return (res.data ?? []).map((row) => {
    const counted = (row as unknown as { collection_items?: Array<{ count: number }> }).collection_items;
    return { id: row.id, title: row.title, description: row.description, created_at: row.created_at, count: counted?.[0]?.count ?? 0 };
  });
}

export async function fetchCollection(sb: Supabase, id: string): Promise<{ id: string; family_id: string; title: string; description: string | null } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const res = await sb.from('collections').select('id, family_id, title, description').eq('id', id).maybeSingle();
  fail(res.error);
  return res.data ?? null;
}

export async function createCollection(sb: Supabase, familyId: string, title: string, description: string | null): Promise<string> {
  const res = await sb.from('collections').insert({ family_id: familyId, title: title.trim(), description: description?.trim() || null }).select('id').single();
  fail(res.error);
  return res.data!.id;
}

export async function updateCollection(sb: Supabase, id: string, title: string, description: string | null): Promise<void> {
  const res = await sb.from('collections').update({ title: title.trim(), description: description?.trim() || null }).eq('id', id);
  fail(res.error);
}

export async function deleteCollection(sb: Supabase, id: string): Promise<void> {
  const res = await sb.from('collections').delete().eq('id', id);
  fail(res.error);
}

export async function listItems(sb: Supabase, collectionId: string): Promise<CollectionItemRow[]> {
  const res = await sb.from('collection_items').select('story_id, position').eq('collection_id', collectionId).order('position').order('added_at');
  fail(res.error);
  return res.data ?? [];
}

export async function fetchStoriesByIds(sb: Supabase, ids: string[]): Promise<VaultStory[]> {
  if (ids.length === 0) return [];
  const res = await sb.from('stories').select(STORY_COLUMNS).in('id', ids);
  fail(res.error);
  return (res.data ?? []) as VaultStory[];
}

/** All readable stories of the family (light list for pickers), newest first. */
export async function fetchFamilyStories(sb: Supabase, familyId: string, opts: { approvedOnly?: boolean; limit?: number } = {}): Promise<VaultStory[]> {
  let q = sb.from('stories').select(STORY_COLUMNS).eq('family_id', familyId);
  if (opts.approvedOnly) q = q.eq('edit_status', 'approved');
  const res = await q.order('created_at', { ascending: false }).limit(opts.limit ?? 500);
  fail(res.error);
  return (res.data ?? []) as VaultStory[];
}

export async function addItem(sb: Supabase, row: { collection_id: string; family_id: string; story_id: string; position: number }): Promise<void> {
  const res = await sb.from('collection_items').insert(row);
  fail(res.error);
}

export async function removeItem(sb: Supabase, collectionId: string, storyId: string): Promise<void> {
  const res = await sb.from('collection_items').delete().eq('collection_id', collectionId).eq('story_id', storyId);
  fail(res.error);
}

export async function saveItemPositions(sb: Supabase, collectionId: string, updates: Array<{ story_id: string; position: number }>): Promise<void> {
  const results = await Promise.all(
    updates.map((u) => sb.from('collection_items').update({ position: u.position }).eq('collection_id', collectionId).eq('story_id', u.story_id)),
  );
  for (const r of results) fail(r.error);
}

/** Collection ids (with their max position) that already contain the story. */
export async function collectionsOfStory(sb: Supabase, storyId: string): Promise<string[]> {
  const res = await sb.from('collection_items').select('collection_id').eq('story_id', storyId);
  fail(res.error);
  return (res.data ?? []).map((r) => r.collection_id);
}

export async function nextItemPosition(sb: Supabase, collectionId: string): Promise<number> {
  const res = await sb.from('collection_items').select('position').eq('collection_id', collectionId).order('position', { ascending: false }).limit(1);
  fail(res.error);
  return (res.data?.[0]?.position ?? -1) + 1;
}
