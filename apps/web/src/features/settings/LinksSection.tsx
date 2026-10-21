import { Link2, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, ButtonLink, Dialog, EmptyState, Skeleton, useToast } from '@/components/ui';
import type { FamilySummary } from '@/features/families/current';
import { ErrorNotice, SectionCard } from '@/features/families/states';
import type { Narrator } from '@/features/narrators/hooks';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { activeLinks, type LinkLike } from './links';
import { NARRATORS_PATH } from './paths';

export function LinksSection({ family, narrators, narratorsLoading, narratorsError, onNarratorsRetry }: {
  family: FamilySummary;
  narrators: Pick<Narrator, 'id' | 'display_name'>[];
  narratorsLoading: boolean;
  narratorsError: boolean;
  onNarratorsRetry: () => void;
}) {
  const t = useT('settings');
  const { locale } = useLocale();
  const { toast } = useToast();
  const [links, setLinks] = useState<LinkLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revoking, setRevoking] = useState<LinkLike | null>(null);
  const [busy, setBusy] = useState(false);

  const ids = useMemo(() => narrators.map((n) => n.id).join(','), [narrators]);
  const names = useMemo(() => new Map(narrators.map((n) => [n.id, n.display_name])), [narrators]);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    if (!ids) {
      setLinks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await sb
      .from('narrator_links')
      .select('id, narrator_id, created_at, expires_at, claimed_at, revoked_at')
      .in('narrator_id', ids.split(','))
      .is('revoked_at', null);
    setError(Boolean(err));
    setLinks(activeLinks(data ?? []));
    setLoading(false);
  }, [ids]);

  useEffect(() => {
    if (!narratorsLoading) void load();
  }, [load, narratorsLoading, family.id]);

  async function revoke() {
    const sb = getSupabase();
    if (!sb || !revoking) return;
    setBusy(true);
    const { error: err } = await sb.rpc('revoke_narrator_link', { p_link: revoking.id });
    setBusy(false);
    setRevoking(null);
    if (err) toast({ title: t('links.revokeFailed'), tone: 'error' });
    else {
      toast({ title: t('links.revoked'), tone: 'success' });
      void load();
    }
  }

  const nameOf = (id: string) => names.get(id) ?? t('links.unknownNarrator');

  let body;
  if (narratorsLoading || loading)
    body = (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  else if (narratorsError) body = <ErrorNotice message={t('states.loadError')} onRetry={onNarratorsRetry} />;
  else if (error) body = <ErrorNotice message={t('states.loadError')} onRetry={() => void load()} />;
  else if (links.length === 0)
    body = (
      <EmptyState icon={<Link2 />} title={t('links.emptyTitle')} description={t('links.emptyBody')} action={<ButtonLink to={NARRATORS_PATH} variant="secondary">{t('links.emptyAction')}</ButtonLink>} />
    );
  else
    body = (
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.id} className="flex flex-col gap-3 rounded-2xl bg-cream p-4 ring-1 ring-line sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold text-ink">{nameOf(l.narrator_id)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.85rem] text-ink-soft">
                {l.claimed_at ? (
                  <Badge tone="warning" size="sm" icon={<Smartphone />}>
                    {t('links.claimed')}
                  </Badge>
                ) : (
                  <Badge tone="outline" size="sm">
                    {t('links.waiting')}
                  </Badge>
                )}
                <span>{t('links.created', { date: formatDate(l.created_at, locale) })}</span>
                {!l.claimed_at && <span>· {t('links.expires', { date: formatDate(l.expires_at, locale) })}</span>}
              </div>
            </div>
            <Button variant="secondary" onClick={() => setRevoking(l)} aria-label={t('links.revokeFor', { name: nameOf(l.narrator_id) })}>
              {t('links.revoke')}
            </Button>
          </li>
        ))}
      </ul>
    );

  return (
    <SectionCard title={t('links.title')} description={t('links.body')}>
      {body}
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
            <Button variant="terracotta" loading={busy} onClick={() => void revoke()}>
              {t('links.revoke')}
            </Button>
          </>
        }
      />
    </SectionCard>
  );
}
