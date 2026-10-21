import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  /** Lucide icon or small illustration. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Primary next step (Button / ButtonLink). */
  action?: ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
}

/** Friendly "nothing here yet" block with one clear next action (spec §10). */
export function EmptyState({ icon, title, description, action, tone = 'light', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-[1.75rem] px-6 py-12 text-center',
        tone === 'light' ? 'border border-dashed border-line bg-paper/70' : 'bg-night-card text-night-ink ring-1 ring-white/10',
        className,
      )}
    >
      {icon && (
        <div aria-hidden="true" className={cn('mb-4 inline-flex size-14 items-center justify-center rounded-2xl [&>svg]:size-7', tone === 'light' ? 'bg-mint text-heritage' : 'bg-white/8 text-night-ink')}>
          {icon}
        </div>
      )}
      <h3 className={cn('font-serif text-[1.3rem] font-semibold leading-snug', tone === 'light' ? 'text-heritage-deep' : 'text-night-ink')}>{title}</h3>
      {description && <p className={cn('mt-2 max-w-md leading-relaxed', tone === 'light' ? 'text-ink-soft' : 'text-night-ink/80')}>{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
