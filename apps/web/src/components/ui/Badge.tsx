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
}

const tones: Record<BadgeTone, string> = {
  mint: 'bg-mint text-heritage-deep',
  neutral: 'bg-[#efe9dc] text-ink',
  heritage: 'bg-heritage text-cream',
  terracotta: 'bg-terracotta/10 text-terracotta ring-1 ring-terracotta/25',
  outline: 'bg-transparent text-ink-soft ring-1 ring-line',
  night: 'bg-white/8 text-night-ink ring-1 ring-white/15',
  warning: 'bg-[#fbecc8] text-[#6b4a0c]',
};

/** Status / label pill. Always carries text — never colour alone (spec §5 a11y). */
export function Badge({ tone = 'mint', size = 'md', icon, dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        baseDisplay('inline-flex', className),
        // Min. 14px text (0.8rem of the 18px root); leading-normal keeps stacked Vietnamese marks (Ữ, Ộ) clear of the truncate clip.
        'max-w-full items-center gap-1.5 rounded-full font-semibold leading-normal',
        size === 'sm' ? 'px-2.5 py-0.5 text-[0.8rem]' : 'px-3 py-1 text-[0.85rem]',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current opacity-80" />}
      {icon && <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-3.5">{icon}</span>}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
