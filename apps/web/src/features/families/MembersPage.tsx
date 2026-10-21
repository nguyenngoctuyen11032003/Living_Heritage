// /gia-dinh/thanh-vien: members, roles, relations and invites.
import type { MemberRole } from '@lh/shared';
import { Mail, Trash2, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Badge, Button, Card, Dialog, EmptyState, Field, Input, PageHeader, Select, Skeleton, useToast } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { ASSIGNABLE_ROLES, loadInvites, loadMembers, type InviteView, type MemberView } from './api';
import { useCurrentFamily } from './current';
import { FamilyGate } from './FamilyGate';
import { HeritageAvatar } from './HeritageAvatar';
import { rpcErrorCode, type FamilyErrorCode } from './rpcError';
import { CopyField, ErrorNotice, SectionCard } from './states';
import { inviteUrl } from './urls';

/** Badges truncate by default; status text carrying a date must wrap instead of losing the date on narrow cards. */
const WRAP_BADGE = 'rounded-2xl [&>span:last-child]:whitespace-normal [&>span:last-child]:[overflow-wrap:anywhere]';

export default function MembersPage() {
  return (
    <FamilyGate>
      <Members />
    </FamilyGate>
  );
}

function Members() {
  const t = useT('family');
  const tc = useT('common');
  const { locale } = useLocale();
  const fam = useCurrentFamily();
  const familyId = fam.current!.id;
  const { user } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberView[] | null>(null);
  const [invites, setInvites] = useState<InviteView[]>([]);
  const [error, setError] = useState<FamilyErrorCode | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<MemberView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inviteRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    try {
      const [m, i] = await Promise.all([loadMembers(sb, familyId), fam.canManage ? loadInvites(sb, familyId) : Promise.resolve([])]);
      setMembers(m);
      setInvites(i);
    } catch (e) {
      setError(rpcErrorCode(e));
    }
  }, [familyId, fam.canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  // ?invite=1 (from onboarding) focuses the invite email once, after the first render with data; later reloads
  // (role change, new invite) must not pull focus away from where the user is working.
  const invitedFocused = useRef(false);
  useEffect(() => {
    if (invitedFocused.current || members === null || params.get('invite') !== '1') return;
    invitedFocused.current = true;
    inviteRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [params, members]);

  async function changeRole(m: MemberView, role: MemberRole) {
    const sb = getSupabase();
    if (!sb) return;
    setBusyId(m.user_id);
    const { error: err } = await sb.from('family_members').update({ role }).eq('family_id', familyId).eq('user_id', m.user_id);
    setBusyId(null);
    if (err) toast({ title: t(`errors.${rpcErrorCode(err)}`), tone: 'error' });
    else {
      toast({ title: t('members.roleChanged'), tone: 'success' });
      void load();
    }
  }

  async function remove(m: MemberView) {
    const sb = getSupabase();
    if (!sb) return;
    setBusyId(m.user_id);
    const { error: err } = await sb.from('family_members').delete().eq('family_id', familyId).eq('user_id', m.user_id);
    setBusyId(null);
    setConfirmRemove(null);
    if (err) {
      toast({ title: t(`errors.${rpcErrorCode(err)}`), tone: 'error' });
      return;
    }
    if (m.user_id === user?.id) {
      toast({ title: t('members.left'), tone: 'success' });
      await fam.reload();
      navigate('/gia-dinh', { replace: true });
      return;
    }
    toast({ title: t('members.removed'), tone: 'success' });
    void load();
  }

  async function deleteInvite(inv: InviteView) {
    const sb = getSupabase();
    if (!sb) return;
    const { error: err } = await sb.from('family_invites').delete().eq('id', inv.id);
    if (err) toast({ title: t(`errors.${rpcErrorCode(err)}`), tone: 'error' });
    else void load();
  }

  const isSelf = (m: MemberView) => m.user_id === user?.id;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('members.title')} lede={t('members.subtitle', { name: fam.current!.name })} />
      {error && <ErrorNotice className="mb-6" message={t(`errors.${error}`)} onRetry={() => void load()} />}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <SectionCard title={t('members.listTitle')}>
          {!members && !error ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : members && members.length === 0 ? (
            <EmptyState icon={<Users />} title={t('members.empty')} />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {(members ?? []).map((m) => {
                const editable = fam.canManage && m.role !== 'owner' && !isSelf(m);
                const removable = m.role !== 'owner' && (fam.canManage || isSelf(m));
                const name = m.display_name || t('members.unnamed');
                return (
                  <li key={m.user_id} className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <HeritageAvatar name={name} seed={m.user_id} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold text-ink">
                          {name}
                          {isSelf(m) && <span className="ml-2 text-[0.85rem] font-normal text-ink-soft">{t('members.you')}</span>}
                        </p>
                        <p className="break-words text-[0.9rem] text-ink-soft">{[m.relation, t('members.since', { date: formatDateSafe(m.created_at) })].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 min-[420px]:pl-15 sm:pl-0">
                      {editable ? (
                        <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                          <Select aria-label={t('members.roleFor', { name })} value={m.role} disabled={busyId === m.user_id} onChange={(e) => void changeRole(m, e.target.value as MemberRole)}>
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {t(`roles.${r}`)}
                              </option>
                            ))}
                          </Select>
                        </div>
                      ) : (
                        <Badge tone={m.role === 'owner' ? 'heritage' : 'mint'}>{t(`roles.${m.role}`)}</Badge>
                      )}
                      {removable && (
                        <Button variant="ghost" iconOnly aria-label={isSelf(m) ? t('members.leave') : t('members.removeFor', { name })} onClick={() => setConfirmRemove(m)}>
                          <Trash2 className="size-5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-2xl bg-cream p-4 text-[0.9rem] text-ink-soft sm:grid-cols-2 sm:p-5">
            {(['owner', 'manager', 'editor', 'viewer'] as const).map((r) => (
              <div key={r} className="min-w-0">
                <dt className="font-semibold text-ink">{t(`roles.${r}`)}</dt>
                <dd className="mt-0.5 text-pretty leading-snug">{t(`roles.${r}Desc`)}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <div ref={inviteRef} className="flex flex-col gap-6">
          {fam.canManage ? (
            <>
              <InviteForm familyId={familyId} onCreated={() => void load()} />
              {invites.length > 0 && (
                <SectionCard title={t('invite.pendingTitle')}>
                  <ul className="flex flex-col gap-3">
                    {invites.map((inv) => {
                      const expired = new Date(inv.expires_at).getTime() < Date.now();
                      return (
                        <li key={inv.id} className="flex min-w-0 items-start gap-3 rounded-2xl bg-cream p-3">
                          <Mail aria-hidden="true" className="mt-1 size-5 shrink-0 text-heritage" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-ink [overflow-wrap:anywhere]">{inv.email}</p>
                            <p className="text-[0.85rem] text-ink-soft">
                              {t(`roles.${inv.role}`)}
                              {inv.relation ? ` · ${inv.relation}` : ''}
                            </p>
                            <p className="mt-1">
                              {inv.accepted_at ? (
                                <Badge size="sm" tone="heritage">{t('invite.accepted')}</Badge>
                              ) : expired ? (
                                <Badge size="sm" tone="terracotta">{t('invite.expired')}</Badge>
                              ) : (
                                <Badge size="sm" tone="warning" className={WRAP_BADGE}>{t('invite.pendingUntil', { date: formatDateSafe(inv.expires_at) })}</Badge>
                              )}
                            </p>
                          </div>
                          {!inv.accepted_at && (
                            <Button variant="ghost" iconOnly aria-label={t('invite.cancelFor', { email: inv.email })} onClick={() => void deleteInvite(inv)}>
                              <Trash2 className="size-5" aria-hidden="true" />
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </SectionCard>
              )}
            </>
          ) : (
            <Card tone="mint" padding="md">
              <p className="leading-relaxed text-ink">{t('members.askManager')}</p>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        size="sm"
        title={confirmRemove && isSelf(confirmRemove) ? t('members.leaveTitle') : t('members.removeTitle')}
        description={
          confirmRemove && (isSelf(confirmRemove) ? t('members.leaveBody', { family: fam.current!.name }) : t('members.removeBody', { name: confirmRemove.display_name || t('members.unnamed') }))
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(null)}>
              {tc('actions.cancel')}
            </Button>
            <Button variant="terracotta" loading={busyId !== null} onClick={() => confirmRemove && void remove(confirmRemove)}>
              {confirmRemove && isSelf(confirmRemove) ? t('members.leave') : t('members.remove')}
            </Button>
          </>
        }
      />
    </div>
  );

  function formatDateSafe(iso: string) {
    return formatDate(iso, locale);
  }
}

function InviteForm({ familyId, onCreated }: { familyId: string; onCreated: () => void }) {
  const t = useT('family');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('viewer');
  const [relation, setRelation] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<FamilyErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; email: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setEmailError(t('invite.emailInvalid'));
      return;
    }
    setEmailError(null);
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.rpc('create_family_invite', {
      p_family: familyId,
      p_email: value,
      p_role: role,
      p_relation: relation.trim() || undefined,
      p_ttl_days: 14,
    });
    setBusy(false);
    if (err || !data) {
      setError(rpcErrorCode(err));
      return;
    }
    setLink({ url: inviteUrl(data), email: value });
    setEmail('');
    setRelation('');
    onCreated();
  }

  return (
    <SectionCard title={t('invite.title')} description={t('invite.subtitle')}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t('invite.email')} error={emailError} required>
          <Input type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t('invite.role')}>
          <Select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('invite.relation')} hint={t('invite.relationHint')}>
          <Input value={relation} maxLength={60} onChange={(e) => setRelation(e.target.value)} />
        </Field>
        <div aria-live="assertive">{error && <ErrorNotice message={t(`errors.${error}`)} />}</div>
        <Button type="submit" className="text-balance text-center" loading={busy} leftIcon={<UserPlus className="size-4" aria-hidden="true" />}>
          {t('invite.submit')}
        </Button>
      </form>
      {link && (
        <div role="status" className="mt-6 rounded-2xl bg-mint/50 p-4">
          <p className="mb-3 font-semibold text-heritage-deep [overflow-wrap:anywhere]">{t('invite.created', { email: link.email })}</p>
          <CopyField value={link.url} label={t('invite.linkLabel')} />
          <p className="text-[0.88rem] leading-relaxed text-ink-soft">{t('invite.onceWarning')}</p>
        </div>
      )}
    </SectionCard>
  );
}
