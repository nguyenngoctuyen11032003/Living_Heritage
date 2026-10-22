import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  filterStories,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  ilikeOrFilter,
  matchesQuery,
  mergeById,
  normalizeForSearch,
  splitHours,
  type SearchableStory,
} from './filter';

const s = (over: Partial<SearchableStory> & { id: string }) => ({
  title: '',
  summary: null,
  body: '',
  narrator_id: 'n1',
  topic_id: 't1',
  edit_status: 'approved' as const,
  kind: 'story' as const,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
});

const stories = [
  s({ id: 'a', title: 'Gói bánh chưng ngày Tết', body: 'Bà kể chuyện đãi đỗ xanh.' }),
  s({ id: 'b', title: 'Ruộng lúa quê nhà', narrator_id: 'n2', topic_id: 't2', edit_status: 'draft' }),
  s({ id: 'c', title: 'Cách ủ phân', kind: 'experience', topic_id: null, summary: 'Ủ phân chuồng cho vườn rau' }),
];

describe('normalizeForSearch', () => {
  it('drops diacritics, đ and extra spaces', () => {
    expect(normalizeForSearch('  Đãi  ĐỖ xanh ')).toBe('dai do xanh');
  });
});

describe('matchesQuery', () => {
  it('matches with or without diacritics, across fields, all words required', () => {
    expect(matchesQuery(stories[0]!, 'banh chung')).toBe(true);
    expect(matchesQuery(stories[0]!, 'bánh CHƯNG')).toBe(true);
    expect(matchesQuery(stories[0]!, 'do xanh tet')).toBe(true);
    expect(matchesQuery(stories[0]!, 'banh pho')).toBe(false);
    expect(matchesQuery(stories[2]!, 'vuon rau')).toBe(true);
    expect(matchesQuery(stories[2]!, '   ')).toBe(true);
  });
});

describe('filterStories', () => {
  it('combines narrator, topic, status, kind and query', () => {
    expect(filterStories(stories, EMPTY_FILTERS).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(filterStories(stories, { ...EMPTY_FILTERS, narratorId: 'n2' }).map((x) => x.id)).toEqual(['b']);
    expect(filterStories(stories, { ...EMPTY_FILTERS, topicId: 'none' }).map((x) => x.id)).toEqual(['c']);
    expect(filterStories(stories, { ...EMPTY_FILTERS, status: 'approved', kind: 'story' }).map((x) => x.id)).toEqual(['a']);
    expect(filterStories(stories, { ...EMPTY_FILTERS, q: 'que nha', status: 'approved' })).toEqual([]);
  });
  it('knows when filters are active', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, kind: 'experience' })).toBe(true);
  });
});

describe('ilikeOrFilter', () => {
  it('builds a safe or-expression', () => {
    expect(ilikeOrFilter('bánh, (chưng)*')).toBe('title.ilike.*bánh chưng*,summary.ilike.*bánh chưng*,body.ilike.*bánh chưng*');
    expect(ilikeOrFilter(' ,%_ ')).toBeNull();
  });
});

describe('url params', () => {
  it('round-trips and rejects unknown enum values', () => {
    const f = { q: 'tết', narratorId: 'n1', topicId: 't2', status: 'draft' as const, kind: 'experience' as const };
    expect(filtersFromParams(filtersToParams(f))).toEqual(f);
    expect(filtersFromParams(new URLSearchParams('trang-thai=bogus&loai=x'))).toEqual(EMPTY_FILTERS);
  });
});

describe('mergeById / splitHours', () => {
  it('dedupes and sorts newest first', () => {
    const a = { id: '1', created_at: '2026-01-01' };
    const b = { id: '2', created_at: '2026-03-01' };
    expect(mergeById([a], [b, a]).map((x) => x.id)).toEqual(['2', '1']);
  });
  it('splits seconds into hours and minutes', () => {
    expect(splitHours(0)).toEqual({ hours: 0, minutes: 0 });
    expect(splitHours(3600 + 125)).toEqual({ hours: 1, minutes: 2 });
  });
});

describe('search by topic name', () => {
  it('matches the topic title when given', () => {
    const topic = (id: string) => (id === 't2' ? 'Nghề nông Farming' : '');
    expect(filterStories(stories, { ...EMPTY_FILTERS, q: 'nghe nong' }, topic).map((x) => x.id)).toEqual(['b']);
    expect(filterStories(stories, { ...EMPTY_FILTERS, q: 'nghe nong' }).length).toBe(0);
    expect(matchesQuery(stories[0]!, 'gia dinh', 'Gia đình')).toBe(true);
  });
});
