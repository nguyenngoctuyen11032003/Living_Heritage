// /auth/callback: lands here from magic-link, signup-confirmation and password-reset emails.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ButtonLink, Spinner } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { AuthLayout } from './AuthLayout';
import { authErrorKey, type AuthErrorKey } from './errors';
import { safeNext } from './next';

/** Error passed back by Supabase in the query or the hash (`#error=…&error_code=…&error_description=…`). */
function urlError(search: URLSearchParams): { code: string; message: string } | null {
  const hash = new URLSearchParams(typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '');
  const code = search.get('error_code') ?? hash.get('error_code') ?? search.get('error') ?? hash.get('error');
  if (!code) return null;
  return { code, message: search.get('error_description') ?? hash.get('error_description') ?? '' };
}

export default function CallbackPage() {
  const t = useT('auth');
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { user } = useSession();
  const [status, setStatus] = useState<'working' | 'ok' | AuthErrorKey>('working');
  const ran = useRef(false);
  const sb = getSupabase();

  useEffect(() => {
    if (ran.current || !sb) return;
    ran.current = true;
    const fromUrl = urlError(params);
    if (fromUrl) {
      setStatus(authErrorKey(fromUrl));
      return;
    }
    void (async () => {
      // getSession() waits for the client's own URL detection (PKCE code exchange) to finish.
      const { data } = await sb.auth.getSession();
      if (data.session) {
        setStatus('ok');
        return;
      }
      const code = params.get('code');
      if (!code) {
        setStatus('linkInvalid');
        return;
      }
      const { error } = await sb.auth.exchangeCodeForSession(code);
      setStatus(error ? authErrorKey(error) : 'ok');
    })();
  }, [sb, params]);

  // Navigate once the session context has caught up, so guarded pages do not bounce back to login.
  useEffect(() => {
    if (status === 'ok' && user) navigate(next, { replace: true });
  }, [status, user, next, navigate]);

  if (!sb) {
    return (
      <AuthLayout title={t('callback.title')}>
        <NotConfiguredNotice />
      </AuthLayout>
    );
  }

  const failed = status !== 'working' && status !== 'ok';
  return (
    <AuthLayout title={failed ? t('callback.failedTitle') : t('callback.title')}>
      {failed ? (
        <div className="flex flex-col gap-5">
          <ErrorNotice message={t(`errors.${status}`)} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/dang-nhap" size="lg">
              {t('callback.backToLogin')}
            </ButtonLink>
            <ButtonLink to="/quen-mat-khau" variant="secondary" size="lg">
              {t('callback.resendReset')}
            </ButtonLink>
          </div>
        </div>
      ) : (
        <p role="status" aria-live="polite" className="flex items-center gap-3 text-[1.1rem] text-ink-soft">
          <Spinner decorative className="text-heritage" />
          {t('callback.working')}
        </p>
      )}
    </AuthLayout>
  );
}
