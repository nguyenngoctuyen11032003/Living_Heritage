import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Field, Input, Skeleton, useToast } from '@/components/ui';
import { MIN_PASSWORD } from '@/features/auth/next';
import { ErrorNotice, SectionCard } from '@/features/families/states';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { DISPLAY_NAME_MAX, validateName, validateNewPassword } from './permissions';

export function ProfileSection() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileForm />
      <PasswordForm />
    </div>
  );
}

function ProfileForm() {
  const t = useT('settings');
  const { user } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setLoading(true);
    const { data, error: err } = await sb.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    setLoadError(Boolean(err));
    setName(data?.display_name ?? '');
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !user || saving) return;
    const v = validateName(name, DISPLAY_NAME_MAX);
    if (v) {
      setError(v === 'required' ? t('profile.nameRequired') : t('profile.nameTooLong'));
      return;
    }
    setError(null);
    setSaving(true);
    const { error: err } = await sb.from('profiles').update({ display_name: name.trim() }).eq('id', user.id);
    setSaving(false);
    if (err) toast({ title: t('states.saveError'), tone: 'error' });
    else {
      setName(name.trim());
      toast({ title: t('profile.saved'), tone: 'success' });
    }
  }

  return (
    <SectionCard title={t('profile.title')} description={t('profile.description')}>
      {loading ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-12 w-full max-w-md" />
        </div>
      ) : loadError ? (
        <ErrorNotice message={t('states.loadError')} onRetry={() => void load()} />
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-5">
          <Field label={t('profile.displayName')} hint={t('profile.displayNameHint')} error={error ?? undefined} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={DISPLAY_NAME_MAX + 20} autoComplete="name" />
          </Field>
          <Field label={t('profile.email')} hint={t('profile.emailHint')}>
            <Input value={user?.email ?? t('profile.noEmail')} readOnly aria-readonly="true" className="bg-cream" />
          </Field>
          <div>
            <Button type="submit" loading={saving}>
              {t('profile.save')}
            </Button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}

function PasswordForm() {
  const t = useT('settings');
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<{ field: 'password' | 'confirm'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || saving) return;
    const v = validateNewPassword(password, confirm, MIN_PASSWORD);
    if (v === 'tooShort') return setError({ field: 'password', message: t('password.tooShort', { n: MIN_PASSWORD }) });
    if (v === 'mismatch') return setError({ field: 'confirm', message: t('password.mismatch') });
    setError(null);
    setSaving(true);
    const { error: err } = await sb.auth.updateUser({ password });
    setSaving(false);
    if (err) toast({ title: t('password.failed'), tone: 'error' });
    else {
      setPassword('');
      setConfirm('');
      toast({ title: t('password.changed'), tone: 'success' });
    }
  }

  return (
    <SectionCard title={t('password.title')} description={t('password.description')}>
      <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-5">
        <Field label={t('password.newPassword')} hint={t('password.newPasswordHint', { n: MIN_PASSWORD })} error={error?.field === 'password' ? error.message : undefined} required>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label={t('password.confirm')} error={error?.field === 'confirm' ? error.message : undefined} required>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <div>
          <Button type="submit" variant="secondary" loading={saving}>
            {t('password.submit')}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
