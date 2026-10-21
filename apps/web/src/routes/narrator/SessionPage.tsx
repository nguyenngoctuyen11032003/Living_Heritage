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

export default function SessionPage() {
  const t = useT('narrator');
  const { sessionId = '' } = useParams();
  const sb = getSupabase();

  const loaded = useAsync(async () => {
    if (!sb) return null;
    const session = await fetchSession(sb, sessionId);
    if (!session) return null;
    const [narrator, topics, questions, answered, keptBefore] = await Promise.all([
      fetchNarratorById(sb, session.narrator_id),
      fetchTopics(sb, { activeOnly: false }),
      session.topic_id ? fetchQuestions(sb, session.topic_id) : Promise.resolve([]),
      fetchAnsweredQuestionIds(sb, session.id),
      fetchSessionRecordingCount(sb, session.id).catch(() => 0),
    ]);
    if (!narrator) return null;
    return { session, narrator, topic: topics.find((tp) => tp.id === session.topic_id) ?? null, questions, answered, keptBefore };
  }, [sb, sessionId]);

  const data = loaded.status === 'ready' ? loaded.data : null;
  const access = useIsNarratorOrEditor(data?.narrator ?? null);

  if (!sb) return <EmptyState icon={<PlugZap />} title={t('gate.notConfiguredTitle')} description={t('gate.notConfiguredDesc')} />;
  if (loaded.status === 'loading' || access.loading) return <StatusBlock>{t('session.loading')}</StatusBlock>;
  if (loaded.status === 'error') {
    return (
      <EmptyState
        icon={<CircleAlert />}
        title={t('gate.errorTitle')}
        description={t('gate.errorDesc')}
        action={
          <Button size="lg" onClick={loaded.reload}>
            {t('gate.retry')}
          </Button>
        }
      />
    );
  }
  if (!data) {
    return (
      <EmptyState
        icon={<SearchX />}
        title={t('session.notFoundTitle')}
        description={t('session.notFoundDesc')}
        action={
          <ButtonLink to="/ke-chuyen" size="lg">
            {t('session.back')}
          </ButtonLink>
        }
      />
    );
  }
  if (!access.allowed) {
    return (
      <EmptyState
        icon={<Lock />}
        title={t('gate.forbiddenTitle')}
        description={t('gate.forbiddenDesc')}
        action={
          <ButtonLink to="/" size="lg" variant="secondary">
            {t('gate.forbiddenAction')}
          </ButtonLink>
        }
      />
    );
  }
  return <SessionFlow key={data.session.id} {...data} assisted={access.assisted} />;
}
