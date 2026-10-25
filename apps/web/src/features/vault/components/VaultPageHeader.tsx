import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { StoryScene, type SceneKind } from '@/components/illustrations/scenes';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';

export interface VaultPageHeaderProps {
  /** Back link shown above the header (detail pages). */
  back?: { to: string; label: string };
  eyebrow?: ReactNode;
  title: ReactNode;
  /** One or two sentences under the h1. */
  lede?: ReactNode;
  /** Small meta line (counts, dates) under the lede. */
  meta?: ReactNode;
  /** Page actions: beside the h1 (top-aligned) from md up, under the lede on phones. */
  actions?: ReactNode;
  /** Topic-coloured hero band with an illustration (story detail). */
  band?: { background: string; ink: string; scene: SceneKind };
  className?: string;
}

/**
 * Shared header for the family pages (vault, story, collections, books, album, tree): same top spacing,
 * eyebrow → h1 → lede → meta, with actions aligned to the h1. Without a band it is the app-wide `PageHeader`
 * (components/ui), so family pages share page tops and action alignment with every other AppShell page; the
 * parent's flex gap spaces the sections, so the header's own bottom margin is dropped.
 */
export function VaultPageHeader({ back, eyebrow, title, lede, meta, actions, band, className }: VaultPageHeaderProps) {
  if (!band)
    return <PageHeader back={back} eyebrow={eyebrow} title={title} lede={lede} meta={meta} actions={actions} className={cn('mb-0! md:mb-0!', className)} />;
  const body = (
    <div className={cn('grid gap-x-8 gap-y-3', actions ? 'md:grid-cols-[minmax(0,1fr)_auto]' : undefined)}>
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && (
          <p className={cn('text-[0.8rem] font-semibold uppercase tracking-[0.14em]', band ? 'opacity-85' : 'text-terracotta')}>{eyebrow}</p>
        )}
        <h1
          className={cn(
            'break-words text-balance font-serif text-[2rem] font-semibold leading-[1.18] md:text-[2.5rem]',
            band ? undefined : 'text-heritage-deep',
          )}
        >
          {title}
        </h1>
      </div>
      {(lede || meta) && (
        <div className="flex min-w-0 max-w-2xl flex-col gap-1.5 md:col-start-1 md:row-start-2">
          {lede && <div className={cn('leading-relaxed', band ? 'font-serif text-[1.1rem] italic opacity-90' : 'text-ink-soft')}>{lede}</div>}
          {meta && <div className={cn('text-[0.9rem]', band ? 'opacity-85' : 'text-ink-soft')}>{meta}</div>}
        </div>
      )}
      {actions && (
        <div className={cn('min-w-0 pt-2 md:col-start-2 md:row-span-2 md:row-start-1 md:self-start', eyebrow ? 'md:pt-7' : 'md:pt-1')}>{actions}</div>
      )}
    </div>
  );

  return (
    <header className={cn('flex flex-col gap-3', className)}>
      {back && (
        <Link to={back.to} className="-ml-1 inline-flex min-h-11 w-fit items-center gap-2 rounded-full pl-1 pr-3 text-[0.95rem] font-semibold text-heritage hover:underline">
          <ArrowLeft className="size-5" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      {band ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-line/80" style={{ background: band.background, color: band.ink }}>
          <div className="grid items-stretch md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="p-6 md:p-10">{body}</div>
            <div className="hidden h-full min-h-48 md:block" aria-hidden="true">
              <StoryScene kind={band.scene} />
            </div>
          </div>
        </div>
      ) : (
        body
      )}
    </header>
  );
}
