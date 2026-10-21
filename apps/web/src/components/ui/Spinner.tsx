import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { baseDisplay } from './display';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label; defaults to "Đang tải…". */
  label?: string;
  /** Hide from assistive tech (when the parent already announces a busy state). */
  decorative?: boolean;
  className?: string;
}

const sizes = { sm: 'size-4', md: 'size-6', lg: 'size-10' } as const;

/** Circular loading indicator; uses currentColor. */
export function Spinner({ size = 'md', label, decorative, className }: SpinnerProps) {
  const t = useT('common');
  return (
    <span role={decorative ? undefined : 'status'} aria-hidden={decorative || undefined} className={cn(baseDisplay('inline-flex', className), 'items-center', className)}>
      <svg viewBox="0 0 24 24" fill="none" className={cn(sizes[size], 'animate-spin')}>
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
        <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {!decorative && <span className="sr-only">{label ?? t('actions.loading')}</span>}
    </span>
  );
}
