// Shared contract (lead-owned): calling the `ai-process` Edge Function and mapping its error codes.
import {
  AI_FUNCTION,
  AiErrorCode,
  AiProcessResponse,
  AiSuggestResponse,
  type AiErrorCode as AiErrorCodeT,
  type AiProcessResponse as AiProcessResponseT,
} from '@lh/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { requireSupabase } from '@/lib/supabase';

export class AiError extends Error {
  constructor(
    public code: AiErrorCodeT,
    public jobId: string | null = null,
  ) {
    super(code);
  }
}

async function invoke(body: Record<string, unknown>): Promise<unknown> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke(AI_FUNCTION, { body });
  if (!error) return data;
  if (error instanceof FunctionsHttpError) {
    let payload: { error?: unknown; job_id?: string } = {};
    try {
      payload = await (error.context as Response).json();
    } catch {
      /* non-JSON body */
    }
    const code = AiErrorCode.safeParse(payload.error);
    throw new AiError(code.success ? code.data : 'internal', payload.job_id ?? null);
  }
  throw new AiError('ai_unavailable');
}

/** Transcribe a stored recording and create draft stories. Safe to call again (idempotent per recording). */
export async function transcribeAndDraft(recordingId: string, lang: 'vi' | 'en' = 'vi'): Promise<AiProcessResponseT> {
  return AiProcessResponse.parse(await invoke({ action: 'transcribe_and_draft', recording_id: recordingId, lang }));
}

export async function suggestQuestions(narratorId: string, topicId: string, lang: 'vi' | 'en' = 'vi'): Promise<string[]> {
  return AiSuggestResponse.parse(await invoke({ action: 'suggest_questions', narrator_id: narratorId, topic_id: topicId, lang })).questions;
}

/** i18n key suffix for an AI error code, e.g. t(`ai.errors.${aiErrorKey(e)}`) in your own namespace. */
export function aiErrorKey(e: unknown): AiErrorCodeT {
  return e instanceof AiError ? e.code : 'internal';
}
