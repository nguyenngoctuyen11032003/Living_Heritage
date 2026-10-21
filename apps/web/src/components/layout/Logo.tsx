import { Link } from 'react-router';
import { baseDisplay } from '@/components/ui/display';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

/** Leaf-and-sound-wave mark + wordmark. */
export function LogoMark({ className, inner = 'var(--cream)' }: { className?: string; inner?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <path d="M16 3c7.5 3.2 11 9.2 9.6 16.2-.8 4-3.6 7.3-9.6 9.8-6-2.5-8.8-5.8-9.6-9.8C5 12.2 8.5 6.2 16 3Z" fill="currentColor" />
      <path d="M16 9v17" stroke={inner} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.5 15.5v4M20.5 14v6.5M13.8 13v9M18.2 12v10" stroke={inner} strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

export interface LogoProps {
  tone?: 'light' | 'dark';
  /**
   * `always` (default) shows the wordmark at every width; `sm` shows only the mark below the `sm` breakpoint
   * (the brand name stays in the link's accessible name via sr-only).
   */
  wordmark?: 'always' | 'sm';
  /** Spacing/alignment. A display utility here replaces the base `inline-flex` (see components/ui/display.ts). */
  className?: string;
}

export function Logo({ tone = 'light', wordmark = 'always', className }: LogoProps) {
  const t = useT('common');
  return (
    <Link
      to="/"
      className={cn(
        baseDisplay('inline-flex', className),
        'min-h-11 min-w-11 items-center gap-2 whitespace-nowrap rounded-lg font-serif text-[1.15rem] font-semibold leading-tight tracking-tight',
        tone === 'light' ? 'text-heritage' : 'text-night-ink',
        className,
      )}
    >
      <LogoMark inner={tone === 'light' ? 'var(--cream)' : 'var(--night)'} />
      <span className={wordmark === 'sm' ? 'sr-only sm:not-sr-only' : undefined}>{t('brand.name')}</span>
    </Link>
  );
}
