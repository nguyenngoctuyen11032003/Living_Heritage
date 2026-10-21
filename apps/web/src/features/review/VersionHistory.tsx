import type { StoryKind } from '@lh/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Button, Dialog, Skeleton } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { loadVersions, type VersionRow } from './data';
import { DraftEditor } from './DraftEditor';
import { formFromStory } from './fields';

export interface VersionHistoryProps {
  open: boolean;
  onClose: () => void;
  storyId: string;
  kind: StoryKind;
  currentVersion: number;
}

/** story_versions list (newest first) with a read-only view of any version. */
export function VersionHistory({ open, onClose, storyId, kind, currentVersion }: VersionHistoryProps) {
  const t = useT('review');
  const { locale } = useLocale();
  const [rows, setRows] = useState<VersionRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<VersionRow | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const sb = getSupabase();
    if (!open || !sb) return;
    let alive = true;
    setFailed(false);
    loadVersions(sb, storyId).then(
      (r) => alive && setRows(r),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [open, storyId, currentVersion, attempt]);

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={selected ? t('history.version', { v: selected.version }) : t('history.title')} description={selected ? t('history.readOnly') : t('history.description')} size="lg">
      <div aria-live="polite">
        {selected ? (
          <div className="flex flex-col gap-4 pb-4">
            <div>
              <Button variant="ghost" leftIcon={<ChevronLeft className="size-5" aria-hidden="true" />} onClick={() => setSelected(null)}>
                {t('history.back')}
              </Button>
            </div>
            <DraftEditor kind={kind} form={formFromStory({ kind, title: selected.title, summary: selected.summary, body: selected.body, fields: selected.fields })} onChange={() => {}} readOnly />
          </div>
        ) : failed ? (
          <div role="alert" className="flex flex-col items-start gap-3 pb-4">
            <p>{t('history.loadError')}</p>
            <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              {t('page.retry')}
            </Button>
          </div>
        ) : !rows ? (
          <div aria-busy="true" className="flex flex-col gap-2 pb-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="pb-4 text-ink-soft">{t('history.empty')}</p>
        ) : (
          <ol className="flex flex-col gap-2 pb-4">
            {rows.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setSelected(v)}
                  aria-label={t('history.view', { v: v.version })}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-paper px-4 py-2 text-left ring-1 ring-line transition-colors hover:ring-heritage/50"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {t('history.version', { v: v.version })}
                      {v.version === currentVersion && (
                        <Badge size="sm" tone="outline">
                          {t('history.current')}
                        </Badge>
                      )}
                      {v.edit_status === 'approved' && (
                        <Badge size="sm" tone="mint">
                          {v.note === 'assisted' ? t('history.approvedAssisted') : t('history.approved')}
                        </Badge>
                      )}
                    </span>
                    <span className="truncate text-[0.88rem] text-ink-soft">
                      {formatDate(v.created_at, locale)} · {v.title}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-soft" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Dialog>
  );
}
