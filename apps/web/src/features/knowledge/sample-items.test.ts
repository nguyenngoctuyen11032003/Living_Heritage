import { describe, expect, it } from 'vitest';
import { REGIONS, TOPIC_SLUGS } from '@lh/shared';
import { EMPTY_FILTERS } from './filters';
import { getSampleItem, isSampleId, matchSamples, SAMPLE_ITEMS } from './sample-items';
import { sampleToItem } from './types';

describe('illustrative sample items', () => {
  it('has 6–9 bilingual items with mau- ids and valid topic / region / decade', () => {
    expect(SAMPLE_ITEMS.length).toBeGreaterThanOrEqual(6);
    expect(SAMPLE_ITEMS.length).toBeLessThanOrEqual(9);
    const ids = new Set<string>();
    for (const s of SAMPLE_ITEMS) {
      expect(s.id.startsWith('mau-')).toBe(true);
      ids.add(s.id);
      expect((TOPIC_SLUGS as readonly string[]).includes(s.topicSlug)).toBe(true);
      expect(REGIONS).toContain(s.region);
      expect(s.decade % 10).toBe(0);
      for (const bi of [s.title, s.summary, s.body, s.narratorLabel]) {
        expect(bi.vi.trim()).not.toBe('');
        expect(bi.en.trim()).not.toBe('');
      }
      if (s.kind === 'experience') expect(s.experience).toBeDefined();
    }
    expect(ids.size).toBe(SAMPLE_ITEMS.length);
    expect(new Set(SAMPLE_ITEMS.map((s) => s.kind))).toEqual(new Set(['story', 'experience']));
  });

  it('looks up samples by id only for the mau- prefix', () => {
    expect(isSampleId('mau-ca-kho-to')).toBe(true);
    expect(isSampleId('2b1c6f3e-0000-4000-8000-000000000000')).toBe(false);
    expect(getSampleItem('mau-ca-kho-to')?.topicSlug).toBe('mon-an');
    expect(getSampleItem('mau-khong-ton-tai')).toBeNull();
    expect(getSampleItem('ca-kho-to')).toBeNull();
    expect(getSampleItem(undefined)).toBeNull();
  });

  it('matches queries without diacritics and combines filters', () => {
    expect(matchSamples({ ...EMPTY_FILTERS, q: 'tuot la mai' }).map((s) => s.id)).toEqual(['mau-tuot-la-mai']);
    expect(matchSamples({ ...EMPTY_FILTERS, q: 'cá kho' }).map((s) => s.id)).toContain('mau-ca-kho-to');
    const garden = matchSamples({ ...EMPTY_FILTERS, topic: 'lam-vuon' });
    expect(garden.length).toBeGreaterThan(0);
    expect(garden.every((s) => s.topicSlug === 'lam-vuon')).toBe(true);
    expect(matchSamples({ ...EMPTY_FILTERS, topic: 'lam-vuon', region: 'nam', kind: 'story' })).toEqual([]);
    expect(matchSamples({ ...EMPTY_FILTERS, q: 'xyzxyz' })).toEqual([]);
  });

  it('converts to a labelled KnowledgeItem in the chosen language', () => {
    const s = getSampleItem('mau-tuot-la-mai')!;
    const vi = sampleToItem(s, 'vi');
    const en = sampleToItem(s, 'en');
    expect(vi.sample).toBe(true);
    expect(vi.audioPath).toBeNull();
    expect(vi.title).toBe(s.title.vi);
    expect(en.title).toBe(s.title.en);
    expect((en.fields as { steps: string[] }).steps[0]).toBe(s.experience!.steps[0]!.en);
  });
});
