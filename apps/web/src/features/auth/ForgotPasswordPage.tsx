import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, Field, Input } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { AuthLayout } from './AuthLayout';
import { authErrorKey, type AuthErrorKey } from './errors';
import { callbackUrl } from './next';

export const RESET_PATH = '/dat-lai-mat-khau';

export default function ForgotPasswordPage() {
  const t = useT('auth');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const sb = getSupabase();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sb || busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError(t('fields.emailInvalid'));
      return;
    }
    setEmailError(null);
    setBusy(true);
    setError(null);
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl(RESET_PATH) });
    setBusy(false);
    if (err) setError(authErrorKey(err));
    else setSent(true);
  }

  return (
    <AuthLayout
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
      footer={
        <Link to="/dang-nhap" className="inline-flex min-h-11 items-center font-semibold text-heritage underline-offset-4 hover:underline">
          {t('forgot.backToLogin')}
        </Link>
      }
    >
      {!sb ? (
        <NotConfiguredNotice />
      ) : sent ? (
        <div role="status" className="rounded-[1.5rem] bg-mint/60 p-6 ring-1 ring-heritage/10">
          <MailCheck aria-hidden="true" className="size-8 text-heritage" />
          <h2 className="mt-3 font-serif text-[1.4rem] font-semibold text-heritage-deep">{t('forgot.sentTitle')}</h2>
          <p className="mt-2 leading-relaxed text-ink [overflow-wrap:anywhere]">{t('forgot.sentBody', { email: email.trim() })}</p>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label={t('fields.email')} error={emailError} required>
            <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div aria-live="assertive">{error && <ErrorNotice message={t(`errors.${error}`)} />}</div>
          <Button type="submit" size="lg" fullWidth loading={busy}>
            {t('forgot.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
