// /moi/:token (site): accept a family invite. Requires a real (non-anonymous) account.
import { HeartHandshake, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink, Card, Spinner } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCurrentFamily } from './current';
import { rpcErrorCode, type FamilyErrorCode } from './rpcError';
import { ErrorNotice, NotConfiguredNotice } from './states';

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const t = useT('family');
  usePageTitle(t('titles.acceptInvite'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAnonymous, loading } = useSession();
  const fam = useCurrentFamily();
  const [error, setError] = useState<FamilyErrorCode | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  const sb = getSupabase();
  const signedIn = Boolean(user) && !isAnonymous;

  useEffect(() => {
    if (!sb || !signedIn || !token || started.current === attempt) return;
    started.current = attempt;
    void (async () => {
      const { data, error: err } = await sb.rpc('accept_invite', { p_token: token });
      if (err || !data) {
        setError(rpcErrorCode(err));
        return;
      }
      await fam.reload();
      fam.select(data);
      navigate('/gia-dinh', { replace: true });
    })();
    // fam.reload/select are stable callbacks; re-running on fam changes would re-accept.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, signedIn, token, attempt, navigate]);

  if (!sb) {
    return (
      <Shell>
        <NotConfiguredNotice />
      </Shell>
    );
  }
  if (loading) return <Shell busy />;
  if (!signedIn) {
    const next = encodeURIComponent(location.pathname);
    return <Navigate to={`/dang-nhap?next=${next}`} replace />;
  }

  if (error) {
    const retryable = error === 'network' || error === 'unknown';
    return (
      <Shell>
        <h1 className="text-balance font-serif text-[clamp(1.6rem,5vw,1.9rem)] font-semibold leading-[1.25] text-heritage-deep">{t('acceptInvite.failedTitle')}</h1>
        <ErrorNotice className="mt-5" message={t(`errors.${error}`)} onRetry={
            retryable
              ? () => {
                  setError(null);
                  setAttempt((a) => a + 1);
                }
              : undefined
          } />
        {error === 'invite_email_mismatch' && (
          <p className="mt-4 break-words leading-relaxed text-ink-soft">{t('acceptInvite.signedInAs', { email: user?.email ?? '' })}</p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {error === 'invite_email_mismatch' && (
            <Button
              variant="secondary"
              leftIcon={<LogOut className="size-5" aria-hidden="true" />}
              onClick={async () => {
                await sb.auth.signOut();
                navigate(`/dang-nhap?next=${encodeURIComponent(location.pathname)}`, { replace: true });
              }}
            >
              {t('acceptInvite.switchAccount')}
            </Button>
          )}
          <ButtonLink to="/gia-dinh" variant="ghost">
            {t('acceptInvite.toVault')}
          </ButtonLink>
        </div>
      </Shell>
    );
  }
  return <Shell busy />;
}

function Shell({ children, busy }: { children?: React.ReactNode; busy?: boolean }) {
  const t = useT('family');
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 md:py-24">
      <Card padding="lg">
        <div aria-hidden="true" className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-mint text-heritage">
          <HeartHandshake className="size-7" />
        </div>
        {busy ? (
          <div role="status" aria-live="polite" className="flex items-center gap-3">
            <Spinner decorative className="text-heritage" />
            <p className="font-serif text-[clamp(1.3rem,4.5vw,1.5rem)] font-semibold leading-[1.3] text-heritage-deep">{t('acceptInvite.working')}</p>
          </div>
        ) : (
          children
        )}
      </Card>
    </div>
  );
}
