import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { getPublicItem, relatedItems } from './api';
import { getSampleItem, isSampleId, matchSamples } from './sample-items';
import { sampleToItem, type KnowledgeItem } from './types';

export type ItemStatus = 'loading' | 'ready' | 'not-found' | 'error' | 'not-configured';

/** One public item (or an illustrative 'mau-' sample) plus up to 3 related items of the same topic. */
export function useKnowledgeItem(id: string | undefined): { status: ItemStatus; item: KnowledgeItem | null; related: KnowledgeItem[]; retry: () => void } {
  const { locale } = useLocale();
  const sb = getSupabase();
  const sample = isSampleId(id);
  const [nonce, setNonce] = useState(0);
  const [live, setLive] = useState<{ id: string; status: ItemStatus; item: KnowledgeItem | null }>({ id: '', status: 'loading', item: null });
  const [related, setRelated] = useState<{ id: string; items: KnowledgeItem[] }>({ id: '', items: [] });

  const sampleState = useMemo(() => {
    if (!sample) return null;
    const s = getSampleItem(id);
    if (!s) return { status: 'not-found' as const, item: null, related: [] };
    const item = sampleToItem(s, locale);
    const rel = matchSamples({ q: '', topic: null, kind: null, region: null, decade: null })
      .filter((x) => x.id !== s.id)
      .sort((a, b) => Number(b.topicSlug === s.topicSlug) - Number(a.topicSlug === s.topicSlug))
      .slice(0, 3)
      .map((x) => sampleToItem(x, locale));
    return { status: 'ready' as const, item, related: rel };
  }, [sample, id, locale]);

  useEffect(() => {
    if (sample || !sb || !id) return;
    let alive = true;
    setLive({ id, status: 'loading', item: null });
    getPublicItem(sb, id)
      .then((item) => {
        if (!alive) return;
        setLive({ id, status: item ? 'ready' : 'not-found', item });
        if (item) {
          relatedItems(sb, item)
            .then((items) => alive && setRelated({ id, items }))
            .catch(() => alive && setRelated({ id, items: [] }));
        }
      })
      .catch(() => alive && setLive({ id, status: 'error', item: null }));
    return () => {
      alive = false;
    };
  }, [sample, sb, id, nonce]);

  const retry = () => setNonce((n) => n + 1);
  if (sampleState) return { ...sampleState, retry };
  if (!id) return { status: 'not-found', item: null, related: [], retry };
  if (!sb) return { status: 'not-configured', item: null, related: [], retry };
  if (live.id !== id) return { status: 'loading', item: null, related: [], retry };
  return { status: live.status, item: live.item, related: related.id === id ? related.items : [], retry };
}
