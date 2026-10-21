// Family data export (DỰ ÁN.md 2.5.3: "có chức năng ... xuất dữ liệu"). Everything is read client-side with the
// signed-in user's own permissions (RLS), so the file contains exactly what this user may read — nothing more.
import type { Database } from '@lh/shared';
import { stripDiacritics } from '@/lib/format';
import type { Supabase } from '@/lib/supabase';

type Tables = Database['public']['Tables'];
type Row<T extends keyof Tables> = Tables[T]['Row'];

/** Tables in the export, in the order they are fetched (later ones depend on ids from earlier ones). */
export const EXPORT_TABLES = [
  'families',
  'narrators',
  'stories',
  'story_versions',
  'story_share_settings',
  'recordings',
  'transcripts',
  'collections',
  'collection_items',
  'books',
  'book_chapters',
  'story_photos',
] as const;
export type ExportTable = (typeof EXPORT_TABLES)[number];

export interface ExportRows {
  families: Row<'families'>[];
  narrators: Row<'narrators'>[];
  stories: Row<'stories'>[];
  story_versions: Row<'story_versions'>[];
  story_share_settings: Row<'story_share_settings'>[];
  recordings: Row<'recordings'>[];
  transcripts: Row<'transcripts'>[];
  collections: Row<'collections'>[];
  collection_items: Row<'collection_items'>[];
  books: Row<'books'>[];
  book_chapters: Row<'book_chapters'>[];
  story_photos: Row<'story_photos'>[];
}

export interface SignedFile {
  kind: 'recording' | 'photo';
  bucket: 'recordings' | 'media';
  /** id of the recordings / story_photos row */
  id: string;
  path: string;
  /** null when the link could not be created (the row stays in the export). */
  url: string | null;
}

export const EXPORT_FORMAT = 'di-san-song.family-export';
export const EXPORT_VERSION = 1;
export const SIGNED_URL_TTL_S = 3600;

export interface FamilyExport {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exported_at: string;
  family: { id: string; name: string };
  counts: Record<ExportTable, number> & { files: number };
  notes: {
    scope: string;
    files_expire_at: string;
  };
  tables: ExportRows;
  /** Stories with their version history and share settings nested, for easy reading. */
  stories_expanded: Array<Row<'stories'> & { versions: Row<'story_versions'>[]; share_settings: Row<'story_share_settings'> | null; photos: Row<'story_photos'>[] }>;
  files: SignedFile[];
}

export function emptyRows(): ExportRows {
  return {
    families: [],
    narrators: [],
    stories: [],
    story_versions: [],
    story_share_settings: [],
    recordings: [],
    transcripts: [],
    collections: [],
    collection_items: [],
    books: [],
    book_chapters: [],
    story_photos: [],
  };
}

/** Pure: assemble the export document from fetched rows. */
export function buildExport(
  rows: ExportRows,
  opts: { familyId: string; familyName: string; files?: SignedFile[]; now?: Date },
): FamilyExport {
  const now = opts.now ?? new Date();
  const files = opts.files ?? [];
  const counts = Object.fromEntries(EXPORT_TABLES.map((t) => [t, rows[t].length])) as Record<ExportTable, number>;

  const versionsByStory = groupBy(rows.story_versions, (v) => v.story_id);
  const photosByStory = groupBy(rows.story_photos, (p) => p.story_id);
  const shareByStory = new Map(rows.story_share_settings.map((s) => [s.story_id, s]));

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: now.toISOString(),
    family: { id: opts.familyId, name: opts.familyName },
    counts: { ...counts, files: files.length },
    notes: {
      scope: 'Only rows the exporting user is allowed to read are included. Audio and photo links expire.',
      files_expire_at: new Date(now.getTime() + SIGNED_URL_TTL_S * 1000).toISOString(),
    },
    tables: rows,
    stories_expanded: rows.stories.map((s) => ({
      ...s,
      versions: [...(versionsByStory.get(s.id) ?? [])].sort((a, b) => a.version - b.version),
      share_settings: shareByStory.get(s.id) ?? null,
      photos: [...(photosByStory.get(s.id) ?? [])].sort((a, b) => a.position - b.position),
    })),
    files,
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/** `di-san-song-nha-ho-nguyen-2026-10-21.json` */
export function exportFileName(familyName: string, date = new Date()): string {
  const slug =
    stripDiacritics(familyName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'gia-dinh';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `di-san-song-${slug}-${y}-${m}-${d}.json`;
}

export function chunk<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Fetching (thin; not unit-tested against the network)
// ---------------------------------------------------------------------------

export type TableProgress = { status: 'pending' | 'loading' | 'done' | 'error'; count: number };
export type ExportProgress = Record<ExportTable | 'files', TableProgress>;

export function initialProgress(): ExportProgress {
  const entries = [...EXPORT_TABLES, 'files' as const].map((t) => [t, { status: 'pending', count: 0 } satisfies TableProgress]);
  return Object.fromEntries(entries) as ExportProgress;
}

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** PostgREST returns at most `max_rows` (1000, supabase/config.toml) rows per request, so every table is read in pages. */
export const EXPORT_PAGE_SIZE = 1000;

/**
 * Reads every page of a query: `page(from, to)` must apply `.range(from, to)` to a stably ordered query.
 * Stops at the first short page; throws on the first error, so a truncated export is never offered as complete.
 */
export async function readAllPages<T>(page: (from: number, to: number) => QueryResult<T>, size = EXPORT_PAGE_SIZE): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

/** Fetches every table for the family, reporting progress per table, then signs file URLs. Throws on the first table error. */
export async function collectFamilyExport(
  sb: Supabase,
  family: { id: string; name: string },
  onProgress: (table: ExportTable | 'files', p: TableProgress) => void,
): Promise<FamilyExport> {
  const rows = emptyRows();
  const fid = family.id;

  async function load<T extends ExportTable>(table: T, run: () => Promise<ExportRows[T]>) {
    onProgress(table, { status: 'loading', count: 0 });
    try {
      const data = await run();
      rows[table] = data;
      onProgress(table, { status: 'done', count: data.length });
    } catch (e) {
      onProgress(table, { status: 'error', count: 0 });
      throw e;
    }
  }
  async function byIds<T>(ids: string[], q: (part: string[], from: number, to: number) => QueryResult<T>): Promise<T[]> {
    const out: T[] = [];
    for (const part of chunk(ids)) out.push(...(await readAllPages((a, b) => q(part, a, b))));
    return out;
  }

  await load('families', () => readAllPages((a, b) => sb.from('families').select('*').eq('id', fid).range(a, b)));
  await load('narrators', () => readAllPages((a, b) => sb.from('narrators').select('*').eq('family_id', fid).order('created_at').order('id').range(a, b)));
  await load('stories', () => readAllPages((a, b) => sb.from('stories').select('*').eq('family_id', fid).order('created_at').order('id').range(a, b)));
  const storyIds = rows.stories.map((s) => s.id);
  await load('story_versions', () => byIds(storyIds, (p, a, b) => sb.from('story_versions').select('*').in('story_id', p).order('id').range(a, b)));
  await load('story_share_settings', () => byIds(storyIds, (p, a, b) => sb.from('story_share_settings').select('*').in('story_id', p).order('story_id').range(a, b)));
  await load('recordings', () => readAllPages((a, b) => sb.from('recordings').select('*').eq('family_id', fid).order('created_at').order('id').range(a, b)));
  const recordingIds = rows.recordings.map((r) => r.id);
  await load('transcripts', () => byIds(recordingIds, (p, a, b) => sb.from('transcripts').select('*').in('recording_id', p).order('id').range(a, b)));
  await load('collections', () => readAllPages((a, b) => sb.from('collections').select('*').eq('family_id', fid).order('id').range(a, b)));
  await load('collection_items', () =>
    readAllPages((a, b) => sb.from('collection_items').select('*').eq('family_id', fid).order('collection_id').order('story_id').range(a, b)),
  );
  await load('books', () => readAllPages((a, b) => sb.from('books').select('*').eq('family_id', fid).order('id').range(a, b)));
  await load('book_chapters', () => readAllPages((a, b) => sb.from('book_chapters').select('*').eq('family_id', fid).order('book_id').order('position').range(a, b)));
  await load('story_photos', () => readAllPages((a, b) => sb.from('story_photos').select('*').eq('family_id', fid).order('id').range(a, b)));

  onProgress('files', { status: 'loading', count: 0 });
  const files: SignedFile[] = [];
  const sign = async (bucket: 'recordings' | 'media', kind: SignedFile['kind'], items: Array<{ id: string; storage_path: string }>) => {
    for (const part of chunk(items)) {
      const { data } = await sb.storage.from(bucket).createSignedUrls(
        part.map((i) => i.storage_path),
        SIGNED_URL_TTL_S,
      );
      const byPath = new Map((data ?? []).map((d) => [d.path, d.error ? null : d.signedUrl]));
      for (const i of part) files.push({ kind, bucket, id: i.id, path: i.storage_path, url: byPath.get(i.storage_path) ?? null });
    }
  };
  await sign('recordings', 'recording', rows.recordings);
  await sign('media', 'photo', rows.story_photos);
  onProgress('files', { status: 'done', count: files.length });

  return buildExport(rows, { familyId: fid, familyName: family.name, files });
}

/** Triggers a browser download of the JSON document. */
export function downloadJson(doc: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
