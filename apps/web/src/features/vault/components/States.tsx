import { CloudOff, Lock, RefreshCw } from 'lucide-react';
import { Button, ButtonLink, EmptyState, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';

export function NotConfigured() {
  const t = useT('vault');
  return <EmptyState icon={<CloudOff />} title={t('state.notConfigured')} />;
}

export function LoadError({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const t = useT('vault');
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-3xl border border-terracotta/30 bg-terracotta/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-ink">{message ?? t('state.loadError')}</p>
      <Button variant="secondary" onClick={onRetry} leftIcon={<RefreshCw className="size-4" />}>
        {t('state.retry')}
      </Button>
    </div>
  );
}

/** Safe "not found / no access" page: never reveals the title or any content. */
export function Unavailable({ title, body, backTo, backLabel }: { title?: string; body?: string; backTo: string; backLabel?: string }) {
  const t = useT('vault');
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={<Lock />}
        title={title ?? t('detail.unavailableTitle')}
        description={body ?? t('detail.unavailableBody')}
        action={<ButtonLink to={backTo}>{backLabel ?? t('detail.back')}</ButtonLink>}
      />
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-[1.5rem] bg-paper ring-1 ring-line/80">
          <Skeleton className="h-32 rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingLive() {
  const t = useT('vault');
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {t('state.loading')}
    </p>
  );
}
