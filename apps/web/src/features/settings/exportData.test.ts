import { describe, expect, it } from 'vitest';
import { buildExport, chunk, emptyRows, EXPORT_FORMAT, EXPORT_TABLES, exportFileName, initialProgress, readAllPages, SIGNED_URL_TTL_S, type ExportRows } from './exportData';

const F = 'f0000000-0000-0000-0000-000000000001';
const NOW = new Date('2026-10-21T08:00:00.000Z');

function sampleRows(): ExportRows {
  const rows = emptyRows();
  rows.families = [{ id: F, name: 'Nhà họ Nguyễn', owner_id: 'u1', created_at: 'x', updated_at: 'x' }];
  rows.stories = [
    { id: 's1', family_id: F, title: 'Mùa gặt' } as ExportRows['stories'][number],
    { id: 's2', family_id: F, title: 'Bến đò' } as ExportRows['stories'][number],
  ];
  rows.story_versions = [
    { id: 'v2', story_id: 's1', version: 2 } as ExportRows['story_versions'][number],
    { id: 'v1', story_id: 's1', version: 1 } as ExportRows['story_versions'][number],
  ];
  rows.story_share_settings = [{ story_id: 's1', show_audio: false, show_real_name: false, show_region: true, show_photos: false, updated_by: null, updated_at: 'x' }];
  rows.story_photos = [
    { id: 'p2', story_id: 's1', family_id: F, storage_path: `${F}/b.jpg`, caption: null, position: 2, created_by: null, created_at: 'x' },
    { id: 'p1', story_id: 's1', family_id: F, storage_path: `${F}/a.jpg`, caption: 'Ảnh cưới', position: 1, created_by: null, created_at: 'x' },
  ];
  return rows;
}

describe('buildExport', () => {
  it('stamps format, family, time and file expiry', () => {
    const doc = buildExport(sampleRows(), { familyId: F, familyName: 'Nhà họ Nguyễn', now: NOW });
    expect(doc.format).toBe(EXPORT_FORMAT);
    expect(doc.version).toBe(1);
    expect(doc.family).toEqual({ id: F, name: 'Nhà họ Nguyễn' });
    expect(doc.exported_at).toBe(NOW.toISOString());
    expect(new Date(doc.notes.files_expire_at).getTime() - NOW.getTime()).toBe(SIGNED_URL_TTL_S * 1000);
  });

  it('counts every table and the file links', () => {
    const files = [{ kind: 'photo' as const, bucket: 'media' as const, id: 'p1', path: `${F}/a.jpg`, url: 'https://x/signed' }];
    const doc = buildExport(sampleRows(), { familyId: F, familyName: 'N', files, now: NOW });
    for (const t of EXPORT_TABLES) expect(doc.counts[t]).toBe(doc.tables[t].length);
    expect(doc.counts.stories).toBe(2);
    expect(doc.counts.story_versions).toBe(2);
    expect(doc.counts.files).toBe(1);
    expect(doc.files).toEqual(files);
  });

  it('nests sorted versions, share settings and photos under each story', () => {
    const doc = buildExport(sampleRows(), { familyId: F, familyName: 'N', now: NOW });
    const s1 = doc.stories_expanded.find((s) => s.id === 's1')!;
    expect(s1.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(s1.share_settings?.show_region).toBe(true);
    expect(s1.photos.map((p) => p.id)).toEqual(['p1', 'p2']);
    const s2 = doc.stories_expanded.find((s) => s.id === 's2')!;
    expect(s2.versions).toEqual([]);
    expect(s2.share_settings).toBeNull();
    expect(s2.photos).toEqual([]);
  });

  it('does not mutate the input rows', () => {
    const rows = sampleRows();
    buildExport(rows, { familyId: F, familyName: 'N', now: NOW });
    expect(rows.story_versions.map((v) => v.id)).toEqual(['v2', 'v1']);
  });

  it('handles an empty family', () => {
    const doc = buildExport(emptyRows(), { familyId: F, familyName: 'N', now: NOW });
    expect(doc.stories_expanded).toEqual([]);
    expect(Object.values(doc.counts).every((n) => n === 0)).toBe(true);
    expect(() => JSON.stringify(doc)).not.toThrow();
  });
});

describe('exportFileName', () => {
  it('slugifies Vietnamese names and appends the local date', () => {
    expect(exportFileName('Nhà họ Nguyễn', new Date(2026, 9, 21))).toBe('di-san-song-nha-ho-nguyen-2026-10-21.json');
    expect(exportFileName('Đỗ / Trần & co.', new Date(2026, 0, 5))).toBe('di-san-song-do-tran-co-2026-01-05.json');
  });
  it('falls back when nothing is left', () => {
    expect(exportFileName('***', new Date(2026, 0, 5))).toBe('di-san-song-gia-dinh-2026-01-05.json');
  });
});

describe('helpers', () => {
  it('chunks lists', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
  it('starts every table as pending', () => {
    const p = initialProgress();
    expect(Object.keys(p)).toEqual([...EXPORT_TABLES, 'files']);
    expect(Object.values(p).every((x) => x.status === 'pending' && x.count === 0)).toBe(true);
  });
});

describe('readAllPages', () => {
  const source = Array.from({ length: 2345 }, (_, i) => i);
  const page = (from: number, to: number) => Promise.resolve({ data: source.slice(from, to + 1), error: null });

  it('reads past the 1000-row response cap instead of truncating', async () => {
    const calls: Array<[number, number]> = [];
    const all = await readAllPages((a, b) => {
      calls.push([a, b]);
      return page(a, b);
    });
    expect(all).toHaveLength(2345);
    expect(all[2344]).toBe(2344);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('asks one extra empty page when the total is an exact multiple', async () => {
    let n = 0;
    const all = await readAllPages((a, b) => {
      n += 1;
      return Promise.resolve({ data: source.slice(0, 4).slice(a, b + 1), error: null });
    }, 2);
    expect(all).toEqual([0, 1, 2, 3]);
    expect(n).toBe(3);
  });

  it('throws on the first error so a partial export is never offered', async () => {
    await expect(readAllPages((a) => Promise.resolve(a === 0 ? { data: [1], error: null } : { data: null, error: { message: 'boom' } }), 1)).rejects.toThrow('boom');
  });
});
