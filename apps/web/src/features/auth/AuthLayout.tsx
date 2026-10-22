import type { ReactNode } from 'react';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';

/** Warm two-column auth layout: form on the left, heritage illustration + proverb on the right (hidden on phones). */
export function AuthLayout({ title, subtitle, children, footer }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <Reveal className="flex min-w-0 flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-balance break-words font-serif text-[clamp(2rem,4.5vw,2.75rem)] font-semibold leading-[1.18] tracking-[-0.015em] text-heritage-deep">{title}</h1>
          {subtitle && <p className="mt-3 text-[1.05rem] leading-relaxed text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-[0.95rem] text-ink-soft">{footer}</div>}
        </div>
      </Reveal>
      <HeritagePanel />
    </div>
  );
}

function HeritagePanel() {
  const t = useT('auth');
  return (
    <aside aria-label={t('layout.panelLabel')} className="relative hidden min-h-[560px] overflow-hidden rounded-[2rem] bg-heritage-deep text-cream-fixed lg:flex lg:flex-col lg:justify-end">
      <HomeIllustration />
      <div className="relative p-10">
        <p className="font-hand text-[1.5rem] text-[#f2d9a6]">{t('layout.eyebrow')}</p>
        <blockquote className="mt-2">
          <p className="font-serif text-[2rem] font-semibold leading-snug">“{t('layout.quote')}”</p>
          <footer className="mt-3 text-[0.95rem] text-cream-fixed/75">{t('layout.quoteSource')}</footer>
        </blockquote>
        <p className="mt-6 max-w-sm leading-relaxed text-cream-fixed/85">{t('layout.body')}</p>
      </div>
    </aside>
  );
}

/** Evening porch: a tiled-roof house, lantern, tea and a sound-wave of a voice drifting up. Colours only. */
function HomeIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 480 360" preserveAspectRatio="xMidYMin slice" className="absolute inset-x-0 top-0 h-[68%] w-full">
      <defs>
        <linearGradient id="lh-auth-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#24564a" />
          <stop offset="100%" stopColor="#163a31" />
        </linearGradient>
        <radialGradient id="lh-auth-lamp" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f6c56b" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f6c56b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="480" height="360" fill="url(#lh-auth-sky)" />
      <circle cx="388" cy="70" r="26" fill="#f2d9a6" opacity="0.9" />
      <circle cx="378" cy="64" r="26" fill="#24564a" opacity="0.55" />
      <g fill="#e9e4d4" opacity="0.5">
        <circle cx="70" cy="50" r="1.6" />
        <circle cx="140" cy="88" r="1.2" />
        <circle cx="250" cy="40" r="1.4" />
        <circle cx="300" cy="110" r="1" />
        <circle cx="440" cy="140" r="1.2" />
      </g>
      {/* hills */}
      <path d="M0 250 C 80 205, 160 230, 240 212 S 400 190, 480 220 L 480 360 L 0 360 Z" fill="#1b4a3f" />
      {/* bamboo */}
      <g stroke="#2f6b5b" strokeWidth="5" strokeLinecap="round">
        <path d="M42 360 L 52 170" />
        <path d="M64 360 L 70 196" />
      </g>
      <g fill="#3c7f6b">
        <path d="M52 172 q 22 -6 34 6 q -20 6 -34 -6Z" />
        <path d="M58 200 q -24 -8 -36 4 q 22 8 36 -4Z" />
        <path d="M70 198 q 20 -10 34 0 q -18 8 -34 0Z" />
      </g>
      {/* house */}
      <path d="M150 232 L 240 176 L 330 232 Z" fill="#a84832" />
      <path d="M140 236 L 240 172 L 340 236" fill="none" stroke="#7d3424" strokeWidth="6" strokeLinejoin="round" />
      <rect x="164" y="232" width="152" height="92" fill="#e9dcc0" />
      <rect x="208" y="262" width="40" height="62" rx="3" fill="#7d5a3c" />
      <rect x="178" y="252" width="22" height="22" fill="#f6c56b" />
      <rect x="264" y="252" width="34" height="22" fill="#f6c56b" opacity="0.9" />
      <circle cx="300" cy="250" r="34" fill="url(#lh-auth-lamp)" />
      <path d="M300 236 v 6" stroke="#7d3424" strokeWidth="2" />
      <ellipse cx="300" cy="250" rx="7" ry="9" fill="#d9573c" />
      {/* voice wave rising */}
      <g fill="none" stroke="#f2d9a6" strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
        <path d="M232 160 v -14" />
        <path d="M242 164 v -26" />
        <path d="M252 158 v -12" />
        <path d="M222 162 v -20" />
        <path d="M262 160 v -18" />
      </g>
      <rect x="0" y="322" width="480" height="40" fill="#163a31" />
    </svg>
  );
}
