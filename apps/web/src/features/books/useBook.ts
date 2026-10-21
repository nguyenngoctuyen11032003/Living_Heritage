import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { fetchRecordings } from '@/features/vault/api';
import { fetchStoriesByIds } from '@/features/vault/collectionsApi';
import type { VaultStory } from '@/features/vault/types';
import { fetchBook, fetchChapters, type BookRow } from './api';
import { buildBookPages, chapterParagraphs, type BookPage, type ChapterInput } from './pages';
import { byPosition } from './reorder';

export interface ChapterEntry {
  story_id: string;
  position: number;
  story: VaultStory;
  durationS: number | null;
}

export type BookState = { kind: 'loading' } | { kind: 'error' } | { kind: 'unavailable' } | { kind: 'ready'; book: BookRow; chapters: ChapterEntry[] };

/** Book row + its chapters (stories the reader may see, in position order) + recording durations. */
export function useBook(bookId: string) {
  const [state, setState] = useState<BookState>({ kind: 'loading' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    (async () => {
      const book = await fetchBook(sb, bookId);
      if (!book) return null;
      const rows = byPosition(await fetchChapters(sb, bookId));
      const stories = await fetchStoriesByIds(sb, rows.map((r) => r.story_id));
      const byId = new Map(stories.map((s) => [s.id, s]));
      const recs = await fetchRecordings(sb, stories.map((s) => s.recording_id).filter((x): x is string => !!x)).catch(() => []);
      const dur = new Map(recs.map((r) => [r.id, r.duration_s === null ? null : Number(r.duration_s)]));
      const chapters: ChapterEntry[] = rows
        .filter((r) => byId.has(r.story_id))
        .map((r) => {
          const story = byId.get(r.story_id)!;
          return { ...r, story, durationS: story.recording_id ? (dur.get(story.recording_id) ?? null) : null };
        });
      return { book, chapters };
    })()
      .then((res) => alive && setState(res ? { kind: 'ready', ...res } : { kind: 'unavailable' }))
      .catch(() => alive && setState({ kind: 'error' }));
    return () => {
      alive = false;
    };
  }, [bookId, tick]);

  const reload = useCallback(() => setTick((x) => x + 1), []);
  return { state, setState, reload };
}

/** Pages of the printable book: approved chapters only. */
export function useBookPages(chapters: ChapterEntry[], narratorName: (id: string) => string | undefined): { inputs: ChapterInput[]; pages: BookPage[] } {
  const t = useT('books');
  return useMemo(() => {
    const labels = {
      skill: t('exp.skill'),
      context: t('exp.context'),
      conditions: t('exp.conditions'),
      steps: t('exp.steps'),
      cautions: t('exp.cautions'),
      limits: t('exp.limits'),
    };
    const inputs: ChapterInput[] = chapters
      .filter((c) => c.story.edit_status === 'approved')
      .map((c) => ({
        storyId: c.story_id,
        title: c.story.title.trim() || '—',
        narrator: narratorName(c.story.narrator_id) ?? '',
        paragraphs: chapterParagraphs(c.story, labels),
        durationS: c.story.recording_id ? (c.durationS ?? 0) : null,
      }));
    return { inputs, pages: buildBookPages(inputs) };
  }, [chapters, narratorName, t]);
}
