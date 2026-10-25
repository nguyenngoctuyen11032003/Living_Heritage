import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PageStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Whole-page empty / error / forbidden state. Same look as `EmptyState`, but the
 * title is the page's single h1 (QA P1 #7: a page must never be left without one).
 */
export function PageState({ icon, title, description, action, className }: PageStateProps) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-line bg-paper/70 px-6 py-12 text-center', className)}>
      {icon && (
        <div aria-hidden="true" className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-mint text-heritage [&>svg]:size-7">
          {icon}
        </div>
      )}
      <h1 className="font-serif text-[1.6rem] font-semibold leading-snug text-heritage-deep md:text-[1.9rem]">{title}</h1>
      {description && <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
