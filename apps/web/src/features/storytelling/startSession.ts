// Opening a storytelling session from a topic tile (or "Chưa biết kể gì").
import { track } from '@/lib/events';
import type { Supabase } from '@/lib/supabase';
import { createSession, fetchAllQuestions, fetchTopics, type NarratorInfo } from './data';
import { pickEasyQuestion } from './questions';

export const EASY_SLUG = 'goi-y';

export type Started = { sessionId: string; questionId: string | null } | 'not-found';

export async function startSession(sb: Supabase, narrator: NarratorInfo, slug: string): Promise<Started> {
  let topicId: string | null;
  let questionId: string | null = null;
  if (slug === EASY_SLUG) {
    // Only questions of topics that are still offered (a disabled topic keeps its active questions).
    const [questions, topics] = await Promise.all([fetchAllQuestions(sb), fetchTopics(sb)]);
    const live = new Set(topics.map((tp) => tp.id));
    const q = pickEasyQuestion(questions.filter((x) => live.has(x.topic_id)));
    topicId = q?.topic_id ?? null;
    questionId = q?.id ?? null;
  } else {
    const topic = (await fetchTopics(sb)).find((tp) => tp.slug === slug);
    if (!topic) return 'not-found';
    topicId = topic.id;
  }
  const sessionId = await createSession(sb, { family_id: narrator.family_id, narrator_id: narrator.id, topic_id: topicId });
  // Once per created session (the in-flight map keeps React's double effects from starting a second one).
  track('topic_start');
  return { sessionId, questionId };
}
