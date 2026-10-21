import { Mail } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button, ButtonLink, Field, Input, Textarea } from '@/components/ui';
import { useT } from '@/i18n';
import { buildOrgMailto, contactEmail, validateOrgContact, type OrgContactErrors, type OrgContactInput } from './orgContact';

const EMPTY: OrgContactInput = { name: '', contact: '', organisation: '', message: '', consent: false };

/**
 * Consultation request for organisations (B6 #9). Without a server-side intake it opens the visitor's mail app
 * with the filled-in message (when VITE_CONTACT_EMAIL is set) and says plainly that nothing is sent until they press
 * Send there. With no mailbox configured it shows the honest "channel in preparation" note and the sign-up link.
 */
export function OrgContactForm({ email = contactEmail() }: { email?: string | null }) {
  const t = useT('legal');
  const consentId = useId();
  const [form, setForm] = useState<OrgContactInput>(EMPTY);
  const [errors, setErrors] = useState<OrgContactErrors>({});
  const [opened, setOpened] = useState(false);

  const set = <K extends keyof OrgContactInput>(key: K, value: OrgContactInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const err = (key: keyof OrgContactErrors) => (errors[key] ? t(`orgs.form.errors.${errors[key]!}`) : undefined);

  if (!email) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="leading-relaxed text-ink-soft">{t('orgs.form.noChannel')}</p>
        <ButtonLink to="/dang-ky" size="lg">
          {t('common.signUp')}
        </ButtonLink>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validateOrgContact(form);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpened(false);
      return;
    }
    const href = buildOrgMailto(email!, t('orgs.form.subject', { org: form.organisation.trim() }), [
      [t('orgs.form.name'), form.name],
      [t('orgs.form.contact'), form.contact],
      [t('orgs.form.organisation'), form.organisation],
      [t('orgs.form.message'), form.message],
    ]);
    window.location.href = href;
    setOpened(true);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t('orgs.form.name')} required error={err('name')}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={80} autoComplete="name" />
        </Field>
        <Field label={t('orgs.form.contact')} hint={t('orgs.form.contactHint')} required error={err('contact')}>
          <Input value={form.contact} onChange={(e) => set('contact', e.target.value)} maxLength={200} autoComplete="email" />
        </Field>
      </div>
      <Field label={t('orgs.form.organisation')} required error={err('organisation')}>
        <Input value={form.organisation} onChange={(e) => set('organisation', e.target.value)} maxLength={120} autoComplete="organization" />
      </Field>
      <Field label={t('orgs.form.message')} hint={t('orgs.form.messageHint')} required error={err('message')}>
        <Textarea value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={2000} rows={4} />
      </Field>
      <div>
        <label htmlFor={consentId} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream p-4 ring-1 ring-line has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-heritage">
          <input
            id={consentId}
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set('consent', e.target.checked)}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${consentId}-err` : undefined}
            className="mt-1 size-5 shrink-0 accent-[#214e43]"
          />
          <span className="text-[0.95rem] leading-relaxed text-ink">{t('orgs.form.consent')}</span>
        </label>
        {errors.consent && (
          <p id={`${consentId}-err`} role="alert" className="mt-1.5 text-[0.82rem] font-medium text-terracotta">
            {t('orgs.form.errors.consent')}
          </p>
        )}
      </div>
      <p className="text-[0.88rem] leading-relaxed text-ink-soft">{t('orgs.form.how')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" className="gap-2">
          <Mail aria-hidden="true" className="size-5" />
          {t('orgs.form.submit')}
        </Button>
      </div>
      <p role="status" className="text-[0.92rem] font-medium leading-relaxed text-heritage-deep">
        {opened ? t('orgs.form.opened', { email }) : ''}
      </p>
    </form>
  );
}
