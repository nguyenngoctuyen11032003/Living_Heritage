import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { baseDisplay } from './display';

export type BadgeTone = 'mint' | 'neutral' | 'heritage' | 'terracotta' | 'outline' | 'night' | 'warning';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  /** Leading icon (decorative). */
  icon?: ReactNode;
  /** Small status dot before the label. */
  dot?: boolean;
  /**
   * Cut the label to one line with an ellipsis. Off by default: status labels (B3/B12) must be readable in full, so a
   * long label wraps onto a second line instead. Only for decorative/secondary labels whose full text is shown elsewhere.
   */
  truncate?: boolean;
}

const tones: Record<BadgeTone, string> = {
  mint: 'bg-mint text-heritage-deep',
  neutral: 'bg-line text-ink',
  heritage: 'bg-heritage text-cream',
  terracotta: 'bg-terracotta/10 text-terracotta ring-1 ring-terracotta/25',
  outline: 'bg-transparent text-ink-soft ring-1 ring-line',
  night: 'bg-white/10 text-night-ink ring-1 ring-white/25',
  warning: 'bg-warning-bg text-warning-fg ring-1 ring-warning-line',
};

/** Status / label pill. Always carries text — never colour alone (spec §5 a11y). */
export function Badge({ tone = 'mint', size = 'md', icon, dot, truncate = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        baseDisplay('inline-flex', className),
        // rounded-[1rem] reads as a full pill on one line and stays a soft rectangle when the label wraps.
        'max-w-full items-center gap-2 rounded-[1rem] font-semibold leading-snug',
        size === 'sm' ? 'px-2.5 py-0.5 text-[0.8rem]' : 'px-3 py-1 text-[0.875rem]',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current opacity-80" />}
      {icon && <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-4">{icon}</span>}
      <span className={truncate ? 'truncate' : 'min-w-0 text-pretty break-words'}>{children}</span>
    </span>
  );
}
