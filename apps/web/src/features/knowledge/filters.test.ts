import { describe, expect, it } from 'vitest';
import { activeFilterCount, EMPTY_FILTERS, filtersFromParams, filtersToParams, sameFilters, toSearchArgs, type KnowledgeFilters } from './filters';

const full: KnowledgeFilters = { q: 'tuốt lá mai', topic: 'lam-vuon', kind: 'experience', region: 'nam', decade: 1980 };

describe('knowledge filters <-> URL params', () => {
  it('writes Vietnamese param names and slugs', () => {
    expect(filtersToParams(full).toString()).toBe('q=tu%E1%BB%91t+l%C3%A1+mai&chu-de=lam-vuon&loai=kinh-nghiem&vung=nam&thap-nien=1980');
  });

  it('round-trips every filter', () => {
    expect(filtersFromParams(filtersToParams(full))).toEqual(full);
    const story: KnowledgeFilters = { ...EMPTY_FILTERS, kind: 'story' };
    expect(filtersFromParams(filtersToParams(story))).toEqual(story);
  });

  it('omits empty values and trims the query', () => {
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe('');
    expect(filtersToParams({ ...EMPTY_FILTERS, q: '   ' }).toString()).toBe('');
    expect(filtersToParams({ ...EMPTY_FILTERS, q: '  kho cá ' }).get('q')).toBe('kho cá');
  });

  it('ignores malformed values', () => {
    const f = filtersFromParams(new URLSearchParams('loai=video&vung=tay&thap-nien=1975&chu-de=Bad%20Slug!'));
    expect(f).toEqual(EMPTY_FILTERS);
    expect(filtersFromParams(new URLSearchParams('thap-nien=1890')).decade).toBeNull();
  });

  it('accepts English kind values and the legacy ?topic= alias used by the footer', () => {
    const f = filtersFromParams(new URLSearchParams('topic=mon-an&loai=story'));
    expect(f.topic).toBe('mon-an');
    expect(f.kind).toBe('story');
    expect(filtersFromParams(new URLSearchParams('chu-de=lam-vuon&topic=mon-an')).topic).toBe('lam-vuon');
  });

  it('counts active filters and compares ignoring whitespace in q', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount(full)).toBe(5);
    expect(sameFilters({ ...full, q: 'tuốt lá mai ' }, full)).toBe(true);
    expect(sameFilters({ ...full, region: 'bac' }, full)).toBe(false);
  });

  it('maps to search_public args, leaving nulls out', () => {
    expect(toSearchArgs(EMPTY_FILTERS, 0, 12)).toEqual({ lim: 12, off: 0 });
    expect(toSearchArgs(full, 24, 12)).toEqual({ q: 'tuốt lá mai', p_topic: 'lam-vuon', p_kind: 'experience', p_region: 'nam', p_decade: 1980, lim: 12, off: 24 });
  });
});
