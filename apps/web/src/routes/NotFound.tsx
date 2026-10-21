import { Compass, Home } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { useT } from '@/i18n';

const btn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-semibold transition-colors';

export function NotFound() {
  const t = useT('common');
  useEffect(() => {
    document.title = `${t('notFound.title')} — ${t('brand.name')}`;
  }, [t]);
  return (
    <section className="relative isolate overflow-hidden px-4 py-20 sm:px-6 md:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_55%_at_50%_10%,rgba(220,232,213,0.85),rgba(250,247,240,0)_75%)]" />
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p aria-hidden="true" className="select-none font-serif text-[clamp(4.5rem,18vw,7.5rem)] font-semibold leading-[1.1] tracking-[-0.04em] text-heritage/15">
          404
        </p>
        <h1 className="mt-2 text-balance font-serif text-[clamp(1.9rem,6vw,2.6rem)] font-semibold leading-[1.2] text-heritage-deep">{t('notFound.title')}</h1>
        <p className="mt-4 max-w-md text-pretty text-[1.05rem] leading-relaxed text-ink-soft">{t('notFound.body')}</p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link to="/" className={`${btn} bg-heritage text-cream hover:bg-heritage-deep`}>
            <Home aria-hidden="true" className="size-5" />
            {t('notFound.home')}
          </Link>
          <Link to="/kham-pha" className={`${btn} bg-paper text-ink ring-1 ring-line hover:text-heritage hover:ring-heritage/50`}>
            <Compass aria-hidden="true" className="size-5" />
            {t('notFound.explore')}
          </Link>
        </div>
      </div>
    </section>
  );
}
