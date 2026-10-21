import { useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';
import { latestJob, type AiJobRow } from './data';

export const JOB_POLL_MS = 3000;

/** Polls the latest ai_jobs row of a recording every 3 s while `enabled`. Network errors are ignored (next tick retries). */
export function useJobPolling(recordingId: string | null, enabled: boolean, onJob: (job: AiJobRow | null) => void): void {
  const cb = useRef(onJob);
  useEffect(() => {
    cb.current = onJob;
  }, [onJob]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !recordingId || !enabled) return;
    let alive = true;
    const tick = async () => {
      try {
        const job = await latestJob(sb, recordingId);
        if (alive) cb.current(job);
      } catch {
        /* keep polling */
      }
    };
    const timer = window.setInterval(() => void tick(), JOB_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [recordingId, enabled]);
}
