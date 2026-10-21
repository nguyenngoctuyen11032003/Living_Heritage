import { Home, LogOut } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, ButtonLink, Dialog, EmptyState, Field, Input, Select, Skeleton, useToast } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { ONBOARDING_PATH } from '@/features/families/gate';
import { ErrorNotice, SectionCard } from '@/features/families/states';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { FAMILY_NAME_MAX, familySettingsPermissions, validateName } from './permissions';

export function FamilySection() {
  const t = useT('settings');
  const fam = useCurrentFamily();

  if (fam.loading)
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (fam.error && fam.families.length === 0) return <ErrorNotice message={t('states.loadError')} onRetry={() => void fam.reload()} />;
  if (!fam.current)
    return (
      <EmptyState
        icon={<Home />}
        title={t('family.noneTitle')}
        description={t('family.noneBody')}
        action={<ButtonLink to={ONBOARDING_PATH}>{t('family.noneAction')}</ButtonLink>}
      />
    );

  return <FamilyPanels />;
}

function FamilyPanels() {
  const t = useT('settings');
  const fam = useCurrentFamily();
  const { user } = useSession();
  const { toast } = useToast();
  const current = fam.current!;
  const perms = familySettingsPermissions(current.role);
  const [name, setName] = useState(current.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setName(current.name);
    setNameError(null);
  }, [current.id, current.name]);

  async function rename(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    const v = validateName(name, FAMILY_NAME_MAX);
    if (v) {
      setNameError(v === 'required' ? t('family.nameRequired') : t('family.nameTooLong'));
      return;
    }
    setNameError(null);
    setSaving(true);
    const { data, error } = await sb.from('families').update({ name: name.trim() }).eq('id', current.id).select('id');
    setSaving(false);
    if (error || !data?.length) toast({ title: error ? t('states.saveError') : t('states.forbidden'), tone: 'error' });
    else {
      toast({ title: t('family.renamed'), tone: 'success' });
      void fam.reload();
    }
  }

  async function leave() {
    const sb = getSupabase();
    if (!sb || !user) return;
    setLeaving(true);
    const familyName = current.name;
    const { data, error } = await sb.from('family_members').delete().eq('family_id', current.id).eq('user_id', user.id).select('user_id');
    setLeaving(false);
    setConfirmLeave(false);
    if (error || !data?.length) toast({ title: error ? t('states.saveError') : t('states.forbidden'), tone: 'error' });
    else {
      toast({ title: t('family.left', { family: familyName }), tone: 'success' });
      void fam.reload();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={t('family.currentTitle')}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 break-words font-serif text-[1.25rem] font-semibold text-ink">{current.name}</p>
          <Badge tone="mint">{t('family.yourRole', { role: t(`roles.${current.role}`) })}</Badge>
        </div>
        {fam.families.length > 1 && (
          <div className="mt-5 max-w-md">
            <Field label={t('family.switchLabel')}>
              <Select
                value={current.id}
                onChange={(e) => {
                  fam.select(e.target.value);
                  const next = fam.families.find((f) => f.id === e.target.value);
                  if (next) toast({ title: t('family.switched', { name: next.name }), tone: 'info' });
                }}
              >
                {fam.families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({t(`roles.${f.role}`)})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title={t('family.renameTitle')}>
        {perms.canRename ? (
          <form onSubmit={rename} noValidate className="flex max-w-md flex-col gap-5">
            <Field label={t('family.renameLabel')} hint={t('family.renameHint')} error={nameError ?? undefined} required>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={FAMILY_NAME_MAX + 20} />
            </Field>
            <div>
              <Button type="submit" loading={saving} disabled={name.trim() === current.name}>
                {t('family.renameSave')}
              </Button>
            </div>
          </form>
        ) : (
          <p className="leading-relaxed text-ink-soft">{t('family.renameOnlyManagers')}</p>
        )}
      </SectionCard>

      <SectionCard title={t('family.leaveTitle')} description={perms.canLeave ? t('family.leaveBody', { family: current.name }) : undefined}>
        {perms.canLeave ? (
          <Button variant="secondary" onClick={() => setConfirmLeave(true)} leftIcon={<LogOut className="size-4" aria-hidden="true" />}>
            {t('family.leaveAction')}
          </Button>
        ) : (
          <p className="leading-relaxed text-ink-soft">{t('family.ownerCannotLeave')}</p>
        )}
      </SectionCard>

      <Dialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        size="sm"
        title={t('family.leaveConfirmTitle', { family: current.name })}
        description={t('family.leaveConfirmBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
              {t('family.leaveKeep')}
            </Button>
            <Button variant="terracotta" loading={leaving} onClick={() => void leave()}>
              {t('family.leaveAction')}
            </Button>
          </>
        }
      />
    </div>
  );
}
