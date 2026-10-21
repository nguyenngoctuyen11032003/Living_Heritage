import { Link } from 'react-router';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

/** Leaf-and-sound-wave mark + wordmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <path d="M16 3c7.5 3.2 11 9.2 9.6 16.2-.8 4-3.6 7.3-9.6 9.8-6-2.5-8.8-5.8-9.6-9.8C5 12.2 8.5 6.2 16 3Z" fill="currentColor" />
      <path d="M16 9v17" stroke="var(--cream)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.5 15.5v4M20.5 14v6.5M13.8 13v9M18.2 12v10" stroke="var(--cream)" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

export function Logo({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const t = useT('common');
  return (
    <Link
      to="/"
      className={cn('inline-flex items-center gap-2 font-serif text-[1.15rem] font-semibold tracking-tight', tone === 'light' ? 'text-heritage' : 'text-night-ink', className)}
    >
      <LogoMark />
      <span>{t('brand.name')}</span>
    </Link>
  );
}
