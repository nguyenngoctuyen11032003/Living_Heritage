import { ImageUp, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Field, Input, Skeleton, Spinner, useToast } from '@/components/ui';
import { MIN_PASSWORD } from '@/features/auth/next';
import { ErrorNotice, SectionCard } from '@/features/families/states';
import { useT } from '@/i18n';
import { avatarUrl, loadMyProfile, patchMyProfile, useMyProfile } from '@/lib/myProfile';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { AVATAR_MAX_BYTES, AVATAR_TYPES, removeAvatar, uploadAvatar, validateAvatarFile } from './avatar';
import { DISPLAY_NAME_MAX, validateName, validateNewPassword } from './permissions';
import { UserAvatar } from './UserAvatar';

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
    const { error: err, profile } = await loadMyProfile(user.id);
    setLoadError(err);
    setName(profile?.displayName ?? '');
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !user) return;
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
      patchMyProfile({ displayName: name.trim() });
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
        <div className="flex max-w-md flex-col gap-6">
          <AvatarPicker name={name} />
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
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
        </div>
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
    if (!sb) return;
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

/**
 * Profile photo: circle preview (initial fallback) + "Change photo" / "Remove". The photo is saved as soon as it
 * is picked (no need to press "Save profile"); while uploading, the local preview shows under a spinner.
 */
function AvatarPicker({ name }: { name: string }) {
  const t = useT('settings');
  const { user } = useSession();
  const profile = useMyProfile();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Revoke the local preview URL when it is replaced or the picker unmounts.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const current = profile?.avatarPath ?? null;
  const src = preview ?? avatarUrl(current);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // picking the same file again still fires change
    const sb = getSupabase();
    if (!file || !sb || !user) return;
    const invalid = validateAvatarFile(file);
    if (invalid) {
      setError(invalid === 'type' ? t('profile.avatar.errorType') : t('profile.avatar.errorSize', { n: AVATAR_MAX_BYTES / 1024 / 1024 }));
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setBusy('upload');
    try {
      const path = await uploadAvatar(sb, user.id, file, current);
      patchMyProfile({ avatarPath: path });
      toast({ title: t('profile.avatar.saved'), tone: 'success' });
    } catch {
      setError(t('profile.avatar.uploadFailed'));
    } finally {
      setPreview(null);
      setBusy(null);
    }
  }

  async function onRemove() {
    const sb = getSupabase();
    if (!sb || !user) return;
    setError(null);
    setBusy('remove');
    try {
      await removeAvatar(sb, user.id, current);
      patchMyProfile({ avatarPath: null });
      toast({ title: t('profile.avatar.removed'), tone: 'success' });
    } catch {
      setError(t('profile.avatar.removeFailed'));
    } finally {
      setBusy(null);
    }
  }

  const errorId = 'profile-avatar-error';
  return (
    <div role="group" aria-labelledby="profile-avatar-label" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative w-fit" aria-busy={busy !== null}>
        <UserAvatar src={src} name={name || user?.email} seed={user?.id ?? ''} size="xl" />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
            <Spinner decorative className="text-white" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p id="profile-avatar-label" className="text-[0.9rem] font-semibold text-ink">
          {t('profile.avatar.label')}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void onPick(e)}
          />
          <Button
            variant="secondary"
            loading={busy === 'upload'}
            disabled={busy !== null}
            leftIcon={<ImageUp className="size-4" aria-hidden="true" />}
            aria-describedby={error ? errorId : 'profile-avatar-hint'}
            onClick={() => inputRef.current?.click()}
          >
            {current ? t('profile.avatar.change') : t('profile.avatar.add')}
          </Button>
          {current && (
            <Button variant="ghost" loading={busy === 'remove'} disabled={busy !== null} leftIcon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => void onRemove()}>
              {t('profile.avatar.remove')}
            </Button>
          )}
        </div>
        <p id="profile-avatar-hint" className="text-[0.8rem] leading-snug text-ink-soft">
          {t('profile.avatar.hint', { n: AVATAR_MAX_BYTES / 1024 / 1024 })}
        </p>
        {error && (
          <p id={errorId} role="alert" className="text-[0.82rem] font-medium leading-snug text-terracotta">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
