import { Trash2 } from 'lucide-react';
import { Badge, EmptyState, Skeleton, type BadgeTone } from '@/components/ui';
import { ErrorNotice } from '@/features/families/states';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { deletionStatus, describeDeletionRow, type DeletionScope, type DeletionStatus } from './deletion';
import type { DeletionRequestRow } from './useDeletionRequests';

const STATUS_TONE: Record<DeletionStatus, BadgeTone> = { open: 'warning', processing: 'heritage', done: 'mint', rejected: 'terracotta', unknown: 'outline' };
const SCOPE_KEY: Record<DeletionScope, 'deletion.scopeFamily' | 'deletion.scopeStory' | 'deletion.scopeAccount'> = {
  family: 'deletion.scopeFamily',
  story: 'deletion.scopeStory',
  account: 'deletion.scopeAccount',
};

export function DeletionRequestList({
  rows,
  loading,
  error,
  onRetry,
  storyTitles,
  only,
}: {
  rows: DeletionRequestRow[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  storyTitles?: ReadonlyMap<string, string>;
  /** Show only rows of these scopes. */
  only?: DeletionScope[];
}) {
  const t = useT('settings');
  const { locale } = useLocale();
  if (loading)
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  if (error) return <ErrorNotice message={t('states.loadError')} onRetry={onRetry} />;
  const items = rows.map((r) => ({ row: r, ...describeDeletionRow(r) })).filter((r) => !only || only.includes(r.scope));
  if (items.length === 0) return <EmptyState icon={<Trash2 />} title={t('deletion.emptyTitle')} description={t('deletion.emptyBody')} />;
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ row, scope, reason }) => {
        const status = deletionStatus(row.status);
        const storyTitle = row.story_id ? storyTitles?.get(row.story_id) : undefined;
        return (
          <li key={row.id} className="rounded-2xl bg-cream p-4 ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[status]} dot>
                {t(`deletion.status.${status}`)}
              </Badge>
              <span className="font-semibold text-ink">
                {t(SCOPE_KEY[scope])}
                {storyTitle ? `: ${storyTitle}` : ''}
              </span>
            </div>
            {reason && <p className="mt-2 whitespace-pre-line break-words leading-relaxed text-ink-soft">{reason}</p>}
            <p className="mt-2 text-[0.85rem] text-ink-soft">
              {t('deletion.sentAt', { date: formatDate(row.created_at, locale) })}
              {row.resolved_at ? ` · ${t('deletion.resolvedAt', { date: formatDate(row.resolved_at, locale) })}` : ''}
            </p>
            {row.admin_note && <p className="mt-1 break-words text-[0.9rem] text-ink">{t('deletion.teamNote', { note: row.admin_note })}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** Native checkbox with a wrapping label and an optional announced error. */
export function ConfirmCheckbox({ checked, onChange, label, error }: { checked: boolean; onChange: (v: boolean) => void; label: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex cursor-pointer items-start gap-3 leading-relaxed text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          className="mt-1 size-5 shrink-0 accent-heritage"
        />
        <span>{label}</span>
      </label>
      {error && (
        <p role="alert" className="text-[0.82rem] font-medium text-terracotta">
          {error}
        </p>
      )}
    </div>
  );
}
