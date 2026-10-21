// /gia-dinh/bat-dau: create the first family, then a 3-step guided checklist.
import { ArrowRight, Check, Home, Link2, Mic, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Badge, Button, ButtonLink, Card, Field, Input, PageHeader, Skeleton } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { loadProgress, type OnboardingProgress } from './api';
import { useCurrentFamily } from './current';
import { FamilySwitcher } from './FamilyGate';
import { rpcErrorCode, type FamilyErrorCode } from './rpcError';
import { ErrorNotice, NotConfiguredNotice } from './states';

export default function OnboardingPage() {
  const t = useT('family');
  const fam = useCurrentFamily();
  const [creatingAnother, setCreatingAnother] = useState(false);

  if (!getSupabase()) return <NotConfiguredNotice />;
  if (fam.loading && fam.families.length === 0) {
    return (
      <div aria-busy="true" className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="mt-6 h-56" />
      </div>
    );
  }
  if (fam.error && fam.families.length === 0) return <ErrorNotice message={t('gate.error')} onRetry={() => void fam.reload()} />;

  const showCreate = fam.families.length === 0 || creatingAnother || !fam.current;
  return (
    <div className="mx-auto max-w-3xl">
      {showCreate ? (
        <CreateFamily onCancel={fam.families.length > 0 ? () => setCreatingAnother(false) : undefined} onCreated={() => setCreatingAnother(false)} />
      ) : (
        <>
          {fam.families.length > 1 && fam.current && <FamilySwitcher families={fam.families} currentId={fam.current.id} onSelect={fam.select} className="mb-6" />}
          <Checklist familyId={fam.current!.id} familyName={fam.current!.name} canManage={fam.canManage} canEdit={fam.canEdit} />
          <div className="mt-8 text-center">
            <Button variant="ghost" onClick={() => setCreatingAnother(true)}>
              {t('onboarding.createAnother')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function CreateFamily({ onCreated, onCancel }: { onCreated: () => void; onCancel?: () => void }) {
  const t = useT('family');
  const tc = useT('common');
  const fam = useCurrentFamily();
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<FamilyErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    const value = name.trim();
    if (!sb) return;
    if (!value || value.length > 120) {
      setFieldError(t('onboarding.nameInvalid'));
      return;
    }
    setFieldError(null);
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.rpc('create_family', { name: value });
    if (err || !data) {
      setBusy(false);
      setError(rpcErrorCode(err));
      return;
    }
    await fam.reload();
    fam.select(data);
    setBusy(false);
    onCreated();
  }

  return (
    <Reveal>
      <PageHeader eyebrow={t('onboarding.eyebrow')} title={t('onboarding.createTitle')} lede={t('onboarding.createBody')} />
      <Card padding="lg">
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label={t('onboarding.nameLabel')} hint={t('onboarding.nameHint')} error={fieldError} required>
            <Input value={name} maxLength={120} placeholder={t('onboarding.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
          </Field>
          <p className="rounded-2xl bg-mint/50 p-4 text-[0.95rem] leading-relaxed text-ink">{t('onboarding.privacyNote')}</p>
          <div aria-live="assertive">{error && <ErrorNotice message={t(`errors.${error}`)} />}</div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {onCancel && (
              <Button variant="secondary" size="lg" onClick={onCancel}>
                {tc('actions.cancel')}
              </Button>
            )}
            <Button type="submit" size="lg" loading={busy} rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
              {t('onboarding.create')}
            </Button>
          </div>
        </form>
      </Card>
    </Reveal>
  );
}

function Checklist({ familyId, familyName, canManage, canEdit }: { familyId: string; familyName: string; canManage: boolean; canEdit: boolean }) {
  const t = useT('family');
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setFailed(false);
    try {
      setProgress(await loadProgress(sb, familyId));
    } catch {
      setFailed(true);
    }
  }, [familyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const steps: Array<{ key: string; icon: ReactNode; title: string; body: string; done: boolean; href: string; cta: string; allowed: boolean }> = [
    {
      key: 'narrator',
      icon: <Mic />,
      title: t('onboarding.step1Title'),
      body: t('onboarding.step1Body'),
      done: (progress?.narrators ?? 0) > 0,
      href: '/gia-dinh/nguoi-ke?new=1',
      cta: t('onboarding.step1Cta'),
      allowed: canEdit,
    },
    {
      key: 'link',
      icon: <Link2 />,
      title: t('onboarding.step2Title'),
      body: t('onboarding.step2Body'),
      done: (progress?.links ?? 0) > 0,
      href: '/gia-dinh/nguoi-ke',
      cta: t('onboarding.step2Cta'),
      allowed: canManage,
    },
    {
      key: 'invite',
      icon: <UserPlus />,
      title: t('onboarding.step3Title'),
      body: t('onboarding.step3Body'),
      done: (progress?.relatives ?? 0) > 0,
      href: '/gia-dinh/thanh-vien?invite=1',
      cta: t('onboarding.step3Cta'),
      allowed: canManage,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <PageHeader
        eyebrow={t('onboarding.eyebrow')}
        title={t('onboarding.checklistTitle', { name: familyName })}
        lede={t('onboarding.checklistBody')}
        actions={
          <ButtonLink to="/gia-dinh" variant="secondary" leftIcon={<Home className="size-4" aria-hidden="true" />}>
            {t('onboarding.toVault')}
          </ButtonLink>
        }
      />
      {failed && <ErrorNotice className="mb-6" message={t('onboarding.progressError')} onRetry={() => void load()} />}
      <p aria-live="polite" className="mb-4 text-[0.95rem] font-semibold text-ink-soft">
        {progress ? t('onboarding.progress', { done: doneCount, total: steps.length }) : t('gate.loading')}
      </p>
      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <Reveal as="li" key={s.key} delay={i * 0.06}>
            <Card padding="md" className={cn('flex flex-col gap-4 sm:flex-row sm:items-center', s.done && 'bg-mint/40')}>
              <div
                aria-hidden="true"
                className={cn('inline-flex size-14 shrink-0 items-center justify-center rounded-2xl [&>svg]:size-7', s.done ? 'bg-heritage text-cream' : 'bg-mint text-heritage')}
              >
                {s.done ? <Check /> : s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-semibold uppercase tracking-[0.1em] text-terracotta">{t('onboarding.stepN', { n: i + 1 })}</p>
                <h2 className="break-words font-serif text-[1.3rem] font-semibold leading-[1.25] text-heritage-deep">{s.title}</h2>
                <p className="mt-1 leading-relaxed text-ink-soft">{s.body}</p>
                {!s.allowed && !s.done && <p className="mt-2 text-[0.9rem] text-ink-soft">{t('onboarding.needsManager')}</p>}
              </div>
              <div className="w-full shrink-0 sm:w-auto">
                {!progress ? (
                  <Skeleton className="h-12 w-36" />
                ) : s.done ? (
                  <Badge tone="heritage" icon={<Check />}>
                    {t('onboarding.done')}
                  </Badge>
                ) : s.allowed ? (
                  <ButtonLink to={s.href} className="w-full whitespace-normal text-balance text-center sm:w-auto" rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
                    {s.cta}
                  </ButtonLink>
                ) : null}
              </div>
            </Card>
          </Reveal>
        ))}
      </ol>
    </>
  );
}
