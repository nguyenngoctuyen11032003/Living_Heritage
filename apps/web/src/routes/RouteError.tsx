import { CircleAlert, Home, RefreshCw } from 'lucide-react';
import { useRouteError } from 'react-router';
import { Button, ButtonLink } from '@/components/ui';
import { useT } from '@/i18n';

/** Root error boundary (B16): generic text only — the error itself is never shown (logged in dev). */
export function RouteError() {
  const error = useRouteError();
  const t = useT('common');
  if (import.meta.env.DEV) console.error(error);
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 text-center sm:px-6">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-mint text-heritage-deep ring-1 ring-line">
        <CircleAlert className="size-6" strokeWidth={1.75} />
      </span>
      <h1 role="alert" className="text-balance font-serif text-3xl font-semibold leading-display text-heritage-deep">
        {t('states.error')}
      </h1>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => window.location.reload()} leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}>
          {t('actions.retry')}
        </Button>
        <ButtonLink to="/" size="lg" variant="secondary" leftIcon={<Home className="size-5" aria-hidden="true" />}>
          {t('notFound.home')}
        </ButtonLink>
      </div>
    </main>
  );
}
