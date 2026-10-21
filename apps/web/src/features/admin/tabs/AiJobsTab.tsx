import { useT } from '@/i18n';
import type { Supabase } from '@/lib/supabase';
import { parseAiError } from '../access';
import { useDateTime } from '../format';
import { ListHeader, ListState, StatusPill } from '../shared';
import { must, useAdminQuery } from '../useAdminQuery';

async function loadJobs(sb: Supabase) {
  return must(
    await sb
      .from('ai_jobs')
      .select('id, kind, error, attempts, recording_id, updated_at')
      .eq('status', 'error')
      .order('updated_at', { ascending: false })
      .limit(50),
  );
}

export function AiJobsTab() {
  const t = useT('admin');
  const dt = useDateTime();
  const q = useAdminQuery('ai-jobs', loadJobs);
  const rows = q.data ?? [];
  return (
    <div>
      <ListHeader count={q.status === 'ready' ? rows.length : null} onRefresh={q.reload} loading={q.status === 'loading'} />
      <ListState status={q.status} empty={rows.length === 0} emptyTitle={t('aiJobs.emptyTitle')} emptyBody={t('aiJobs.emptyBody')} onRetry={q.reload}>
        <ul className="flex flex-col gap-3">
          {rows.map((job) => {
            const { code, detail } = parseAiError(job.error);
            return (
              <li key={job.id} className="flex flex-wrap items-start justify-between gap-3 rounded-[1.25rem] bg-paper p-5 ring-1 ring-line">
                <div className="min-w-0 text-[0.9rem] text-ink-soft">
                  <p className="text-[1rem] font-semibold text-ink">
                    {t(`aiJobs.codes.${code}`)} <code className="ml-1 rounded-md bg-cream px-1.5 py-0.5 text-[0.8rem] text-ink-soft">{code}</code>
                  </p>
                  {detail && <p className="mt-1 break-words">{t('aiJobs.detail', { detail })}</p>}
                  <p className="mt-1">
                    {t('aiJobs.kind', { kind: job.kind })} · {t('aiJobs.recording', { id: job.recording_id.slice(0, 8) })}
                  </p>
                  <p className="mt-0.5">{t('aiJobs.updatedAt', { time: dt(job.updated_at) })}</p>
                </div>
                <StatusPill tone="open">{t('aiJobs.attempts', { n: job.attempts })}</StatusPill>
              </li>
            );
          })}
        </ul>
      </ListState>
    </div>
  );
}
