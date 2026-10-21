// Contract between the web app and the Edge Function `ai-process` (spec 1 §8).
// supabase/functions/_shared/ai-contract.ts is a byte-identical copy (imports only zod).
import { z } from 'zod';

export const AiLang = z.enum(['vi', 'en']);

export const AiRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('transcribe_and_draft'), recording_id: z.uuid(), lang: AiLang.default('vi') }),
  z.object({ action: z.literal('suggest_questions'), narrator_id: z.uuid(), topic_id: z.uuid(), lang: AiLang.default('vi') }),
]);
export type AiRequest = z.input<typeof AiRequest>;

export const ExperienceFields = z.object({
  skill: z.string(),
  context: z.string().nullable(),
  conditions: z.array(z.string()),
  steps: z.array(z.string()),
  cautions: z.array(z.string()),
  limits: z.string().nullable(),
});
export type ExperienceFields = z.infer<typeof ExperienceFields>;

/** What Gemini must return for a transcript (responseSchema mirrors this). */
export const AiDraft = z.object({
  story: z.object({ title: z.string(), body: z.string() }),
  experience: z.object({ title: z.string(), summary: z.string(), fields: ExperienceFields }).nullable(),
  topics: z.array(z.string()),
  uncertain: z.array(z.string()),
});
export type AiDraft = z.infer<typeof AiDraft>;

export const AiErrorCode = z.enum([
  'unauthorized',
  'forbidden',
  'not_found',
  'bad_request',
  'quota_exceeded',
  'audio_too_large',
  'ai_unavailable',
  'internal',
]);
export type AiErrorCode = z.infer<typeof AiErrorCode>;

export const AiProcessResponse = z.object({
  job_id: z.uuid(),
  status: z.enum(['queued', 'transcribing', 'drafting', 'done', 'error']),
  story_ids: z.array(z.uuid()).default([]),
  error: AiErrorCode.nullable().default(null),
});
export type AiProcessResponse = z.infer<typeof AiProcessResponse>;

export const AiSuggestResponse = z.object({ questions: z.array(z.string()).max(5) });
export type AiSuggestResponse = z.infer<typeof AiSuggestResponse>;
