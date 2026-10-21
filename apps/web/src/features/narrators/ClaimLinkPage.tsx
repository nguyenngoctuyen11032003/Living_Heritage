// /k/:token (bare): opens a storytelling link on the narrator's device.
import { CircleSlash, Clock, Home, KeyRound, Link2Off, LogOut, RefreshCw, UserCheck, WifiOff } from 'lucide-react';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { LogoMark } from '@/components/layout/Logo';
import { Button, ButtonLink, Spinner } from '@/components/ui';
import { useT } from '@/i18n';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { claimErrorCode, claimReducer, initialClaimState, looksLikeToken, type ClaimErrorCode } from './claimMachine';
import { NARRATOR_ID_KEY } from './urls';

export default function ClaimLinkPage() {
  const { token } = useParams<{ token: string }>();
  const t = useT('auth');
  const navigate = useNavigate();
  const { user, loading: sessionLoading, isAnonymous } = useSession();
  const [state, dispatch] = useReducer(claimReducer, initialClaimState);
  const started = useRef(new Set<string>());
  const [signingOut, setSigningOut] = useState(false);

  // checking → decide by the current session
  useEffect(() => {
    if (state.kind !== 'checking' || sessionLoading) return;
    if (!getSupabase()) dispatch({ type: 'NOT_CONFIGURED' });
    else if (!looksLikeToken(token)) dispatch({ type: 'FAILED', code: 'link_not_found' });
    else dispatch({ type: 'SESSION', session: !user ? 'none' : isAnonymous ? 'anonymous' : 'family' });
  }, [state.kind, sessionLoading, user, isAnonymous, token]);

  // side effects for signing_in / claiming / done (once per attempt, StrictMode-safe)
  useEffect(() => {
    const key = `${state.kind}:${state.attempt}`;
    if (started.current.has(key)) return;
    const sb = getSupabase();
    if (state.kind === 'signing_in' && sb) {
      started.current.add(key);
      void sb.auth.signInAnonymously().then(
        ({ error }) => dispatch(error ? { type: 'FAILED', code: claimErrorCode(error) } : { type: 'SIGNED_IN' }),
        (e: unknown) => dispatch({ type: 'FAILED', code: claimErrorCode(e) }),
      );
    } else if (state.kind === 'claiming' && sb && token) {
      started.current.add(key);
      void sb.rpc('claim_narrator_link', { p_token: token }).then(
        ({ data, error }) => dispatch(error || !data ? { type: 'FAILED', code: claimErrorCode(error) } : { type: 'CLAIMED', narratorId: data }),
        (e: unknown) => dispatch({ type: 'FAILED', code: claimErrorCode(e) }),
      );
    } else if (state.kind === 'done') {
      started.current.add(key);
      try {
        localStorage.setItem(NARRATOR_ID_KEY, state.narratorId);
      } catch {
        /* storage blocked: the storytelling page falls back to useMyNarrator() */
      }
      navigate('/ke-chuyen', { replace: true });
    }
  }, [state, token, navigate]);

  async function signOutAndOpen() {
    setSigningOut(true);
    await getSupabase()?.auth.signOut();
    setSigningOut(false);
    dispatch({ type: 'SIGNED_OUT' });
  }

  let body: ReactNode;
  if (state.kind === 'needs_signout') {
    body = (
      <Panel icon={<UserCheck />} title={t('link.familyTitle')} text={t('link.familyBody')}>
        <Button size="xl" onClick={signOutAndOpen} loading={signingOut} leftIcon={<LogOut className="size-5" aria-hidden="true" />}>
          {t('link.signOutAndOpen')}
        </Button>
        <ButtonLink to="/gia-dinh/nguoi-ke" variant="secondary" size="xl">
          {t('link.backToFamily')}
        </ButtonLink>
        <p className="mt-2 max-w-md text-[1rem] leading-relaxed text-ink-soft">{t('link.assistedHint')}</p>
      </Panel>
    );
  } else if (state.kind === 'error') {
    body = <ErrorPanel code={state.code} onRetry={() => dispatch({ type: 'RETRY' })} />;
  } else {
    const step = state.kind === 'claiming' || state.kind === 'done' ? t('link.stepClaiming') : state.kind === 'signing_in' ? t('link.stepSigningIn') : t('link.stepChecking');
    body = (
      <div className="flex flex-col items-center text-center" aria-busy="true">
        <Spinner size="lg" decorative className="text-heritage" />
        <h1 className="mt-8 text-balance font-serif text-[clamp(2rem,6vw,3.2rem)] font-semibold leading-tight text-heritage-deep">{t('link.opening')}</h1>
        <p aria-live="polite" className="mt-4 text-[1.25rem] leading-relaxed text-ink-soft">
          {step}
        </p>
      </div>
    );
  }

  return (
    <div className="narrator-mode relative flex min-h-dvh flex-col overflow-hidden bg-cream text-ink">
      <WarmBackdrop />
      <header className="relative flex items-center justify-between px-5 py-4 md:px-10">
        <span className="inline-flex items-center gap-2 font-serif text-[1.2rem] font-semibold text-heritage">
          <LogoMark />
          {t('link.brand')}
        </span>
        <LanguageSwitch />
      </header>
      <main id="main" className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 pb-16 pt-6">
        {body}
      </main>
    </div>
  );
}

function Panel({ icon, title, text, children, tone = 'heritage' }: { icon: ReactNode; title: string; text: string; children?: ReactNode; tone?: 'heritage' | 'terracotta' }) {
  return (
    <section role={tone === 'terracotta' ? 'alert' : undefined} className="flex w-full flex-col items-center text-center">
      <div aria-hidden="true" className={tone === 'terracotta' ? 'inline-flex size-20 items-center justify-center rounded-3xl bg-terracotta/10 text-terracotta [&>svg]:size-10' : 'inline-flex size-20 items-center justify-center rounded-3xl bg-mint text-heritage [&>svg]:size-10'}>
        {icon}
      </div>
      <h1 className="mt-6 text-balance font-serif text-[clamp(1.9rem,5.5vw,2.8rem)] font-semibold leading-tight text-heritage-deep">{title}</h1>
      <p className="mt-4 max-w-xl text-[1.25rem] leading-relaxed text-ink">{text}</p>
      {children && <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3">{children}</div>}
    </section>
  );
}

const errorIcons: Record<ClaimErrorCode, ReactNode> = {
  link_expired: <Clock />,
  link_revoked: <CircleSlash />,
  link_already_claimed: <KeyRound />,
  link_not_found: <Link2Off />,
  anonymous_disabled: <CircleSlash />,
  not_configured: <CircleSlash />,
  network: <WifiOff />,
  unknown: <CircleSlash />,
};

function ErrorPanel({ code, onRetry }: { code: ClaimErrorCode; onRetry: () => void }) {
  const t = useT('auth');
  const retryable = code === 'network' || code === 'unknown';
  return (
    <Panel tone="terracotta" icon={errorIcons[code]} title={t(`link.errors.${code}.title`)} text={t(`link.errors.${code}.body`)}>
      {retryable && (
        <Button size="xl" onClick={onRetry} leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}>
          {t('link.retry')}
        </Button>
      )}
      <ButtonLink to="/" variant="secondary" size="xl" leftIcon={<Home className="size-5" aria-hidden="true" />}>
        {t('link.home')}
      </ButtonLink>
    </Panel>
  );
}

function WarmBackdrop() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 600">
      <defs>
        <radialGradient id="lh-k-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f6e6c8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#faf7f0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#lh-k-glow)" />
      <path d="M-20 520 C 160 470, 300 560, 460 510 S 720 470, 820 520 L 820 620 L -20 620 Z" fill="#dce8d5" opacity="0.55" />
      <path d="M-20 560 C 180 520, 340 600, 520 555 S 760 530, 820 560 L 820 620 L -20 620 Z" fill="#214e43" opacity="0.12" />
    </svg>
  );
}
