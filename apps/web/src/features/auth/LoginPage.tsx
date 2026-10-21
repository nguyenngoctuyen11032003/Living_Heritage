import { Mail, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button, Field, Input } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { AuthLayout } from './AuthLayout';
import { authErrorKey, type AuthErrorKey } from './errors';
import { callbackUrl, loginHref, safeNext } from './next';

export default function LoginPage() {
  const t = useT('auth');
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const rawNext = params.get('next');
  const navigate = useNavigate();
  const { user, isAnonymous, loading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'password' | 'magic' | null>(null);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const sb = getSupabase();

  if (!loading && user && !isAnonymous) return <Navigate to={next} replace />;

  function validEmail(): boolean {
    const ok = /^\S+@\S+\.\S+$/.test(email.trim());
    setEmailError(ok ? null : t('fields.emailInvalid'));
    return ok;
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    if (!sb || !validEmail()) return;
    if (!password) {
      setError('invalidCredentials');
      return;
    }
    setBusy('password');
    setError(null);
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(null);
    if (err) setError(authErrorKey(err));
    else navigate(next, { replace: true });
  }

  async function onMagic() {
    if (!sb || !validEmail()) return;
    setBusy('magic');
    setError(null);
    const { error: err } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: callbackUrl(next) } });
    setBusy(null);
    if (err) setError(authErrorKey(err));
    else setMagicSent(true);
  }

  return (
    <AuthLayout
      docTitle={t('titles.login')}
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <p>
          {t('login.noAccount')}{' '}
          <Link className="font-semibold text-heritage underline-offset-4 hover:underline" to={loginHref(rawNext, '/dang-ky')}>
            {t('login.toSignup')}
          </Link>
        </p>
      }
    >
      {!sb ? (
        <NotConfiguredNotice />
      ) : magicSent ? (
        <div role="status" className="rounded-[1.5rem] bg-mint/60 p-6 ring-1 ring-heritage/10">
          <Mail aria-hidden="true" className="size-8 text-heritage" />
          <h2 className="mt-3 font-serif text-[1.4rem] font-semibold text-heritage-deep">{t('login.magicSentTitle')}</h2>
          <p className="mt-2 leading-relaxed text-ink [overflow-wrap:anywhere]">{t('login.magicSentBody', { email: email.trim() })}</p>
          <Button variant="ghost" className="mt-4" onClick={() => setMagicSent(false)}>
            {t('login.useAnother')}
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={onPassword} className="flex flex-col gap-5" aria-describedby={error ? 'login-error' : undefined}>
          <Field label={t('fields.email')} error={emailError} required>
            <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t('fields.password')} required>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="-mt-2 text-right">
            <Link to="/quen-mat-khau" className="inline-flex min-h-11 items-center text-[0.95rem] font-semibold text-heritage underline-offset-4 hover:underline">
              {t('login.forgot')}
            </Link>
          </div>
          <div aria-live="assertive" id="login-error">
            {error && <ErrorNotice message={t(`errors.${error}`)} />}
          </div>
          <Button type="submit" size="lg" fullWidth loading={busy === 'password'} disabled={busy !== null}>
            {t('login.submit')}
          </Button>
          <div className="flex items-center gap-3 text-[0.9rem] text-ink-soft" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            {t('login.or')}
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" size="lg" fullWidth onClick={onMagic} loading={busy === 'magic'} disabled={busy !== null} leftIcon={<Sparkles className="size-5" aria-hidden="true" />}>
            {t('login.magic')}
          </Button>
          <p className="text-center text-[0.9rem] leading-relaxed text-ink-soft">{t('login.magicHint')}</p>
        </form>
      )}
    </AuthLayout>
  );
}
