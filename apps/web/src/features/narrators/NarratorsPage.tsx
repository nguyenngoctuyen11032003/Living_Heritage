// /gia-dinh/nguoi-ke: narrators of the current family, storytelling links (QR) and revocation.
import { Languages, Link2, Mic, Pencil, Plus, Smartphone, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Badge, Button, Card, Dialog, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { useCurrentFamily } from '@/features/families/current';
import { FamilyGate } from '@/features/families/FamilyGate';
import { rpcErrorCode } from '@/features/families/rpcError';
import { ErrorNotice, PageHeader } from '@/features/families/states';
import { CreateLinkDialog } from './CreateLinkDialog';
import { useNarrators, type Narrator, type NarratorLink } from './hooks';
import { linkStatus, type LinkStatus } from './linkStatus';
import { NarratorFormDialog } from './NarratorFormDialog';
import { assistedTellPath } from './urls';

export default function NarratorsPage() {
  return (
    <FamilyGate>
      <Narrators />
    </FamilyGate>
  );
}

type LinkRow = Pick<NarratorLink, 'id' | 'narrator_id' | 'created_at' | 'expires_at' | 'claimed_at' | 'revoked_at'>;

function Narrators() {
  const t = useT('family');
  const fam = useCurrentFamily();
  const familyId = fam.current!.id;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const { narrators, loading, error, reload } = useNarrators(familyId);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [linksError, setLinksError] = useState(false);
  const [editing, setEditing] = useState<Narrator | 'new' | null>(null);
  const [linkFor, setLinkFor] = useState<Narrator | null>(null);
  const [revoking, setRevoking] = useState<LinkRow | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);

  const ids = useMemo(() => narrators.map((n) => n.id).join(','), [narrators]);
  const loadLinks = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !fam.canManage || !ids) {
      setLinks([]);
      return;
    }
    const { data, error: err } = await sb
      .from('narrator_links')
      .select('id, narrator_id, created_at, expires_at, claimed_at, revoked_at')
      .in('narrator_id', ids.split(','))
      .order('created_at', { ascending: false });
    setLinksError(Boolean(err));
    setLinks(data ?? []);
  }, [ids, fam.canManage]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  // /gia-dinh/nguoi-ke?new=1 (from onboarding) opens the create dialog once.
  useEffect(() => {
    if (params.get('new') === '1' && fam.canEdit) {
      setEditing('new');
      const nextParams = new URLSearchParams(params);
      nextParams.delete('new');
      setParams(nextParams, { replace: true });
    }
  }, [params, setParams, fam.canEdit]);

  async function revoke() {
    const sb = getSupabase();
    if (!sb || !revoking) return;
    setRevokeBusy(true);
    const { error: err } = await sb.rpc('revoke_narrator_link', { p_link: revoking.id });
    setRevokeBusy(false);
    setRevoking(null);
    if (err) toast({ title: t(`errors.${rpcErrorCode(err)}`), tone: 'error' });
    else {
      toast({ title: t('links.revoked'), tone: 'success' });
      void loadLinks();
      void reload();
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t('narrators.title')}
        description={t('narrators.subtitle')}
        actions={
          fam.canEdit &&
          narrators.length > 0 && (
            <Button onClick={() => setEditing('new')} leftIcon={<Plus className="size-4" aria-hidden="true" />}>
              {t('narrators.add')}
            </Button>
          )
        }
      />

      {error ? (
        <ErrorNotice message={t('narrators.loadError')} onRetry={() => void reload()} />
      ) : loading ? (
        <div aria-busy="true" className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : narrators.length === 0 ? (
        <EmptyState
          icon={<Mic />}
          title={t('narrators.emptyTitle')}
          description={t('narrators.emptyBody')}
          action={
            fam.canEdit ? (
              <Button size="lg" onClick={() => setEditing('new')} leftIcon={<Plus className="size-5" aria-hidden="true" />}>
                {t('narrators.add')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {linksError && <ErrorNotice className="mb-4" message={t('links.loadError')} onRetry={() => void loadLinks()} />}
          <ul className="grid gap-5 md:grid-cols-2">
            {narrators.map((n) => (
              <li key={n.id}>
                <NarratorCard
                  narrator={n}
                  links={links.filter((l) => l.narrator_id === n.id)}
                  canEdit={fam.canEdit}
                  canManage={fam.canManage}
                  onEdit={() => setEditing(n)}
                  onCreateLink={() => setLinkFor(n)}
                  onAssisted={() => navigate(assistedTellPath(n.id))}
                  onRevoke={setRevoking}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <NarratorFormDialog
        open={editing !== null}
        familyId={familyId}
        narrator={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          toast({ title: editing === 'new' ? t('narrators.created') : t('narrators.saved'), tone: 'success' });
          setEditing(null);
          void reload();
        }}
      />
      <CreateLinkDialog narrator={linkFor} onClose={() => setLinkFor(null)} onCreated={() => void loadLinks()} />
      <Dialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        size="sm"
        title={t('links.revokeTitle')}
        description={t('links.revokeBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevoking(null)}>
              {t('links.keep')}
            </Button>
            <Button variant="terracotta" loading={revokeBusy} onClick={() => void revoke()}>
              {t('links.revoke')}
            </Button>
          </>
        }
      />
    </div>
  );
}

const statusTone: Record<LinkStatus, 'mint' | 'heritage' | 'terracotta' | 'outline'> = {
  active: 'mint',
  claimed: 'heritage',
  expired: 'outline',
  revoked: 'terracotta',
};

function NarratorCard({
  narrator: n,
  links,
  canEdit,
  canManage,
  onEdit,
  onCreateLink,
  onAssisted,
  onRevoke,
}: {
  narrator: Narrator;
  links: LinkRow[];
  canEdit: boolean;
  canManage: boolean;
  onEdit: () => void;
  onCreateLink: () => void;
  onAssisted: () => void;
  onRevoke: (l: LinkRow) => void;
}) {
  const t = useT('family');
  const { locale } = useLocale();
  const meta = [n.birth_year ? t('narrators.born', { year: n.birth_year }) : null, n.region ? t(`regions.${n.region as 'bac' | 'trung' | 'nam'}`) : null].filter(Boolean).join(' · ');
  const name = n.pen_name || n.display_name;
  return (
    <Card padding="md" className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-4">
        <div aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-mint text-heritage">
          <UserRound className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-[1.35rem] font-semibold text-heritage-deep">{n.display_name}</h2>
          {n.pen_name && <p className="text-[0.95rem] text-ink-soft">{t('narrators.penNameShown', { name: n.pen_name })}</p>}
          {n.relation && <p className="text-[0.95rem] font-semibold text-ink">{n.relation}</p>}
          {meta && <p className="text-[0.95rem] text-ink-soft">{meta}</p>}
          <p className="mt-2 flex flex-wrap gap-2">
            <Badge tone="outline" icon={<Languages />}>
              {t(`narrators.langShown.${n.lang === 'en' ? 'en' : 'vi'}`)}
            </Badge>
            {n.generation && <Badge tone="outline">{t('narrators.generationShown', { n: n.generation })}</Badge>}
            {n.user_id ? (
              <Badge tone="heritage" icon={<Smartphone />}>
                {t('narrators.deviceBound')}
              </Badge>
            ) : (
              <Badge tone="outline">{t('narrators.noDevice')}</Badge>
            )}
          </p>
        </div>
        {canEdit && (
          <Button variant="ghost" iconOnly aria-label={t('narrators.editFor', { name: n.display_name })} onClick={onEdit}>
            <Pencil className="size-5" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canManage && (
          <Button onClick={onCreateLink} leftIcon={<Link2 className="size-4" aria-hidden="true" />}>
            {t('narrators.createLink')}
          </Button>
        )}
        {canEdit && (
          <Button variant="secondary" onClick={onAssisted} leftIcon={<Mic className="size-4" aria-hidden="true" />}>
            {t('narrators.tellTogether', { name })}
          </Button>
        )}
      </div>

      {canManage && links.length > 0 && (
        <details className="group rounded-2xl bg-cream p-3 ring-1 ring-line">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 font-semibold text-ink">
            {t('links.listTitle', { n: links.length })}
            <span aria-hidden="true" className="text-ink-soft transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {links.map((l) => {
              const status = linkStatus(l);
              return (
                <li key={l.id} className="flex flex-col gap-2 px-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 text-[0.9rem] text-ink-soft">
                    <p>
                      <Badge size="sm" tone={statusTone[status]}>
                        {t(`links.status.${status}`)}
                      </Badge>
                    </p>
                    <p className="mt-1">{t('links.createdOn', { date: formatDate(l.created_at, locale) })}</p>
                    <p>
                      {status === 'claimed' && l.claimed_at
                        ? t('links.claimedOn', { date: formatDate(l.claimed_at, locale) })
                        : status === 'revoked' && l.revoked_at
                          ? t('links.revokedOn', { date: formatDate(l.revoked_at, locale) })
                          : t('links.expiresOn', { date: formatDate(l.expires_at, locale) })}
                    </p>
                  </div>
                  {status !== 'revoked' && status !== 'expired' && (
                    <Button variant="ghost" onClick={() => onRevoke(l)}>
                      {t('links.revoke')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </Card>
  );
}
