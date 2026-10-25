import { CircleCheck, LogIn } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { Button, ButtonLink, Dialog, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { track } from '@/lib/events';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { submitConnect } from '../api';
import { composeConnectMessage, CONNECT_FORMATS, validateConnect, type ConnectErrors, type ConnectFormat } from '../connect';
import { bareQuote, type KnowledgeItem } from '../types';

/** "Đề nghị trao đổi": requires a session (connect_requests accepts signed-in inserts only). */
export function ConnectDialog({ item, open, onClose }: { item: KnowledgeItem; open: boolean; onClose: () => void }) {
  const t = useT('knowledge');
  const tc = useT('common');
  const { toast } = useToast();
  const { user, loading } = useSession();
  const location = useLocation();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [format, setFormat] = useState<ConnectFormat>('question');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<ConnectErrors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [done, setDone] = useState(false);
  const formId = useId();
  const consentId = useId();

  function close() {
    onClose();
    if (done) {
      window.setTimeout(() => {
        setMessage('');
        setConsent(false);
        setDone(false);
      }, 250);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validateConnect({ name, contact, format, message, consent });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const sb = getSupabase();
    if (!sb) {
      setSubmitError(true);
      return;
    }
    setBusy(true);
    setSubmitError(false);
    try {
      await submitConnect(sb, item.id, { name, contact, message: composeConnectMessage(t(`connect.formats.${format}`), message) });
      setDone(true);
      track('connect_sent');
      toast({ title: t('connect.success'), tone: 'success' });
    } catch {
      setSubmitError(true);
    } finally {
      setBusy(false);
    }
  }

  if (item.sample) {
    return (
      <Dialog open={open} onClose={close} title={t('connect.title')} size="sm" footer={<Button onClick={close}>{t('sample.simulatedOk')}</Button>}>
        <p className="leading-relaxed text-ink-soft">{t('sample.actionNote')}</p>
      </Dialog>
    );
  }

  if (!loading && !user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return (
      <Dialog
        open={open}
        onClose={close}
        title={t('connect.needLoginTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tc('actions.cancel')}
            </Button>
            <ButtonLink to={`/dang-nhap?next=${next}`} leftIcon={<LogIn aria-hidden="true" className="size-4" />}>
              {t('connect.login')}
            </ButtonLink>
          </>
        }
      >
        <p className="leading-relaxed text-ink-soft">{t('connect.needLoginBody')}</p>
        <p className="mt-3 pb-2 text-[0.9rem] leading-relaxed text-ink-soft">{t('connect.description')}</p>
      </Dialog>
    );
  }

  const err = (k: keyof ConnectErrors) => (errors[k] ? t(`connect.${errors[k]}`) : undefined);

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('connect.title')}
      description={done ? undefined : t('connect.description')}
      size="lg"
      footer={
        done ? (
          <Button onClick={close}>{t('sample.simulatedOk')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              {tc('actions.cancel')}
            </Button>
            <Button type="submit" form={formId} loading={busy || loading}>
              {t('connect.submit')}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p role="status" className="flex items-start gap-3 rounded-2xl bg-mint/70 p-4 leading-relaxed text-heritage-deep">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t('connect.success')}
        </p>
      ) : (
        <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-5 pb-2">
          <div className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-line">
            <p className="text-[0.85rem] font-semibold text-ink-soft">{t('connect.about')}</p>
            <p className="mt-1 font-serif font-semibold leading-snug text-heritage-deep">“{bareQuote(item.title)}”</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t('connect.name')} required error={err('name')}>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
            </Field>
            <Field label={t('connect.contact')} hint={t('connect.contactHint')} required error={err('contact')}>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="email" />
            </Field>
          </div>
          <Field label={t('connect.format')}>
            <Select value={format} onChange={(e) => setFormat(e.target.value as ConnectFormat)}>
              {CONNECT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t(`connect.formats.${f}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('connect.message')} hint={t('connect.messageHint')} required error={err('message')}>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1900} rows={4} />
          </Field>
          <div>
            <label htmlFor={consentId} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream p-4 ring-1 ring-line-strong has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-heritage">
              <input
                id={consentId}
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? `${consentId}-err` : undefined}
                className="mt-1 size-5 shrink-0 accent-heritage"
              />
              <span className="text-[0.95rem] leading-relaxed text-ink">{t('connect.consent')}</span>
            </label>
            {errors.consent && (
              <p id={`${consentId}-err`} role="alert" className="mt-1.5 text-[0.82rem] font-medium text-terracotta">
                {t('connect.consentRequired')}
              </p>
            )}
          </div>
          {submitError && (
            <p role="alert" className="rounded-2xl bg-terracotta/10 px-4 py-3 text-[0.92rem] font-medium text-terracotta">
              {t('connect.error')}
            </p>
          )}
        </form>
      )}
    </Dialog>
  );
}
