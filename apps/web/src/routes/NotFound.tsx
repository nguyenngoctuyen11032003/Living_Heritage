import { useEffect } from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button, ButtonLink } from '@/components/ui';
import { useT } from '@/i18n';

/** Unknown public path (B16): plain message, one safe way back, no details about what was requested. */
export function NotFound() {
  const t = useT('common');
  const navigate = useNavigate();
  useEffect(() => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 sm:px-6 text-center">
      <p aria-hidden="true" className="font-serif text-4xl font-semibold text-terracotta">
        404
      </p>
      <h1 className="text-balance font-serif text-3xl font-semibold leading-display text-heritage-deep">{t('notFound.title')}</h1>
      <p className="text-ink-soft">{t('notFound.body')}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to="/" size="lg" leftIcon={<Home className="size-5" aria-hidden="true" />}>
          {t('notFound.home')}
        </ButtonLink>
        {window.history.length > 1 && (
          <Button size="lg" variant="secondary" onClick={() => void navigate(-1)} leftIcon={<ArrowLeft className="size-5" aria-hidden="true" />}>
            {t('actions.back')}
          </Button>
        )}
      </div>
    </section>
  );
}
