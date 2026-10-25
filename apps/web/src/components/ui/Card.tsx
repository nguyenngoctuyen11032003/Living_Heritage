import type { HTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'paper' | 'cream' | 'mint' | 'night';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Lift + ring on hover/focus-within (use when the whole card is a link target). */
  interactive?: boolean;
  ref?: Ref<HTMLDivElement>;
}

const tones = {
  paper: 'bg-paper text-ink ring-1 ring-line-strong/45',
  cream: 'bg-cream text-ink ring-1 ring-line',
  mint: 'bg-mint/60 text-ink ring-1 ring-heritage/10',
  night: 'bg-night-card text-night-ink ring-1 ring-white/14',
} as const;
const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8 md:p-10' } as const;

/** Rounded surface. Compose freely; for a clickable card put a stretched link inside (`after:absolute after:inset-0`). */
export function Card({ tone = 'paper', padding = 'md', interactive, className, ref, ...rest }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-[1.5rem]',
        tones[tone],
        paddings[padding],
        interactive &&
          'transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-16px_rgba(22,58,49,0.45)] focus-within:-translate-y-0.5 motion-reduce:hover:translate-y-0',
        className,
      )}
      {...rest}
    />
  );
}
