import { Home, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router';
import { Logo } from '@/components/layout/Logo';
import { useT } from '@/i18n';

const btn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-semibold transition-colors';

/** Root error boundary: rendered without the site layout, so it brings its own minimal header. */
export function RouteError() {
  const error = useRouteError();
  const t = useT('common');
  if (import.meta.env.DEV) console.error(error);
  useEffect(() => {
    document.title = `${t('routeError.title')} — ${t('brand.name')}`;
  }, [t]);
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="mx-auto flex w-full max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <section role="alert" className="flex max-w-xl flex-col items-center text-center">
          <p className="text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-terracotta">{t('routeError.eyebrow')}</p>
          <h1 className="mt-4 text-balance font-serif text-[clamp(1.9rem,6vw,2.6rem)] font-semibold leading-[1.2] text-heritage-deep">{t('routeError.title')}</h1>
          <p className="mt-4 max-w-md text-pretty text-[1.05rem] leading-relaxed text-ink-soft">{t('routeError.body')}</p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <button type="button" onClick={() => window.location.reload()} className={`${btn} bg-heritage text-cream hover:bg-heritage-deep`}>
              <RotateCcw aria-hidden="true" className="size-5" />
              {t('actions.retry')}
            </button>
            <Link to="/" className={`${btn} bg-paper text-ink ring-1 ring-line hover:text-heritage hover:ring-heritage/50`}>
              <Home aria-hidden="true" className="size-5" />
              {t('notFound.home')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
