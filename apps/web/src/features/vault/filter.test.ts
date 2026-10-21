import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  filterStories,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  ilikeOrFilter,
  matchesQuery,
  matchingTopicIds,
  mergeById,
  normalizeForSearch,
  splitHours,
  topicNames,
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

describe('search covers title, topic and reading text (B9)', () => {
  const topics = topicNames([
    { id: 't1', title_vi: 'Món ăn', title_en: 'Food & cooking' },
    { id: '22222222-2222-2222-2222-222222222222', title_vi: 'Làm vườn', title_en: 'Gardening' },
  ]);
  it('matches the topic name in either language, with or without accents', () => {
    expect(matchesQuery(stories[0]!, 'mon an', topics)).toBe(true);
    expect(matchesQuery(stories[0]!, 'cooking', topics)).toBe(true);
    expect(matchesQuery(stories[0]!, 'mon an')).toBe(false);
    expect(filterStories(stories, { ...EMPTY_FILTERS, q: 'món ăn' }, topics).map((x) => x.id)).toEqual(['a']);
  });
  it('matches experience fields as reading text', () => {
    const exp = s({ id: 'e', title: 'Ủ phân', kind: 'experience', fields: { steps: ['Trộn rơm với vôi bột'], cautions: ['Đeo găng tay'] } });
    expect(matchesQuery(exp, 'voi bot')).toBe(true);
    expect(matchesQuery(exp, 'gang tay')).toBe(true);
    expect(matchesQuery(exp, 'recording.webm')).toBe(false);
  });
  it('finds matching topic ids and adds them to the server filter', () => {
    expect(matchingTopicIds(topics, 'vuon')).toEqual(['22222222-2222-2222-2222-222222222222']);
    expect(matchingTopicIds(topics, '  ')).toEqual([]);
    expect(ilikeOrFilter('vườn', ['22222222-2222-2222-2222-222222222222', 'not-a-uuid'])).toBe(
      'title.ilike.*vườn*,summary.ilike.*vườn*,body.ilike.*vườn*,topic_id.in.(22222222-2222-2222-2222-222222222222)',
    );
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
