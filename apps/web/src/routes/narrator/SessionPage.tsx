import { CircleAlert, Lock, PlugZap, SearchX } from 'lucide-react';
import { useParams } from 'react-router';
import { Button, ButtonLink, EmptyState } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { StatusBlock } from '@/features/storytelling/components';
import {
  fetchAnsweredQuestionIds,
  fetchNarratorById,
  fetchQuestions,
  fetchSession,
  fetchSessionRecordingCount,
  fetchTopics,
  useAsync,
  useIsNarratorOrEditor,
} from '@/features/storytelling/data';
import { SessionFlow } from '@/features/storytelling/SessionFlow';
import { elderButton, elderEmpty, useNarratorTitle } from './elder';

export default function SessionPage() {
  const t = useT('narrator');
  const { sessionId = '' } = useParams();
  const sb = getSupabase();
  useNarratorTitle(t('titles.session'));

  const loaded = useAsync(async () => {
    if (!sb) return null;
    const session = await fetchSession(sb, sessionId);
    if (!session) return null;
    const [narrator, topics, questions, answered, keptBefore] = await Promise.all([
      fetchNarratorById(sb, session.narrator_id),
      fetchTopics(sb),
      session.topic_id ? fetchQuestions(sb, session.topic_id) : Promise.resolve([]),
      fetchAnsweredQuestionIds(sb, session.id),
      fetchSessionRecordingCount(sb, session.id).catch(() => 0),
    ]);
    if (!narrator) return null;
    return { session, narrator, topic: topics.find((tp) => tp.id === session.topic_id) ?? null, questions, answered, keptBefore };
  }, [sb, sessionId]);

  const data = loaded.status === 'ready' ? loaded.data : null;
  const access = useIsNarratorOrEditor(data?.narrator ?? null);

  if (!sb) return <EmptyState className={elderEmpty} icon={<PlugZap />} title={t('gate.notConfiguredTitle')} description={t('gate.notConfiguredDesc')} />;
  if (loaded.status === 'loading' || access.loading) return <StatusBlock>{t('session.loading')}</StatusBlock>;
  if (loaded.status === 'error') {
    return (
      <EmptyState
        className={elderEmpty}
        icon={<CircleAlert />}
        title={t('gate.errorTitle')}
        description={t('gate.errorDesc')}
        action={
          <Button size="lg" className={elderButton} onClick={loaded.reload}>
            {t('gate.retry')}
          </Button>
        }
      />
    );
  }
  if (!data) {
    return (
      <EmptyState
        className={elderEmpty}
        icon={<SearchX />}
        title={t('session.notFoundTitle')}
        description={t('session.notFoundDesc')}
        action={
          <ButtonLink to="/ke-chuyen" size="lg" className={elderButton}>
            {t('session.back')}
          </ButtonLink>
        }
      />
    );
  }
  if (!access.allowed) {
    return (
      <EmptyState
        className={elderEmpty}
        icon={<Lock />}
        title={t('gate.forbiddenTitle')}
        description={t('gate.forbiddenDesc')}
        action={
          <ButtonLink to="/" size="lg" className={elderButton} variant="secondary">
            {t('gate.forbiddenAction')}
          </ButtonLink>
        }
      />
    );
  }
  return <SessionFlow key={data.session.id} {...data} assisted={access.assisted} />;
}
