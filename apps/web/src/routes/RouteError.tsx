import { Link, useRouteError } from 'react-router';
import { useT } from '@/i18n';

export function RouteError() {
  const error = useRouteError();
  const t = useT('common');
  if (import.meta.env.DEV) console.error(error);
  return (
    <section role="alert" className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-serif text-3xl text-heritage">{t('states.error')}</h1>
      <div className="flex gap-3">
        <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-heritage px-6 py-3 text-cream">
          {t('actions.retry')}
        </button>
        <Link to="/" className="rounded-full px-6 py-3 ring-1 ring-line">
          {t('notFound.home')}
        </Link>
      </div>
    </section>
  );
}
