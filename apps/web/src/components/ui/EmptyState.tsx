import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { baseDisplay } from './display';

export interface EmptyStateProps {
  /** Lucide icon or small illustration. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Primary next step (Button / ButtonLink). */
  action?: ReactNode;
  tone?: 'light' | 'dark';
  /**
   * Heading level of the title. Default 3 (a block inside a page section).
   * Use 1 when the empty/error state is the whole page (e.g. "not found"), so the page still has an h1.
   */
  headingLevel?: 1 | 2 | 3;
  className?: string;
}

/** Friendly "nothing here yet" block with one clear next action (spec §10). */
export function EmptyState({ icon, title, description, action, tone = 'light', headingLevel = 3, className }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        baseDisplay('flex', className),
        'flex-col items-center rounded-[1.75rem] px-5 py-10 text-center sm:px-8 sm:py-14',
        tone === 'light' ? 'border border-dashed border-line bg-paper/70' : 'bg-night-card text-night-ink ring-1 ring-white/10',
        className,
      )}
    >
      {icon && (
        <div aria-hidden="true" className={cn('mb-4 inline-flex size-14 items-center justify-center rounded-2xl [&>svg]:size-7', tone === 'light' ? 'bg-mint text-heritage' : 'bg-white/8 text-night-ink')}>
          {icon}
        </div>
      )}
      <Heading className={cn('max-w-xl text-balance break-words font-serif text-[clamp(1.15rem,1rem+0.8vw,1.35rem)] font-semibold leading-[1.3]', tone === 'light' ? 'text-heritage-deep' : 'text-night-ink')}>{title}</Heading>
      {description && <p className={cn('mt-2 max-w-md text-pretty break-words leading-relaxed', tone === 'light' ? 'text-ink-soft' : 'text-night-ink/80')}>{description}</p>}
      {action && <div className="mt-6 flex max-w-full flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
