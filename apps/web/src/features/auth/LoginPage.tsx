import { ArrowRight, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button, Field } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { AuthLayout } from './AuthLayout';
import { authLink, IconInput, PasswordInput } from './controls';
import { authErrorKey, type AuthErrorKey } from './errors';
import { loginHref, safeNext } from './next';

export default function LoginPage() {
  const t = useT('auth');
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const rawNext = params.get('next');
  const navigate = useNavigate();
  const { user, isAnonymous, loading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const sb = getSupabase();

  if (!loading && user && !isAnonymous) return <Navigate to={next} replace />;

  function validEmail(): boolean {
    const ok = /^\S+@\S+\.\S+$/.test(email.trim());
    setEmailError(ok ? null : t('fields.emailInvalid'));
    return ok;
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    if (!sb || busy) return;
    const emailOk = validEmail();
    setPasswordError(password ? null : t('fields.passwordRequired'));
    if (!emailOk || !password) return;
    setBusy(true);
    setError(null);
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(authErrorKey(err));
    else navigate(next, { replace: true });
  }

  return (
    <AuthLayout
      kicker={t('login.kicker')}
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <p>
          {t('login.noAccount')}{' '}
          <Link className={authLink} to={loginHref(rawNext, '/dang-ky')}>
            {t('login.toSignup')}
          </Link>
        </p>
      }
    >
      {!sb ? (
        <NotConfiguredNotice />
      ) : (
        <form noValidate onSubmit={onPassword} className="flex flex-col gap-5" aria-describedby={error ? 'login-error' : undefined}>
          <Field label={t('fields.email')} error={emailError} required>
            <IconInput icon={<Mail />} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex flex-col gap-1">
            <Field label={t('fields.password')} error={passwordError} required>
              <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <div className="-mb-2 text-right">
              <Link to="/quen-mat-khau" className="inline-flex min-h-11 items-center text-[0.9rem] font-semibold text-heritage underline-offset-4 hover:underline">
                {t('login.forgot')}
              </Link>
            </div>
          </div>
          <div aria-live="assertive" id="login-error" className="empty:hidden">
            {error && <ErrorNotice message={t(`errors.${error}`)} />}
          </div>
          <Button type="submit" size="lg" fullWidth loading={busy} disabled={busy} rightIcon={busy ? undefined : <ArrowRight aria-hidden="true" className="transition-transform group-hover/btn:translate-x-0.5" />}>
            {t('login.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
