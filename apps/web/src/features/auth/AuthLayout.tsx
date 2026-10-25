import { BadgeCheck, Download, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { LazyVideo, VideoPlaybackProvider, VideoToggle, VIDEOS } from '@/components/memory-book';
import { Reveal } from '@/components/motion';
import { useDisplayFont } from '@/design/useDisplayFont';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import './auth.css';

/** A reader on a hillside at dusk (the /sach-ky-uc print clip); decorative atmosphere only (see memory-book/playback.ts). */
const CLIP = VIDEOS.print;

const TRUST: { key: 'private' | 'approve' | 'control'; icon: LucideIcon }[] = [
  { key: 'private', icon: ShieldCheck },
  { key: 'approve', icon: BadgeCheck },
  { key: 'control', icon: Download },
];

/**
 * Auth pages in the cinema style of the homepage and /kham-pha: kicker + display serif title, the form on a solid card,
 * and (desktop) a dark film panel as tall as the form row with the proverb and the three privacy promises. Phones get the promises as a
 * quiet row under the form instead of the panel.
 */
export function AuthLayout({ kicker, title, subtitle, children, footer }: { kicker?: ReactNode; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useDisplayFont();
  return (
    <VideoPlaybackProvider>
      <div className="mb-page relative isolate overflow-hidden">
        <div aria-hidden="true" className="auth-glow" />
        <div className="mx-auto grid w-full max-w-[1264px] grid-cols-1 gap-10 px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-stretch lg:gap-14 lg:px-8 lg:pb-12 lg:pt-6 xl:gap-20">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="mx-auto w-full max-w-[30rem] lg:mx-0 xl:mx-auto">
              <Reveal y={16}>
                {kicker && <p className="text-[0.78rem] font-medium uppercase tracking-[0.2em] text-heritage">{kicker}</p>}
                <h1 className="mb-display mt-4 text-balance break-words text-[clamp(2.35rem,4.4vw,3.5rem)] text-heritage-deep">{title}</h1>
                {subtitle && <p className="mt-4 text-pretty text-[1.05rem] leading-relaxed text-ink-soft">{subtitle}</p>}
              </Reveal>
              <Reveal y={20} delay={0.08}>
                <div className="auth-card mt-8 rounded-[1.75rem] p-5 sm:p-8">{children}</div>
              </Reveal>
              {footer && <div className="mt-6 text-balance text-center text-[0.95rem] leading-relaxed text-ink-soft">{footer}</div>}
              <TrustList className="mt-10 border-t border-line pt-6 lg:hidden" />
            </div>
          </div>
          <FilmPanel />
        </div>
      </div>
    </VideoPlaybackProvider>
  );
}

function TrustList({ className }: { className?: string }) {
  const t = useT('auth');
  return (
    <ul className={cn('flex flex-wrap justify-center gap-x-5 gap-y-3 text-[0.85rem] font-medium text-ink-soft', className)}>
      {TRUST.map(({ key, icon: Icon }) => (
        <li key={key} className="inline-flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4 text-heritage" />
          {t(`layout.trust.${key}`)}
        </li>
      ))}
    </ul>
  );
}

/** Dark film panel (both themes): looping clip over a still fallback, proverb in display serif, glass promise chips. */
function FilmPanel() {
  const t = useT('auth');
  return (
    <aside
      aria-label={t('layout.panelLabel')}
      className="auth-film relative isolate hidden overflow-hidden rounded-[2rem] text-cream-fixed lg:flex lg:min-h-[34rem] lg:flex-col"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <LazyVideo src={CLIP} />
      </div>
      <div aria-hidden="true" className="auth-film__wash absolute inset-0 -z-10" />

      <div className="flex items-center justify-between gap-4 p-6 xl:p-8">
        <span className="liquid-glass mb-media inline-flex min-h-11 items-center gap-3 rounded-full bg-black/25 px-4 text-[0.82rem] font-medium tracking-[0.04em]">
          <Wave />
          {t('layout.tag')}
        </span>
        <VideoToggle />
      </div>

      <div className="mt-auto p-6 xl:p-10">
        <p className="text-[0.78rem] font-medium uppercase tracking-[0.2em] text-cream-fixed/80">{t('layout.eyebrow')}</p>
        <blockquote className="mt-4">
          <p className="mb-display text-balance text-[clamp(2.2rem,3.6vw,3.4rem)] text-cream-fixed">“{t('layout.quote')}”</p>
          <footer className="mt-3 text-[0.92rem] text-cream-fixed/75">— {t('layout.quoteSource')}</footer>
        </blockquote>
        <p className="mt-6 max-w-md text-pretty leading-relaxed text-cream-fixed/85">{t('layout.body')}</p>
        <ul className="mt-7 flex flex-wrap gap-2.5">
          {TRUST.map(({ key, icon: Icon }) => (
            <li key={key} className="liquid-glass mb-media inline-flex min-h-10 items-center gap-2 rounded-full bg-black/25 px-4 text-[0.85rem] font-medium">
              <Icon aria-hidden="true" className="size-4 text-mint-fixed" />
              {t(`layout.trust.${key}`)}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/** Five-bar voice wave (the logo's motif), gently breathing unless reduced motion is on. */
function Wave() {
  const bars = [0.45, 0.8, 1, 0.65, 0.4];
  return (
    <span aria-hidden="true" className="auth-film__wave flex h-4 items-end gap-[3px]">
      {bars.map((h, i) => (
        <span key={i} style={{ height: `${h * 100}%`, '--wave-delay': `${i * 0.18}s`, '--wave-from': 0.4 } as CSSProperties} />
      ))}
    </span>
  );
}
