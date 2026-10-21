import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  /** Back link above the header (detail pages). Rendered as a 44px link with an arrow. */
  back?: { to: string; label: string };
  /** Small uppercase line above the h1 (section name). */
  eyebrow?: ReactNode;
  /** The page's h1. Every AppShell page has exactly one. */
  title: ReactNode;
  /** One or two sentences under the h1. */
  lede?: ReactNode;
  /** Alias of `lede` (matches the older features/families PageHeader API). */
  description?: ReactNode;
  /** Small meta line (counts, dates) under the lede. */
  meta?: ReactNode;
  /**
   * Page actions (Button / ButtonLink). Beside the h1 from lg up; below lg they sit under the lede (so the h1 keeps the
   * full width at 768), stacked full-width on phones with the first (primary) one on top. Labels wrap, never truncate.
   */
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared header for AppShell pages (QA 2026-10-22, critique #4): same top spacing on every page,
 * eyebrow → h1 → lede → meta, with the actions aligned to the h1.
 * `<PageHeader eyebrow="Kho gia đình" title="Sách ký ức" lede="…" actions={<Button>…</Button>} />`
 */
export function PageHeader({ back, eyebrow, title, lede, description, meta, actions, className }: PageHeaderProps) {
  const body = lede ?? description;
  return (
    <header className={cn('mb-8 flex flex-col gap-3 pt-2 md:mb-10 md:pt-4', className)}>
      {back && (
        <Link to={back.to} className="-ml-1 inline-flex min-h-11 w-fit items-center gap-2 rounded-full pl-1 pr-3 text-[0.95rem] font-semibold text-heritage hover:underline">
          <ArrowLeft className="size-5 shrink-0" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className={cn('grid gap-x-8 gap-y-3', actions ? 'lg:grid-cols-[minmax(0,1fr)_auto]' : undefined)}>
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-terracotta">{eyebrow}</p>}
          <h1 className="text-balance break-words font-serif text-[clamp(1.8rem,4vw,2.5rem)] font-semibold leading-display text-heritage-deep">{title}</h1>
        </div>
        {(body || meta) && (
          <div className="flex min-w-0 max-w-2xl flex-col gap-1.5 lg:col-start-1 lg:row-start-2">
            {body && <div className="text-pretty break-words leading-relaxed text-ink-soft">{body}</div>}
            {meta && <div className="text-[0.9rem] text-ink-soft">{meta}</div>}
          </div>
        )}
        {actions && (
          <div
            className={cn(
              'flex min-w-0 flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-md lg:justify-end lg:self-start',
              '[&>*]:w-full [&>*]:whitespace-normal [&>*]:text-center sm:[&>*]:w-auto',
              eyebrow ? 'lg:pt-7' : 'lg:pt-1',
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
