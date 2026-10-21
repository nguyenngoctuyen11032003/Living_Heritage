import { CircleAlert, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, ButtonLink, EmptyState } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { StatusBlock, StorytellerGate } from '@/features/storytelling/components';
import { createSession, fetchAllQuestions, fetchTopics, useStoryteller, type NarratorInfo } from '@/features/storytelling/data';
import { pickEasyQuestion } from '@/features/storytelling/questions';
import { elderButton, elderEmpty, useNarratorTitle } from './elder';

const EASY_SLUG = 'goi-y';

type Started = { sessionId: string; questionId: string | null } | 'not-found';

// One in-flight start per narrator+topic, so React's double effects never open two sessions.
const inflight = new Map<string, Promise<Started>>();

async function startSession(sb: Supabase, narrator: NarratorInfo, slug: string): Promise<Started> {
  let topicId: string | null;
  let questionId: string | null = null;
  if (slug === EASY_SLUG) {
    const q = pickEasyQuestion(await fetchAllQuestions(sb));
    topicId = q?.topic_id ?? null;
    questionId = q?.id ?? null;
  } else {
    const topic = (await fetchTopics(sb)).find((tp) => tp.slug === slug);
    if (!topic) return 'not-found';
    topicId = topic.id;
  }
  const sessionId = await createSession(sb, { family_id: narrator.family_id, narrator_id: narrator.id, topic_id: topicId });
  return { sessionId, questionId };
}

export default function TopicStartPage() {
  const t = useT('narrator');
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const ctx = useStoryteller();
  const [state, setState] = useState<'working' | 'not-found' | 'failed'>('working');
  const [attempt, setAttempt] = useState(0);
  useNarratorTitle(t('titles.start'));

  const narrator = ctx.status === 'ready' ? ctx.narrator : null;
  const query = ctx.status === 'ready' ? ctx.query : '';

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !narrator) return;
    const key = `${narrator.id}:${slug}:${attempt}`;
    let promise = inflight.get(key);
    if (!promise) {
      promise = startSession(sb, narrator, slug);
      inflight.set(key, promise);
    }
    let alive = true;
    promise.then(
      (res) => {
        inflight.delete(key);
        if (!alive) return;
        if (res === 'not-found') return setState('not-found');
        const params = new URLSearchParams(query.replace(/^\?/, ''));
        if (res.questionId) params.set('q', res.questionId);
        const qs = params.toString();
        navigate(`/ke-chuyen/phien/${res.sessionId}${qs ? `?${qs}` : ''}`, { replace: true });
      },
      () => {
        inflight.delete(key);
        if (alive) setState('failed');
      },
    );
    return () => {
      alive = false;
    };
  }, [narrator, slug, attempt, query, navigate]);

  if (ctx.status !== 'ready') return <StorytellerGate ctx={ctx} />;

  if (state === 'not-found') {
    return (
      <EmptyState
        className={elderEmpty}
        icon={<SearchX />}
        title={t('start.notFoundTitle')}
        description={t('start.notFoundDesc')}
        action={
          <ButtonLink to={`/ke-chuyen${query}`} size="lg" className={elderButton}>
            {t('start.back')}
          </ButtonLink>
        }
      />
    );
  }
  if (state === 'failed') {
    return (
      <EmptyState
        className={elderEmpty}
        icon={<CircleAlert />}
        title={t('start.failedTitle')}
        description={t('start.failedDesc')}
        action={
          <Button
            size="lg"
            className={elderButton}
            onClick={() => {
              setState('working');
              setAttempt((n) => n + 1);
            }}
          >
            {t('start.retry')}
          </Button>
        }
      />
    );
  }
  return <StatusBlock>{t('start.preparing')}</StatusBlock>;
}
