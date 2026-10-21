// Supabase calls for the public knowledge hub. All reads use anon-safe sources (search_public, public_items).
import { BUCKET_PUBLIC_AUDIO } from '@lh/shared';
import type { Supabase } from '@/lib/supabase';
import { toSearchArgs, type KnowledgeFilters } from './filters';
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
