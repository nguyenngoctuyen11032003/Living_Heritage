import { describe, expect, it } from 'vitest';
import { getSampleItem, matchSamples } from '@/features/knowledge/sample-items';
import { KNOWLEDGE_PREVIEW_IDS, previewItems, SAMPLE_STORY } from './sample-data';

describe('landing sample data', () => {
  it('sample story is a 30–60 s excerpt of a real illustrative hub item, verbatim', () => {
    expect(SAMPLE_STORY.duration).toBeGreaterThanOrEqual(30);
    expect(SAMPLE_STORY.duration).toBeLessThanOrEqual(60);
    const item = getSampleItem(SAMPLE_STORY.itemId);
    expect(item).not.toBeNull();
    for (const line of SAMPLE_STORY.lines) {
      expect(line.t).toBeLessThan(SAMPLE_STORY.duration);
      expect(item!.body.vi).toContain(line.text.vi);
      expect(item!.body.en).toContain(line.text.en);
    }
  });

  it('knowledge preview resolves 3–6 hub samples covering cooking, gardening and crafts', () => {
    const items = previewItems();
    expect(items).toHaveLength(KNOWLEDGE_PREVIEW_IDS.length);
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(6);
    const topics = new Set(items.map((i) => i.topicSlug));
    for (const slug of ['mon-an', 'lam-vuon', 'nghe-nghiep']) expect(topics.has(slug)).toBe(true);
  });

  it('every search suggestion in the placeholder finds at least one sample', () => {
    for (const q of ['cá kho', 'tuốt lá mai', 'đan rổ', 'braised fish', 'mai leaves', 'bamboo basket']) {
      expect(matchSamples({ q, topic: null, kind: null, region: null, decade: null }).length, q).toBeGreaterThan(0);
    }
  });
});
