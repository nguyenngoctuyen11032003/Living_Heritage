// Topics for the hub: live list from the `topics` table with a static fallback (matches the seed migration),
// plus the visual identity (colour band + illustration) for each topic.
import { useEffect, useState } from 'react';
import type { SceneKind } from '@/components/illustrations/scenes';
import { getSupabase } from '@/lib/supabase';
import type { Bi } from './sample-items';

export interface HubTopic {
  slug: string;
  title: Bi;
}

export const STATIC_TOPICS: readonly HubTopic[] = [
  { slug: 'tuoi-tho', title: { vi: 'Tuổi thơ', en: 'Childhood' } },
  { slug: 'gia-dinh', title: { vi: 'Gia đình', en: 'Family' } },
  { slug: 'que-huong', title: { vi: 'Quê hương', en: 'Hometown' } },
  { slug: 'nghe-nghiep', title: { vi: 'Nghề nghiệp', en: 'Work & craft' } },
  { slug: 'mon-an', title: { vi: 'Món ăn', en: 'Food & cooking' } },
  { slug: 'lam-vuon', title: { vi: 'Làm vườn', en: 'Gardening' } },
];

export interface TopicStyle {
  /** Band background. */
  band: string;
  /** Motif stroke / kicker colour on the band. */
  ink: string;
  /** Soft wash used on the detail hero. */
  wash: string;
  scene: SceneKind;
}

const STYLES: Record<string, TopicStyle> = {
  'tuoi-tho': { band: '#E9C9A0', ink: '#7A3E1D', wash: '#F6E9D6', scene: 'lantern' },
  'gia-dinh': { band: '#D9B8A8', ink: '#6B2E22', wash: '#F4E6DF', scene: 'tet' },
  'que-huong': { band: '#BFD3C1', ink: '#1F4A3D', wash: '#E8F0E6', scene: 'field' },
  'nghe-nghiep': { band: '#C9C2D8', ink: '#3B3360', wash: '#ECE9F2', scene: 'pottery' },
  'mon-an': { band: '#EBC08F', ink: '#7C3A12', wash: '#F8EBDA', scene: 'kitchen' },
  'lam-vuon': { band: '#C6D9A8', ink: '#2F5122', wash: '#EDF3E2', scene: 'garden' },
};

const DEFAULT_STYLE: TopicStyle = { band: '#DCE8D5', ink: '#163A31', wash: '#F1F5EC', scene: 'porch' };

export function topicStyle(slug: string | null | undefined): TopicStyle {
  return (slug && STYLES[slug]) || DEFAULT_STYLE;
}

export function findTopic(topics: readonly HubTopic[], slug: string | null | undefined): HubTopic | null {
  if (!slug) return null;
  return topics.find((t) => t.slug === slug) ?? STATIC_TOPICS.find((t) => t.slug === slug) ?? null;
}

let cache: HubTopic[] | null = null;

/** Topics ordered by `sort`; starts with the static list and swaps in the DB list when it loads. */
export function useTopics(): HubTopic[] {
  const [topics, setTopics] = useState<HubTopic[]>(cache ?? [...STATIC_TOPICS]);
  useEffect(() => {
    if (cache) return;
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    void sb
      .from('topics')
      .select('slug, title_vi, title_en, sort')
      .order('sort')
      .then(({ data }) => {
        if (!alive || !data || data.length === 0) return;
        cache = data.map((r) => ({ slug: r.slug, title: { vi: r.title_vi, en: r.title_en } }));
        setTopics(cache);
      });
    return () => {
      alive = false;
    };
  }, []);
  return topics;
}
