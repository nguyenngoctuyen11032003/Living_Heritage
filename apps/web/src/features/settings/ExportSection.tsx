import { CircleAlert, CircleCheck, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import type { FamilySummary } from '@/features/families/current';
import { ErrorNotice, SectionCard } from '@/features/families/states';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { collectFamilyExport, downloadJson, EXPORT_TABLES, exportFileName, initialProgress, type ExportProgress, type TableProgress } from './exportData';

const ROWS = [...EXPORT_TABLES, 'files'] as const;

export function ExportSection({ family }: { family: FamilySummary }) {
  const t = useT('settings');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [fileName, setFileName] = useState('');

  async function run() {
    const sb = getSupabase();
    if (!sb) return;
    setPhase('working');
    setProgress(initialProgress());
    try {
      const doc = await collectFamilyExport(sb, family, (table, p) => setProgress((prev) => ({ ...(prev ?? initialProgress()), [table]: p })));
      const name = exportFileName(family.name);
      downloadJson(doc, name);
      setFileName(name);
      setPhase('done');
    } catch {
      setPhase('error');
    }
  }

  function statusText(table: (typeof ROWS)[number], p: TableProgress) {
    if (p.status === 'pending') return t('export.statusPending');
    if (p.status === 'loading') return t('export.statusLoading');
    if (p.status === 'error') return t('export.statusError');
    return table === 'files' ? t('export.filesDone', { n: p.count }) : t('export.statusDone', { n: p.count });
  }

  return (
    <SectionCard title={t('export.title')} description={t('export.body')}>
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-2 text-[0.95rem] leading-relaxed text-ink-soft">
          <li>{t('export.filesNote')}</li>
          <li className="font-medium text-ink">{t('export.outsideNote')}</li>
        </ul>
        <div>
          <Button onClick={() => void run()} loading={phase === 'working'} leftIcon={<Download className="size-4" aria-hidden="true" />}>
            {phase === 'done' || phase === 'error' ? t('export.again') : t('export.start')}
          </Button>
        </div>

        <div aria-live="polite" className="min-h-6">
          {phase === 'working' && <p className="text-ink-soft">{t('export.working')}</p>}
          {phase === 'done' && (
            <p className="flex items-center gap-2 font-medium text-heritage-deep">
              <CircleCheck className="size-5" aria-hidden="true" />
              {t('export.done', { file: fileName })}
            </p>
          )}
        </div>
        {phase === 'error' && <ErrorNotice message={t('export.failed')} onRetry={() => void run()} />}

        {progress && (
          <div>
            <h3 className="mb-2 font-semibold text-ink">{phase === 'done' ? t('export.summary') : t('export.progressLabel')}</h3>
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {ROWS.map((table) => {
                const p = progress[table];
                return (
                  <li key={table} className="flex min-h-9 items-center justify-between gap-3 border-b border-line/70 py-1">
                    <span className="min-w-0 text-ink">{t(`export.tables.${table}`)}</span>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 text-[0.9rem] tabular-nums',
                        p.status === 'done' ? 'text-heritage-deep' : p.status === 'error' ? 'text-terracotta' : 'text-ink-soft',
                      )}
                    >
                      {p.status === 'loading' && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                      {p.status === 'error' && <CircleAlert className="size-4" aria-hidden="true" />}
                      {statusText(table, p)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
