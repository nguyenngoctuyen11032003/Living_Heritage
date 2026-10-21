// Supabase calls for the public knowledge hub. All reads use anon-safe sources (search_public, public_items).
import { BUCKET_PUBLIC_AUDIO } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';
import { toSearchArgs, type KnowledgeFilters } from './filters';
import type { SavedEntry } from './saved';
import { fromPublicRow, isUuid, PUBLIC_ITEM_COLUMNS, type KnowledgeItem, type PublicItemRow } from './types';

export const PAGE_SIZE = 12;

export const REPORT_REASONS = ['inaccurate', 'unsafe', 'privacy', 'copyright', 'offensive', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export class HubError extends Error {}

export async function searchPublic(sb: Supabase, filters: KnowledgeFilters, offset: number, limit = PAGE_SIZE): Promise<KnowledgeItem[]> {
  const { data, error } = await sb.rpc('search_public', toSearchArgs(filters, offset, limit));
  if (error) throw new HubError(error.message);
  return ((data ?? []) as unknown as PublicItemRow[]).map((row) => fromPublicRow(row));
}

/** true when the hub has no public item at all (then the illustrative set is shown). */
export async function hubIsEmpty(sb: Supabase): Promise<boolean> {
  const { data, error } = await sb.rpc('search_public', { lim: 1, off: 0 });
  if (error) throw new HubError(error.message);
  return ((data ?? []) as unknown[]).length === 0;
}

export async function getPublicItem(sb: Supabase, id: string): Promise<KnowledgeItem | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await sb.from('public_items').select(PUBLIC_ITEM_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new HubError(error.message);
  return data ? fromPublicRow(data) : null;
}

export function publicAudioUrl(sb: Supabase, path: string | null): string | undefined {
  if (!path) return undefined;
  return sb.storage.from(BUCKET_PUBLIC_AUDIO).getPublicUrl(path).data.publicUrl;
}

/** Up to `limit` other items of the same topic. */
export async function relatedItems(sb: Supabase, item: KnowledgeItem, limit = 3): Promise<KnowledgeItem[]> {
  if (!item.topicSlug) return [];
  const rows = await searchPublic(sb, { q: '', topic: item.topicSlug, kind: null, region: null, decade: null }, 0, limit + 1);
  return rows.filter((r) => r.id !== item.id).slice(0, limit);
}

/** Anonymous-friendly report (reports grants insert to anon; no row is returned to the caller). */
export async function submitReport(sb: Supabase, itemId: string, reason: ReportReason, note: string): Promise<void> {
  const { error } = await sb.from('reports').insert({ public_item_id: itemId, reason, note: note.trim() ? note.trim().slice(0, 1000) : null });
  if (error) throw new HubError(error.message);
}

export async function submitConnect(sb: Supabase, itemId: string, input: { name: string; contact: string; message: string }): Promise<void> {
  const { error } = await sb.from('connect_requests').insert({
    public_item_id: itemId,
    name: input.name.trim().slice(0, 80),
    contact: input.contact.trim().slice(0, 200),
    message: input.message.trim().slice(0, 2000),
  });
  if (error) throw new HubError(error.message);
}

/** Which of `ids` are still published (anything withdrawn is gone from public_items). Chunked to keep URLs short. */
export async function stillPublicIds(sb: Supabase, ids: readonly string[]): Promise<Set<string>> {
  const valid = [...new Set(ids.filter(isUuid))];
  const live = new Set<string>();
  for (let i = 0; i < valid.length; i += 100) {
    const { data, error } = await sb.from('public_items').select('id').in('id', valid.slice(i, i + 100));
    if (error) throw new HubError(error.message);
    for (const row of data ?? []) live.add(row.id);
  }
  return live;
}

interface SavedItemRow {
  public_item_id: string;
  created_at: string;
  public_items: { id: string; kind: string; title: string; topic_slug: string | null; narrator_label: string; region: string | null } | null;
}

/** saved_items for the signed-in user (RLS: own rows), newest first, with the public item's card fields. */
export async function listSavedItems(sb: Supabase): Promise<SavedEntry[]> {
  const { data, error } = await sb
    .from('saved_items')
    .select('public_item_id, created_at, public_items(id, kind, title, topic_slug, narrator_label, region)')
    .order('created_at', { ascending: false });
  if (error) throw new HubError(error.message);
  return ((data ?? []) as unknown as SavedItemRow[])
    .filter((r) => r.public_items)
    .map((r) => ({
      id: r.public_item_id,
      title: r.public_items!.title,
      kind: r.public_items!.kind === 'experience' ? 'experience' : 'story',
      topicSlug: r.public_items!.topic_slug,
      narratorLabel: r.public_items!.narrator_label,
      region: r.public_items!.region,
      savedAt: r.created_at,
    }));
}

/**
 * Saves the ids that are still public (a withdrawn id would fail the foreign key); duplicates are ignored.
 * Returns the ids that were skipped because they are no longer public.
 */
export async function addSavedItems(sb: Supabase, userId: string, ids: readonly string[]): Promise<string[]> {
  const live = await stillPublicIds(sb, ids);
  const skipped = ids.filter((id) => !live.has(id));
  const rows = [...live].map((public_item_id) => ({ user_id: userId, public_item_id }));
  if (rows.length === 0) return skipped;
  const { error } = await sb.from('saved_items').upsert(rows, { onConflict: 'user_id,public_item_id', ignoreDuplicates: true });
  if (error) throw new HubError(error.message);
  return skipped;
}

export async function removeSavedItem(sb: Supabase, id: string): Promise<void> {
  const { error } = await sb.from('saved_items').delete().eq('public_item_id', id);
  if (error) throw new HubError(error.message);
}
