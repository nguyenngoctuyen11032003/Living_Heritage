import { Mail, MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, Field } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { AuthLayout } from './AuthLayout';
import { AuthNotice, authLink, IconInput } from './controls';
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
      kicker={t('forgot.kicker')}
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
      footer={
        <Link to="/dang-nhap" className={cn(authLink, 'inline-flex min-h-11 items-center')}>
          {t('forgot.backToLogin')}
        </Link>
      }
    >
      {!sb ? (
        <NotConfiguredNotice />
      ) : sent ? (
        <AuthNotice icon={<MailCheck />} title={t('forgot.sentTitle')}>
          {t('forgot.sentBody', { email: email.trim() })}
        </AuthNotice>
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label={t('fields.email')} error={emailError} required>
            <IconInput icon={<Mail />} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div aria-live="assertive" className="empty:hidden">
            {error && <ErrorNotice message={t(`errors.${error}`)} />}
          </div>
          <Button type="submit" size="lg" fullWidth loading={busy}>
            {t('forgot.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
