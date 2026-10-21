import { ExternalLink, Inbox, RefreshCw, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

/** Loading / error / empty wrapper for one admin list. */
export function ListState({
  status,
  empty,
  emptyTitle,
  emptyBody,
  onRetry,
  children,
}: {
  status: 'loading' | 'ready' | 'error';
  empty: boolean;
  emptyTitle: string;
  emptyBody: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  const t = useT('admin');
  if (status === 'error') {
    return (
      <div role="alert">
        <EmptyState
          title={t('states.loadError')}
          action={
            <Button onClick={onRetry} leftIcon={<RotateCcw aria-hidden="true" className="size-5" />}>
              {t('states.retry')}
            </Button>
          }
        />
      </div>
    );
  }
  if (status === 'loading' && empty) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[1.5rem] bg-paper p-6 ring-1 ring-line">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-6 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (empty) return <EmptyState icon={<Inbox />} title={emptyTitle} description={emptyBody} />;
  return <div className={cn(status === 'loading' && 'opacity-60 transition-opacity')}>{children}</div>;
}

export function ListHeader({ count, onRefresh, loading, children }: { count: number | null; onRefresh: () => void; loading: boolean; children?: ReactNode }) {
  const t = useT('admin');
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-4">{children}</div>
      <div className="flex items-center gap-3">
        <p aria-live="polite" className="text-[0.9rem] text-ink-soft">
          {count === null ? '' : count === 1 ? t('common.countOne') : t('common.count', { n: count })}
        </p>
        <Button variant="secondary" onClick={onRefresh} loading={loading} leftIcon={<RefreshCw aria-hidden="true" className="size-5" />}>
          {t('common.refresh')}
        </Button>
      </div>
    </div>
  );
}

export function ItemLink({ id, title }: { id: string | null; title: string | undefined }) {
  const t = useT('admin');
  if (!id) return <span className="text-[0.9rem] italic text-ink-soft">{t('common.itemRemoved')}</span>;
  return (
    <Link to={`/tri-thuc/${id}`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-heritage underline-offset-4 [overflow-wrap:anywhere] hover:underline">
      {title ? `“${title}”` : t('common.openItem')}
      <ExternalLink aria-hidden="true" className="size-4" />
    </Link>
  );
}

export function StatusPill({ tone, children }: { tone: 'open' | 'done' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[0.875rem] font-semibold',
        tone === 'open' && 'bg-[#fbecc8] text-[#6b4a0c]',
        tone === 'done' && 'bg-mint text-heritage-deep',
        tone === 'muted' && 'bg-[#efe9dc] text-ink-soft',
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
