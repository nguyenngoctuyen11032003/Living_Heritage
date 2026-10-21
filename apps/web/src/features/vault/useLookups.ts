import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { fetchNarrators, fetchTopics } from './api';
import type { NarratorLite, TopicLite } from './types';

export interface VaultLookups {
  narrators: NarratorLite[];
  topics: TopicLite[];
  narratorById: Map<string, NarratorLite>;
  topicById: Map<string, TopicLite>;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/** Narrators of the family and the seeded topics (for filters, card labels and chapter lines). */
export function useVaultLookups(familyId: string | null | undefined): VaultLookups {
  const [narrators, setNarrators] = useState<NarratorLite[]>([]);
  const [topics, setTopics] = useState<TopicLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !familyId) return;
    let alive = true;
    setLoading(true);
    Promise.all([fetchNarrators(sb, familyId), fetchTopics(sb)])
      .then(([n, tp]) => {
        if (!alive) return;
        setNarrators(n);
        setTopics(tp);
        setError(false);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [familyId, tick]);

  const reload = useCallback(() => setTick((x) => x + 1), []);
  const narratorById = useMemo(() => new Map(narrators.map((n) => [n.id, n])), [narrators]);
  const topicById = useMemo(() => new Map(topics.map((tp) => [tp.id, tp])), [topics]);
  return { narrators, topics, narratorById, topicById, loading, error, reload };
}
