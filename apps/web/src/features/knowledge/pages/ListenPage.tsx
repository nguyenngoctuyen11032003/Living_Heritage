import { Headphones, Home, Lock, LogIn, RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router';
import { AudioPlayer, Button, ButtonLink, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { PageState } from '../components/PageState';
import { loadListen, type ListenResult } from '../listen';
import { usePageTitle } from '@/lib/usePageTitle';

type State = { key: string; result: ListenResult | null; error: boolean };

/**
 * /nghe/:storyId — QR target from memory books, usually opened by elders on a phone: very large type,
 * one obvious action. Family-only; never reveals the title when forbidden.
 */
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
  const ready = user && state.key === key && state.result?.status === 'ready' ? state.result : null;

  usePageTitle(ready ? ready.title : t('meta.listen'));

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
    body = <PageState title={tc('states.notConfigured')} action={<ButtonLink to="/" size="xl">{t('listen.home')}</ButtonLink>} />;
  } else if (sessionLoading || (user && state.key !== key)) {
    body = (
      <div aria-busy="true" className="rounded-[2rem] bg-paper p-8 ring-1 ring-line sm:p-10">
        <p role="status" className="text-[1.2rem] text-ink-soft">
          {t('listen.checking')}
        </p>
        <Skeleton className="mt-6 h-10 w-4/5" />
        <Skeleton className="mt-8 h-28 w-full rounded-[1.5rem]" />
      </div>
    );
  } else if (state.error && user) {
    body = (
      <BigCard role="alert" icon={<RotateCcw />} title={t('states.itemError')}>
        <Button size="xl" fullWidth onClick={() => setNonce((n) => n + 1)} leftIcon={<RotateCcw aria-hidden="true" className="size-5" />}>
          {t('states.retry')}
        </Button>
      </BigCard>
    );
  } else if (!ready) {
    body = (
      <BigCard icon={<Lock />} kicker={t('listen.kicker')} title={t('listen.forbiddenTitle')} description={t('listen.forbiddenBody')}>
        <ButtonLink to={`/dang-nhap?next=${next}`} size="xl" fullWidth leftIcon={<LogIn aria-hidden="true" className="size-5" />}>
          {user ? t('listen.otherAccount') : t('listen.login')}
        </ButtonLink>
        <ButtonLink to="/" variant="ghost" size="xl" fullWidth leftIcon={<Home aria-hidden="true" className="size-5" />}>
          {t('listen.home')}
        </ButtonLink>
      </BigCard>
    );
  } else {
    const r = ready;
    body = (
      <article className="rounded-[2rem] bg-night p-6 text-night-ink shadow-[0_30px_60px_-40px_rgba(18,27,24,0.8)] sm:p-10">
        <p className="flex items-center gap-2.5 text-[1rem] font-semibold text-night-ink/85">
          <Headphones aria-hidden="true" className="size-6" />
          {t('listen.kicker')}
        </p>
        <h1 className="mt-5 break-words font-serif text-[clamp(2rem,1.5rem+2.4vw,3rem)] font-semibold leading-[1.25]">{r.title}</h1>
        {r.narrator && <p className="mt-3 text-[1.25rem] text-night-ink/85">{t('listen.narrator', { name: r.narrator })}</p>}
        {r.audioUrl ? (
          <>
            <AudioPlayer src={r.audioUrl} duration={r.durationS ?? 0} title={r.title} subtitle={r.narrator ?? undefined} tone="dark" className="mt-8" />
            <p className="mt-4 text-[1rem] text-night-ink/75">{t('listen.linkExpiry')}</p>
          </>
        ) : (
          <p role={r.audioError ? 'alert' : undefined} className="mt-8 rounded-2xl bg-white/6 px-5 py-4 text-[1.2rem] leading-relaxed text-night-ink/90">
            {r.audioError ? t('listen.audioError') : t('listen.noAudio')}
          </p>
        )}
        <p className="mt-8 border-t border-white/10 pt-5 text-[1.05rem] leading-relaxed text-night-ink/75">{t('listen.privateNote')}</p>
      </article>
    );
  }

  return (
    <div className="min-h-[70vh] bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-20">{body}</div>
    </div>
  );
}

/** Large, centred message card for elders: big icon, big serif title, 20px body, full-width 64px actions. */
function BigCard({
  icon,
  kicker,
  title,
  description,
  role,
  children,
}: {
  icon: ReactNode;
  kicker?: string;
  title: string;
  description?: string;
  role?: 'alert';
  children: ReactNode;
}) {
  return (
    <section role={role} className="flex flex-col items-center rounded-[2rem] bg-paper px-6 py-10 text-center ring-1 ring-line sm:px-10 sm:py-14">
      <span aria-hidden="true" className="inline-flex size-20 items-center justify-center rounded-full bg-mint text-heritage [&>svg]:size-8">
        {icon}
      </span>
      {kicker && <p className="mt-6 text-[1rem] font-semibold text-terracotta">{kicker}</p>}
      <h1 className="mt-3 text-balance font-serif text-[clamp(1.75rem,1.4rem+1.6vw,2.4rem)] font-semibold leading-[1.25] text-heritage-deep">{title}</h1>
      {description && <p className="mt-4 max-w-[34ch] text-[1.25rem] leading-relaxed text-ink-soft">{description}</p>}
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">{children}</div>
    </section>
  );
}
