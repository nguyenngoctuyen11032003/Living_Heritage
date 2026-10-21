import { Link } from 'react-router';
import { useT } from '@/i18n';

export function NotFound() {
  const t = useT('common');
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-hand text-4xl text-terracotta">404</p>
      <h1 className="font-serif text-3xl text-heritage">{t('notFound.title')}</h1>
      <p className="text-ink-soft">{t('notFound.body')}</p>
      <Link to="/" className="mt-2 rounded-full bg-heritage px-6 py-3 text-cream hover:bg-heritage-deep">
        {t('notFound.home')}
      </Link>
    </section>
  );
}
