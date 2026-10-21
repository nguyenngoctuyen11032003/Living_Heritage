import { describe, expect, it } from 'vitest';
import { groupAlbum } from './album';
import { buildTiers, columnCenters, connectorPaths, countByNarrator, initialOf, packedCenters, readPaged, vaultByNarratorPath } from './tree';

const n = (id: string, generation: number | null, birth_year: number | null, display_name = id) => ({ id, generation, birth_year, display_name });

describe('buildTiers', () => {
  it('groups by generation, oldest tier first, skipping empty generations', () => {
    const { tiers, unplaced } = buildTiers([n('c1', 3, 1970), n('g1', 1, 1920), n('c2', 3, 1965), n('x', null, 1990)]);
    expect(tiers.map((t) => t.generation)).toEqual([1, 3]);
    expect(tiers[1]!.narrators.map((p) => p.id)).toEqual(['c2', 'c1']);
    expect(unplaced.map((p) => p.id)).toEqual(['x']);
  });
  it('sorts by birth year (unknown last), then name; invalid generations are unplaced', () => {
    const { tiers, unplaced } = buildTiers([n('b', 2, null, 'Bà Hoa'), n('a', 2, null, 'Ông An'), n('z', 2, 1930, 'Ông Z'), n('bad', 9, 1940), n('zero', 0, 1950)]);
    expect(tiers[0]!.narrators.map((p) => p.id)).toEqual(['z', 'b', 'a']);
    expect(unplaced.map((p) => p.id)).toEqual(['bad', 'zero']);
  });
  it('handles an empty family', () => {
    expect(buildTiers([])).toEqual({ tiers: [], unplaced: [] });
  });
});

describe('connector geometry', () => {
  it('centres equal columns', () => {
    expect(columnCenters(1)).toEqual([50]);
    expect(columnCenters(4)).toEqual([12.5, 37.5, 62.5, 87.5]);
  });
  it('draws stems, a bar and drops', () => {
    expect(connectorPaths(1, 2)).toEqual(['M50 0V20', 'M25 20H75', 'M25 20V40', 'M75 20V40']);
    expect(connectorPaths(1, 1)).toEqual(['M50 0V20', 'M50 20V40']);
    expect(connectorPaths(0, 3)).toEqual([]);
  });
  it('centres packed fixed-width cards inside the widest row', () => {
    // widest 2 cards of 100 with a 20 gap → row 220; centres at 50 and 170.
    expect(packedCenters(2, 2, 100, 20).map((x) => Math.round(x * 100) / 100)).toEqual([22.73, 77.27]);
    // one card under that row sits in the middle.
    expect(packedCenters(1, 2, 100, 20)).toEqual([50]);
    expect(connectorPaths(1, 2, (k) => packedCenters(k, 2, 100, 20))).toEqual(['M50 0V20', 'M22.73 20H77.27', 'M22.73 20V40', 'M77.27 20V40']);
  });
});

describe('tree helpers', () => {
  it('counts stories per narrator', () => {
    const m = countByNarrator([{ narrator_id: 'a' }, { narrator_id: 'b' }, { narrator_id: 'a' }]);
    expect(m.get('a')).toBe(2);
    expect(m.get('b')).toBe(1);
    expect(m.get('c')).toBeUndefined();
  });
  it('avatar initial is the given name', () => {
    expect(initialOf('Bà nội Lan')).toBe('L');
    expect(initialOf('ông Đức')).toBe('Đ');
    expect(initialOf('  ')).toBe('?');
  });
  it('links to the vault filtered by narrator', () => {
    expect(vaultByNarratorPath('abc')).toBe('/gia-dinh?nguoi-ke=abc');
  });
});

describe('groupAlbum', () => {
  const labels = { unknownNarrator: 'Chưa rõ', untitled: 'Chưa đặt tên' };
  const narrators = [
    { id: 'n1', display_name: 'Bà Lan' },
    { id: 'n2', display_name: 'Ông Tư' },
  ];
  const p = (id: string, story_id: string, narrator_id: string | null, created_at: string, story_title = 'T') => ({ id, story_id, narrator_id, created_at, story_title });
  const photos = [
    p('1', 's1', 'n2', '2026-03-01', 'Chợ quê'),
    p('2', 's2', 'n1', '2026-02-01', ' '),
    p('3', 's1', 'n2', '2026-01-01', 'Chợ quê'),
    p('4', 's3', null, '2026-04-01', 'Mất dấu'),
  ];

  it('groups by narrator in narrator order, unknown last', () => {
    const g = groupAlbum(photos, 'narrator', narrators, labels);
    expect(g.map((x) => [x.label, x.photos.map((y) => y.id)])).toEqual([
      ['Bà Lan', ['2']],
      ['Ông Tư', ['1', '3']],
      ['Chưa rõ', ['4']],
    ]);
  });
  it('groups by story, newest photo first, with fallback titles and story links', () => {
    const g = groupAlbum(photos, 'story', narrators, labels);
    expect(g.map((x) => x.key)).toEqual(['s3', 's1', 's2']);
    expect(g[2]!.label).toBe('Chưa đặt tên');
    expect(g[1]!.storyId).toBe('s1');
  });
  it('filters by narrator', () => {
    const g = groupAlbum(photos, 'story', narrators, labels, 'n2');
    expect(g).toHaveLength(1);
    expect(g[0]!.photos.map((x) => x.id)).toEqual(['1', '3']);
    expect(groupAlbum(photos, 'narrator', narrators, labels, 'nobody')).toEqual([]);
  });
});

describe('readPaged', () => {
  it('reads every page past the 1000-row cap', async () => {
    const all = Array.from({ length: 2500 }, (_, i) => ({ narrator_id: `n${i % 3}` }));
    const res = await readPaged((a, b) => Promise.resolve({ data: all.slice(a, b + 1), error: null }));
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(2500);
    expect(countByNarrator(res.data).get('n0')).toBe(834);
  });
  it('returns the error instead of a silently short list', async () => {
    const res = await readPaged((a) => Promise.resolve(a === 0 ? { data: [1, 2], error: null } : { data: null, error: { message: 'x' } }), 2);
    expect(res.error).toEqual({ message: 'x' });
  });
});
