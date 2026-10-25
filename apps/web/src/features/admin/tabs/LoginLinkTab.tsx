import { MailCheck, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { callbackUrl, DEFAULT_AFTER_LOGIN } from '@/features/auth/next';
import { ErrorNotice } from '@/features/families/states';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';

/** Admin tool: email a one-time sign-in link to an existing account (the public login page no longer offers it). */
export function LoginLinkTab() {
  const t = useT('admin');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    const target = email.trim();
    if (!sb || busy) return;
    if (!/^\S+@\S+\.\S+$/.test(target)) {
      setFieldError(t('loginLink.invalid'));
      return;
    }
    setFieldError(null);
    setFailed(false);
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({ email: target, options: { shouldCreateUser: false, emailRedirectTo: callbackUrl(DEFAULT_AFTER_LOGIN) } });
    setBusy(false);
    if (error) setFailed(true);
    else {
      setSentTo(target);
      setEmail('');
    }
  }

  return (
    <div className="max-w-xl rounded-[1.25rem] bg-paper p-6 ring-1 ring-line md:p-8">
      <h2 className="font-serif text-[1.35rem] font-semibold text-heritage-deep">{t('loginLink.title')}</h2>
      <p className="mt-2 leading-relaxed text-ink-soft">{t('loginLink.lead')}</p>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
        <Field label={t('loginLink.email')} error={fieldError} required>
          <Input type="email" autoComplete="off" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div aria-live="assertive" className="empty:hidden">
          {failed && <ErrorNotice message={t('loginLink.error')} />}
        </div>
        <div role="status" className="empty:hidden">
          {sentTo && (
            <p className="flex items-start gap-2 rounded-2xl bg-mint/60 p-4 text-[0.95rem] leading-relaxed text-heritage-deep ring-1 ring-heritage/15">
              <MailCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {t('loginLink.sent', { email: sentTo })}
            </p>
          )}
        </div>
        <div>
          <Button type="submit" size="lg" loading={busy} disabled={busy} leftIcon={<Send aria-hidden="true" />}>
            {t('loginLink.send')}
          </Button>
        </div>
      </form>
    </div>
  );
}
