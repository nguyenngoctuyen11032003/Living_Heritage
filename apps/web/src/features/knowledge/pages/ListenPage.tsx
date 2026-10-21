import { Headphones, Home, Lock, LogIn, RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router';
import { AudioPlayer, Button, ButtonLink, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { PageState } from '../components/PageState';
import { loadListen, type ListenResult } from '../listen';

type State = { key: string; result: ListenResult | null; error: boolean };

/** /nghe/:storyId — QR target from memory books. Family-only; never reveals the title when forbidden. */
export default function ListenPage() {
  const { storyId } = useParams();
  const t = useT('knowledge');
  const tc = useT('common');
  const location = useLocation();
  const { user, loading: sessionLoading } = useSession();
  const sb = getSupabase();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State>({ key: '', result: null, error: false });
  const key = `${storyId ?? ''}|${user?.id ?? ''}|${nonce}`;
  const next = encodeURIComponent(location.pathname);

  useEffect(() => {
    if (!sb || !user) return;
    let alive = true;
    loadListen(sb, storyId)
      .then((result) => alive && setState({ key, result, error: false }))
      .catch(() => alive && setState({ key, result: null, error: true }));
    return () => {
      alive = false;
    };
  }, [sb, user, storyId, key]);

  let body: ReactNode;
  if (!sb) {
    body = <PageState title={tc('states.notConfigured')} action={<ButtonLink to="/">{t('listen.home')}</ButtonLink>} />;
  } else if (sessionLoading || (user && state.key !== key)) {
    body = (
      <div aria-busy="true" className="rounded-[1.75rem] bg-paper p-8 ring-1 ring-line">
        <p role="status" className="sr-only">
          {t('listen.checking')}
        </p>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-5 h-9 w-4/5" />
        <Skeleton className="mt-8 h-24 w-full rounded-[1.5rem]" />
      </div>
    );
  } else if (state.error && user) {
    body = (
      <div role="alert">
        <PageState
          title={t('states.itemError')}
          action={
            <Button onClick={() => setNonce((n) => n + 1)} leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
              {t('states.retry')}
            </Button>
          }
        />
      </div>
    );
  } else if (!user || !state.result || state.result.status === 'forbidden') {
    body = (
      <PageState
        icon={<Lock />}
        title={t('listen.forbiddenTitle')}
        description={t('listen.forbiddenBody')}
        action={
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <ButtonLink to={`/dang-nhap?next=${next}`} leftIcon={<LogIn aria-hidden="true" className="size-4" />}>
              {user ? t('listen.otherAccount') : t('listen.login')}
            </ButtonLink>
            <ButtonLink to="/" variant="ghost" leftIcon={<Home aria-hidden="true" className="size-4" />}>
              {t('listen.home')}
            </ButtonLink>
          </div>
        }
      />
    );
  } else {
    const r = state.result;
    body = (
      <article className="rounded-[1.75rem] bg-night p-6 text-night-ink shadow-[0_30px_60px_-40px_rgba(18,27,24,0.8)] md:p-9">
        <p className="flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.18em] text-night-ink/75">
          <Headphones aria-hidden="true" className="size-4" />
          {t('listen.kicker')}
        </p>
        <h1 className="mt-4 font-serif text-[1.8rem] font-semibold leading-snug md:text-[2.3rem]">{r.title}</h1>
        {r.narrator && <p className="mt-2 text-night-ink/80">{t('listen.narrator', { name: r.narrator })}</p>}
        {r.audioUrl ? (
          <>
            <AudioPlayer src={r.audioUrl} duration={r.durationS ?? 0} title={r.title} subtitle={r.narrator ?? undefined} tone="dark" compact className="mt-6" />
            <p className="mt-3 text-[0.82rem] text-night-ink/65">{t('listen.linkExpiry')}</p>
          </>
        ) : (
          <p role={r.audioError ? 'alert' : undefined} className="mt-6 rounded-2xl bg-white/6 px-4 py-3 text-night-ink/85">
            {r.audioError ? t('listen.audioError') : t('listen.noAudio')}
          </p>
        )}
        <p className="mt-6 border-t border-white/10 pt-4 text-[0.88rem] text-night-ink/70">{t('listen.privateNote')}</p>
      </article>
    );
  }

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">{body}</div>
    </div>
  );
}
