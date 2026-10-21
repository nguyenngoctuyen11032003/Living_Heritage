import type { Supabase } from '@/lib/supabase';

export interface BookRow {
  id: string;
  family_id: string;
  title: string;
  subtitle: string | null;
  cover_style: string;
  created_at: string;
  updated_at: string;
}

export interface BookSummary extends BookRow {
  chapters: number;
}

export interface ChapterRow {
  story_id: string;
  position: number;
}

const BOOK_COLUMNS = 'id, family_id, title, subtitle, cover_style, created_at, updated_at';

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function listBooks(sb: Supabase, familyId: string): Promise<BookSummary[]> {
  const res = await sb.from('books').select(`${BOOK_COLUMNS}, book_chapters(count)`).eq('family_id', familyId).order('updated_at', { ascending: false });
  fail(res.error);
  return (res.data ?? []).map((row) => {
    const { book_chapters, ...rest } = row as unknown as BookRow & { book_chapters?: Array<{ count: number }> };
    return { ...rest, chapters: book_chapters?.[0]?.count ?? 0 };
  });
}

export async function fetchBook(sb: Supabase, id: string): Promise<BookRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const res = await sb.from('books').select(BOOK_COLUMNS).eq('id', id).maybeSingle();
  fail(res.error);
  return res.data ?? null;
}

export async function createBook(sb: Supabase, input: { family_id: string; title: string; subtitle: string | null; cover_style: string }): Promise<string> {
  const res = await sb
    .from('books')
    .insert({ family_id: input.family_id, title: input.title.trim(), subtitle: input.subtitle?.trim() || null, cover_style: input.cover_style })
    .select('id')
    .single();
  fail(res.error);
  return res.data!.id;
}

export async function updateBook(sb: Supabase, id: string, patch: { title: string; subtitle: string | null; cover_style: string }): Promise<void> {
  const res = await sb.from('books').update({ title: patch.title.trim(), subtitle: patch.subtitle?.trim() || null, cover_style: patch.cover_style }).eq('id', id);
  fail(res.error);
}

export async function deleteBook(sb: Supabase, id: string): Promise<void> {
  const res = await sb.from('books').delete().eq('id', id);
  fail(res.error);
}

export async function fetchChapters(sb: Supabase, bookId: string): Promise<ChapterRow[]> {
  const res = await sb.from('book_chapters').select('story_id, position').eq('book_id', bookId).order('position');
  fail(res.error);
  return res.data ?? [];
}

export async function addChapter(sb: Supabase, row: { book_id: string; family_id: string; story_id: string; position: number }): Promise<void> {
  const res = await sb.from('book_chapters').insert(row);
  fail(res.error);
}

export async function removeChapter(sb: Supabase, bookId: string, storyId: string): Promise<void> {
  const res = await sb.from('book_chapters').delete().eq('book_id', bookId).eq('story_id', storyId);
  fail(res.error);
}

export async function saveChapterPositions(sb: Supabase, bookId: string, updates: Array<{ story_id: string; position: number }>): Promise<void> {
  const results = await Promise.all(updates.map((u) => sb.from('book_chapters').update({ position: u.position }).eq('book_id', bookId).eq('story_id', u.story_id)));
  for (const r of results) fail(r.error);
}

export async function booksOfStory(sb: Supabase, storyId: string): Promise<string[]> {
  const res = await sb.from('book_chapters').select('book_id').eq('story_id', storyId);
  fail(res.error);
  return (res.data ?? []).map((r) => r.book_id);
}

export async function nextChapterPosition(sb: Supabase, bookId: string): Promise<number> {
  const res = await sb.from('book_chapters').select('position').eq('book_id', bookId).order('position', { ascending: false }).limit(1);
  fail(res.error);
  return (res.data?.[0]?.position ?? -1) + 1;
}
