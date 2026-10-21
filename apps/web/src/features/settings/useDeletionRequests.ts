import type { Database } from '@lh/shared';
import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { REASON_MAX, REASON_MIN, type DeletionFormErrors } from './deletion';

export type DeletionRequestRow = Database['public']['Tables']['deletion_requests']['Row'];

/** Deletion requests the signed-in user sent (RLS: requester or admin reads; we filter to the requester explicitly). */
export function useMyDeletionRequests(familyId?: string | null) {
  const { user } = useSession();
  const [rows, setRows] = useState<DeletionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = sb.from('deletion_requests').select('*').eq('requested_by', user.id);
    if (familyId) q = q.eq('family_id', familyId);
    const { data, error: err } = await q.order('created_at', { ascending: false }).limit(50);
    setError(Boolean(err));
    setRows(data ?? []);
    setLoading(false);
  }, [user, familyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload };
}

/** Turns validation codes into messages. */
export function useDeletionErrorText() {
  const t = useT('settings');
  return (errors: DeletionFormErrors) => ({
    story: errors.story ? t('deletion.errors.storyRequired') : undefined,
    reason:
      errors.reason === 'required'
        ? t('deletion.errors.reasonRequired')
        : errors.reason === 'tooShort'
          ? t('deletion.errors.reasonTooShort', { min: REASON_MIN })
          : errors.reason === 'tooLong'
            ? t('deletion.errors.reasonTooLong', { max: REASON_MAX })
            : undefined,
    confirmed: errors.confirmed ? t('deletion.errors.confirmRequired') : undefined,
    family: errors.family ? t('deletion.errors.familyRequired') : undefined,
  });
}
