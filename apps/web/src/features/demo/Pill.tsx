import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type PillTone = 'warning' | 'mint' | 'neutral' | 'heritage' | 'outline';

const TONES: Record<PillTone, string> = {
  warning: 'bg-warning-bg text-warning-fg ring-1 ring-warning-line',
  mint: 'bg-mint text-heritage-deep',
  neutral: 'bg-mint text-ink',
  heritage: 'bg-heritage text-cream',
  outline: 'bg-transparent text-ink-soft ring-1 ring-line',
};

/**
 * Status / label pill that WRAPS instead of truncating (the shared Badge truncates, which would hide the
 * "simulated" and status wording at 360px — those words are the point of the label).
 */
export function Pill({ tone, icon, className, children }: { tone: PillTone; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex max-w-full items-start gap-1.5 self-start rounded-2xl px-3 py-1 text-[0.85rem] font-semibold leading-snug', TONES[tone], className)}>
      {icon && (
        <span aria-hidden="true" className="mt-[0.15em] inline-flex shrink-0 [&>svg]:size-[1em]">
          {icon}
        </span>
      )}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
