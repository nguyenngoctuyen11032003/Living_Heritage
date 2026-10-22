import { CircleCheck, Info, RotateCcw } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Button, ButtonLink, Field, IllustrativeBadge, Input, Select, Textarea, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { submitConnect, submitInterest } from '../api';
import {
  composeConnectPageMessage,
  connectTarget,
  CONNECT_FORMATS,
  parseConnectPlan,
  validateConnectPage,
  type ConnectFormat,
  type ConnectPageErrors,
} from '../connect';
import { EMPTY_FILTERS } from '../filters';
import { bareQuote, isUuid } from '../types';
import { useKnowledgeSearch } from '../useKnowledgeSearch';

/** /ket-noi — public "send interest" form. Guests (or no item chosen) go to interest_requests; a signed-in user with an item goes to connect_requests. */
export default function ConnectPage() {
  const t = useT('knowledge');
  const tc = useT('common');
  const tl = useT('landing');
  const { toast } = useToast();
  const { user, loading: sessionLoading, isAnonymous } = useSession();
  const [params] = useSearchParams();
  const hub = useKnowledgeSearch(EMPTY_FILTERS);
  const plan = parseConnectPlan(params.get('plan'));
  const itemParam = params.get('item');
  usePageTitle(t('connect.page.pageTitle'));

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState<ConnectFormat>('question');
  const [message, setMessage] = useState('');
  const [itemId, setItemId] = useState(isUuid(itemParam) ? itemParam : '');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<ConnectPageErrors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [done, setDone] = useState<'sent' | 'simulated' | null>(null);
  const consentId = useId();

  const simulated = !getSupabase();
  const signedIn = !!user && !isAnonymous;
  const err = (k: 'name' | 'contact' | 'topic' | 'consent') => (errors[k] ? t(`connect.${errors[k]}`) : undefined);
  const items = hub.items.filter((i) => !i.sample);
  const preselectedMissing = itemId !== '' && !items.some((i) => i.id === itemId);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found = validateConnectPage({ name, contact, format, message, consent, topic });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (simulated) {
      setDone('simulated');
      return;
    }
    const sb = getSupabase();
    if (!sb || sessionLoading) return;
    setBusy(true);
    setSubmitError(false);
    try {
      if (connectTarget({ itemId, signedIn }) === 'connect_requests') {
        await submitConnect(sb, itemId, {
          name,
          contact,
          message: composeConnectPageMessage({
            formatLabel: t(`connect.formats.${format}`),
            topicLabel: t('connect.page.topic'),
            topic,
            planLabel: plan ? tl(`plans.${plan}.name`) : null,
            message,
          }),
        });
      } else {
        await submitInterest(sb, { plan, topic, format, name, contact, message });
      }
      setDone('sent');
      toast({ title: t('connect.success'), tone: 'success' });
    } catch {
      setSubmitError(true);
    } finally {
      setBusy(false);
    }
  }

  function again() {
    setTopic('');
    setMessage('');
    setConsent(false);
    setErrors({});
    setDone(null);
  }

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
        <p className="text-[0.875rem] font-bold uppercase tracking-[0.14em] text-terracotta">{t('connect.page.kicker')}</p>
        <h1 className="mt-3 font-serif text-[clamp(2.1rem,1.6rem+2vw,3rem)] font-semibold leading-[1.2] text-heritage-deep">{t('connect.page.title')}</h1>
        <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-ink-soft">{t('connect.page.lede')}</p>

        {plan && (
          <p className="mt-5 flex items-start gap-2 rounded-2xl bg-paper px-4 py-3 text-[0.95rem] leading-relaxed text-ink ring-1 ring-line">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-heritage" />
            {t('connect.page.planNote', { plan: `${tl(`plans.${plan}.name`)} (${tl(`plans.${plan}.price`)}${tl(`plans.${plan}.unit`)}, ${tl('meta.planned')})` })}
          </p>
        )}

        {simulated && (
          <aside className="mt-5 rounded-[1.5rem] border border-[#e9d6a6] bg-[#fdf6e3] px-5 py-4 text-[#5b430f]">
            <div className="flex items-center gap-3">
              <IllustrativeBadge />
              <p className="font-serif text-[1.08rem] font-semibold">{t('connect.page.simulatedTitle')}</p>
            </div>
            <p className="mt-2 text-[0.95rem] leading-relaxed">{t('connect.page.simulatedBody')}</p>
          </aside>
        )}

        {done ? (
          <div className="mt-8">
            <p
              role="status"
              className={
                done === 'sent'
                  ? 'flex items-start gap-3 rounded-2xl bg-mint/70 p-4 leading-relaxed text-heritage-deep'
                  : 'flex items-start gap-3 rounded-2xl bg-[#fdf6e3] p-4 leading-relaxed text-[#5b430f] ring-1 ring-[#e9d6a6]'
              }
            >
              <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {done === 'sent' ? t('connect.success') : t('connect.page.simulatedDone')}
            </p>
            <Button variant="secondary" className="mt-5" onClick={again} leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
              {t('connect.page.another')}
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5 rounded-[1.75rem] bg-paper p-6 ring-1 ring-line md:p-8">
            <Field label={t('connect.page.topic')} hint={t('connect.page.topicHint')} required error={err('topic')}>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} />
            </Field>
            {!simulated && (
              <Field
                label={t('connect.page.item')}
                hint={hub.loading ? t('connect.page.itemsLoading') : hub.error ? t('connect.page.loadError') : t('connect.page.itemHint')}
              >
                <Select value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={hub.loading && items.length === 0}>
                  <option value="">{t('connect.page.itemPlaceholder')}</option>
                  {preselectedMissing && <option value={itemId}>{t('connect.page.itemSelected')}</option>}
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {bareQuote(i.title)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label={t('connect.format')}>
              <Select value={format} onChange={(e) => setFormat(e.target.value as ConnectFormat)}>
                {CONNECT_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {t(`connect.formats.${f}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('connect.name')} required error={err('name')}>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
              </Field>
              <Field label={t('connect.contact')} hint={t('connect.contactHint')} required error={err('contact')}>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="email" />
              </Field>
            </div>
            <Field label={t('connect.message')} hint={t('connect.page.messageHint')}>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={4} />
            </Field>
            <div>
              <label
                htmlFor={consentId}
                className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream p-4 ring-1 ring-line has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-heritage"
              >
                <input
                  id={consentId}
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-invalid={errors.consent ? true : undefined}
                  aria-describedby={errors.consent ? `${consentId}-err` : undefined}
                  className="mt-1 size-5 shrink-0 accent-[#214e43]"
                />
                <span className="text-[0.95rem] leading-relaxed text-ink">{t('connect.consent')}</span>
              </label>
              {errors.consent && (
                <p id={`${consentId}-err`} role="alert" className="mt-1.5 text-[0.9375rem] font-medium text-terracotta">
                  {t('connect.consentRequired')}
                </p>
              )}
            </div>
            {submitError && (
              <p role="alert" className="rounded-2xl bg-terracotta/10 px-4 py-3 text-[0.92rem] font-medium text-terracotta">
                {t('connect.error')}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" loading={busy || (!simulated && sessionLoading)}>
                {simulated ? t('connect.page.simulatedSubmit') : t('connect.submit')}
              </Button>
              <ButtonLink to="/kham-pha" variant="ghost" size="lg">
                {tc('actions.cancel')}
              </ButtonLink>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
