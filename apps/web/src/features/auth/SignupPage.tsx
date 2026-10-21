import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button, Field, Input } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { AuthLayout } from './AuthLayout';
import { authErrorKey, type AuthErrorKey } from './errors';
import { callbackUrl, loginHref, MIN_PASSWORD, safeNext } from './next';


const ONBOARDING = '/gia-dinh/bat-dau';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  consent?: string;
}

export default function SignupPage() {
  const t = useT('auth');
  const { locale } = useLocale();
  const [params] = useSearchParams();
  const rawNext = params.get('next');
  const next = safeNext(rawNext, ONBOARDING);
  const navigate = useNavigate();
  const { user, isAnonymous, loading } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const sb = getSupabase();

  if (!loading && user && !isAnonymous && !busy) return <Navigate to={safeNext(rawNext)} replace />;

  function validate(): boolean {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = t('fields.nameRequired');
    else if (name.trim().length > 80) e.name = t('fields.nameTooLong');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = t('fields.emailInvalid');
    if (password.length < MIN_PASSWORD) e.password = t('fields.passwordTooShort', { n: MIN_PASSWORD });
    if (!consent) e.consent = t('signup.consentRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!sb || !validate()) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim(), locale }, emailRedirectTo: callbackUrl(next) },
    });
    if (err) {
      setBusy(false);
      setError(authErrorKey(err));
      return;
    }
    // With email confirmation on, an existing address comes back as a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setBusy(false);
      setError('userExists');
      return;
    }
    if (data.session) {
      navigate(next, { replace: true });
      return;
    }
    setBusy(false);
    setSentTo(email.trim());
  }

  return (
    <AuthLayout
      title={t('signup.title')}
      subtitle={t('signup.subtitle')}
      footer={
        <p>
          {t('signup.haveAccount')}{' '}
          <Link className="font-semibold text-heritage underline-offset-4 hover:underline" to={loginHref(rawNext)}>
            {t('signup.toLogin')}
          </Link>
        </p>
      }
    >
      {!sb ? (
        <NotConfiguredNotice />
      ) : sentTo ? (
        <div role="status" className="rounded-[1.5rem] bg-mint/60 p-6 ring-1 ring-heritage/10">
          <MailCheck aria-hidden="true" className="size-8 text-heritage" />
          <h2 className="mt-3 font-serif text-[1.4rem] font-semibold text-heritage-deep">{t('signup.checkEmailTitle')}</h2>
          <p className="mt-2 leading-relaxed text-ink [overflow-wrap:anywhere]">{t('signup.checkEmailBody', { email: sentTo })}</p>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label={t('fields.displayName')} hint={t('fields.displayNameHint')} error={errors.name} required>
            <Input autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('fields.email')} error={errors.email} required>
            <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t('fields.password')} hint={t('fields.passwordHint', { n: MIN_PASSWORD })} error={errors.password} required>
            <Input type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl p-1 leading-relaxed text-ink">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? 'consent-err' : undefined}
                className="mt-1 size-5 shrink-0 accent-[var(--heritage)]"
              />
              <span className="text-[0.95rem]">
                {t('signup.consentBefore')}{' '}
                <Link to="/quyen-rieng-tu" target="_blank" className="font-semibold text-heritage underline underline-offset-4">
                  {t('signup.privacy')}
                </Link>{' '}
                {t('signup.consentAnd')}{' '}
                <Link to="/dieu-khoan" target="_blank" className="font-semibold text-heritage underline underline-offset-4">
                  {t('signup.terms')}
                </Link>
                {t('signup.consentAfter')}
              </span>
            </label>
            {errors.consent && (
              <p id="consent-err" role="alert" className="text-[0.82rem] font-medium text-terracotta">
                {errors.consent}
              </p>
            )}
          </div>
          <div aria-live="assertive">{error && <ErrorNotice message={t(`errors.${error}`)} />}</div>
          <Button type="submit" size="lg" fullWidth loading={busy}>
            {t('signup.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
