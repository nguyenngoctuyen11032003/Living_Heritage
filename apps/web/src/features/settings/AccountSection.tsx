import { LogOut } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Dialog, Field, Textarea, useToast } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { SectionCard } from '@/features/families/states';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { hasErrors, REASON_MAX, REASON_MIN, toDeletionInsert, validateDeletionForm, type DeletionFormErrors } from './deletion';
import { ConfirmCheckbox, DeletionRequestList } from './DeletionRequestList';
import { useDeletionErrorText, useMyDeletionRequests } from './useDeletionRequests';

export function AccountSection() {
  return (
    <div className="flex flex-col gap-6">
      <SignOutEverywhere />
      <AccountDeletion />
    </div>
  );
}

function SignOutEverywhere() {
  const t = useT('settings');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.auth.signOut({ scope: 'global' });
    setBusy(false);
    setOpen(false);
    if (error) toast({ title: t('account.signOutFailed'), tone: 'error' });
    else navigate('/', { replace: true });
  }

  return (
    <SectionCard title={t('account.signOutTitle')} description={t('account.signOutBody')}>
      <Button variant="secondary" onClick={() => setOpen(true)} leftIcon={<LogOut className="size-4" aria-hidden="true" />}>
        {t('account.signOutAction')}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={t('account.signOutConfirmTitle')}
        description={t('account.signOutConfirmBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('family.leaveKeep')}
            </Button>
            <Button variant="terracotta" loading={busy} onClick={() => void signOut()}>
              {t('account.signOutAction')}
            </Button>
          </>
        }
      />
    </SectionCard>
  );
}

function AccountDeletion() {
  const t = useT('settings');
  const fam = useCurrentFamily();
  const { toast } = useToast();
  const errorText = useDeletionErrorText();
  const requests = useMyDeletionRequests();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<DeletionFormErrors>({});
  const [busy, setBusy] = useState(false);
  const familyId = fam.current?.id ?? null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    const form = { scope: 'account' as const, storyId: '', reason, confirmed };
    const errs = validateDeletionForm(form, familyId);
    setErrors(errs);
    if (hasErrors(errs) || !familyId) return;
    setBusy(true);
    const { error } = await sb.from('deletion_requests').insert(toDeletionInsert(form, familyId));
    setBusy(false);
    if (error) toast({ title: t('states.saveError'), tone: 'error' });
    else {
      setReason('');
      setConfirmed(false);
      toast({ title: t('account.deleteSent'), tone: 'success' });
      void requests.reload();
    }
  }

  const msg = errorText(errors);
  return (
    <SectionCard title={t('account.deleteTitle')} description={t('account.deleteBody')}>
      <div className="flex flex-col gap-6">
        <p className="leading-relaxed text-ink-soft">{t('deletion.backupNote')}</p>
        {!familyId && !fam.loading ? (
          <p className="rounded-2xl bg-cream p-4 leading-relaxed text-ink ring-1 ring-line">{t('account.deleteNoFamily')}</p>
        ) : (
          <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-5">
            {fam.current && <p className="text-ink">{t('account.deleteFiledFor', { family: fam.current.name })}</p>}
            <Field label={t('account.deleteReason')} hint={t('deletion.reasonHint', { min: REASON_MIN, max: REASON_MAX })} error={msg.reason} required>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={REASON_MAX + 50} />
            </Field>
            <ConfirmCheckbox checked={confirmed} onChange={setConfirmed} label={t('account.deleteConfirm')} error={msg.confirmed} />
            <div>
              <Button type="submit" variant="terracotta" loading={busy}>
                {t('account.deleteSubmit')}
              </Button>
            </div>
          </form>
        )}
        <div>
          <h3 className="mb-3 font-serif text-[1.1rem] font-semibold text-heritage-deep">{t('account.myRequests')}</h3>
          <DeletionRequestList rows={requests.rows} loading={requests.loading} error={requests.error} onRetry={() => void requests.reload()} only={['account']} />
        </div>
      </div>
    </SectionCard>
  );
}
