// Pilot usage events (B17). Fire-and-forget: `track()` never throws, never awaits in the caller and never sends free
// text — only a fixed event code, an optional pilot participant code (from `?ma=` in the URL) and the app version.
import { getSupabase } from './supabase';

declare const __LH_VERSION__: string | undefined;

export type EventCode =
  | 'topic_start'
  | 'record_start'
  | 'record_stop'
  | 'upload_ok'
  | 'draft_created'
  | 'draft_edit'
  | 'approve'
  | 'search'
  | 'open_result'
  | 'share_request'
  | 'connect_sent'
  | 'help_opened'
  | 'session_end';

const EVENT_CODES: ReadonlySet<string> = new Set<EventCode>([
  'topic_start',
  'record_start',
  'record_stop',
  'upload_ok',
  'draft_created',
  'draft_edit',
  'approve',
  'search',
  'open_result',
  'share_request',
  'connect_sent',
  'help_opened',
  'session_end',
]);

export const PARTICIPANT_KEY = 'lh.participant';
const PARTICIPANT_RE = /^[A-Za-z0-9-]{1,32}$/;

/** Build version sent with each event (vite `define`, falls back to 'dev' in tools that skip it). */
export const APP_VERSION: string = typeof __LH_VERSION__ === 'string' && __LH_VERSION__ ? __LH_VERSION__ : 'dev';

let participant: string | null | undefined;

/**
 * Pilot participant code: `?ma=` on the first page load (validated), remembered for the tab in sessionStorage.
 * Anything that is not 1–32 letters, digits or dashes is ignored, so no free text can ride along.
 */
export function participantCode(): string | null {
  if (participant !== undefined) return participant;
  let code: string | null = null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('ma');
    if (fromUrl && PARTICIPANT_RE.test(fromUrl)) {
      code = fromUrl;
      try {
        sessionStorage.setItem(PARTICIPANT_KEY, code);
      } catch {
        /* storage blocked */
      }
    } else {
      const stored = sessionStorage.getItem(PARTICIPANT_KEY);
      if (stored && PARTICIPANT_RE.test(stored)) code = stored;
    }
  } catch {
    code = null;
  }
  participant = code;
  return code;
}

/** Test hook: forget the cached participant code. */
export function resetEventsForTests(): void {
  participant = undefined;
}

// `log_event` is created by a new migration; until database.types.ts lists it, call rpc through a narrow cast.
type LogEventRpc = (fn: 'log_event', args: { p_code: string; p_participant: string | null; p_version: string }) => PromiseLike<{ error: unknown }>;

/** Record a usage event. Safe to call anywhere (render paths excepted): no await, no throw, no UI effect. */
export function track(code: EventCode): void {
  try {
    if (!EVENT_CODES.has(code)) return;
    const sb = getSupabase();
    if (!sb) return;
    const rpc = sb.rpc.bind(sb) as unknown as LogEventRpc;
    void Promise.resolve(rpc('log_event', { p_code: code, p_participant: participantCode(), p_version: APP_VERSION })).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    /* never let analytics break the app */
  }
}
