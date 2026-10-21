import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { hubIsEmpty, PAGE_SIZE, searchPublic } from './api';
import { filtersKey, type KnowledgeFilters } from './filters';
import { matchSamples } from './sample-items';
import { sampleToItem, type KnowledgeItem } from './types';

export type HubMode = 'checking' | 'live' | 'sample' | 'error';

export interface KnowledgeSearchState {
  /** live = real public items; sample = the hub is empty (or not configured) → illustrative set. */
  mode: HubMode;
  notConfigured: boolean;
  loading: boolean;
  error: boolean;
  items: KnowledgeItem[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
  loadMore: () => void;
  retry: () => void;
}

interface LiveState {
  key: string;
  status: 'loading' | 'ready' | 'error';
  items: KnowledgeItem[];
  hasMore: boolean;
}

/** search_public with the given filters; falls back to the labelled illustrative set when the hub is empty. */
export function useKnowledgeSearch(filters: KnowledgeFilters): KnowledgeSearchState {
  const sb = getSupabase();
  const { locale } = useLocale();
  const [nonce, setNonce] = useState(0);
  const [hub, setHub] = useState<HubMode>(sb ? 'checking' : 'sample');
  const [live, setLive] = useState<LiveState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const key = filtersKey(filters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // 1. Is there any public item at all?
  useEffect(() => {
    if (!sb) return;
    let alive = true;
    setHub('checking');
    hubIsEmpty(sb)
      .then((empty) => alive && setHub(empty ? 'sample' : 'live'))
      .catch(() => alive && setHub('error'));
    return () => {
      alive = false;
    };
  }, [sb, nonce]);

  // 2. Live search (first page) whenever the filters change.
  useEffect(() => {
    if (!sb || hub !== 'live') return;
    let alive = true;
    setLive((prev) => ({ key, status: 'loading', items: prev?.key === key ? prev.items : [], hasMore: false }));
    setLoadMoreError(false);
    searchPublic(sb, filtersRef.current, 0, PAGE_SIZE)
      .then((rows) => alive && setLive({ key, status: 'ready', items: rows, hasMore: rows.length === PAGE_SIZE }))
      .catch(() => alive && setLive({ key, status: 'error', items: [], hasMore: false }));
    return () => {
      alive = false;
    };
  }, [sb, hub, key, nonce]);

  const loadMore = useCallback(() => {
    if (!sb || !live || live.status !== 'ready' || loadingMore) return;
    const currentKey = live.key;
    setLoadingMore(true);
    setLoadMoreError(false);
    searchPublic(sb, filtersRef.current, live.items.length, PAGE_SIZE)
      .then((rows) => {
        setLive((prev) => {
          if (!prev || prev.key !== currentKey) return prev;
          const seen = new Set(prev.items.map((i) => i.id));
          return { ...prev, items: [...prev.items, ...rows.filter((r) => !seen.has(r.id))], hasMore: rows.length === PAGE_SIZE };
        });
      })
      .catch(() => setLoadMoreError(true))
      .finally(() => setLoadingMore(false));
  }, [sb, live, loadingMore]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  const samples = useMemo(() => (hub === 'sample' ? matchSamples(filters).map((s) => sampleToItem(s, locale)) : []), [hub, filters, locale]);

  if (hub === 'sample') {
    return { mode: 'sample', notConfigured: !sb, loading: false, error: false, items: samples, hasMore: false, loadingMore: false, loadMoreError: false, loadMore, retry };
  }
  const current = live && live.key === key ? live : null;
  return {
    mode: hub,
    notConfigured: false,
    loading: hub === 'checking' || !current || current.status === 'loading',
    error: hub === 'error' || current?.status === 'error',
    items: current?.items ?? [],
    hasMore: current?.status === 'ready' && current.hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
    retry,
  };
}
