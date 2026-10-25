import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, ButtonLink, Field, Skeleton, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './controls';
import { authErrorKey, type AuthErrorKey } from './errors';
import { DEFAULT_AFTER_LOGIN, MIN_PASSWORD } from './next';

export default function ResetPasswordPage() {
  const t = useT('auth');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAnonymous, loading } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const sb = getSupabase();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sb || busy) return;
    const fe: { password?: string; confirm?: string } = {};
    if (password.length < MIN_PASSWORD) fe.password = t('fields.passwordTooShort', { n: MIN_PASSWORD });
    if (confirm !== password) fe.confirm = t('reset.mismatch');
    setFieldError(fe);
    if (fe.password || fe.confirm) return;
    setBusy(true);
    setError(null);
    const { error: err } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(authErrorKey(err));
      return;
    }
    toast({ title: t('reset.done'), tone: 'success' });
    navigate(DEFAULT_AFTER_LOGIN, { replace: true });
  }

  let content;
  if (!sb) content = <NotConfiguredNotice />;
  else if (loading)
    content = (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-14" />
      </div>
    );
  else if (!user || isAnonymous)
    content = (
      <div className="flex flex-col gap-5">
        <ErrorNotice message={t('reset.noSession')} />
        <ButtonLink to="/quen-mat-khau" size="lg">
          {t('reset.requestNew')}
        </ButtonLink>
      </div>
    );
  else
    content = (
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label={t('reset.newPassword')} hint={t('fields.passwordHint', { n: MIN_PASSWORD })} error={fieldError.password} required>
          <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label={t('reset.confirmPassword')} error={fieldError.confirm} required>
          <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div aria-live="assertive" className="empty:hidden">
          {error && <ErrorNotice message={t(`errors.${error}`)} />}
        </div>
        <Button type="submit" size="lg" fullWidth loading={busy}>
          {t('reset.submit')}
        </Button>
      </form>
    );

  return (
    <AuthLayout kicker={t('reset.kicker')} title={t('reset.title')} subtitle={t('reset.subtitle')}>
      {content}
    </AuthLayout>
  );
}
