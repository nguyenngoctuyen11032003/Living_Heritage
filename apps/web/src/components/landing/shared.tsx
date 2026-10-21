import { ArrowRight, Mic } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui';
import { baseDisplay } from '@/components/ui/display';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

/** The one primary CTA, repeated per section: heritage pill inside a dashed outline ring. */
export function PrimaryCta({ className, size = 'xl', to = '/ke-chuyen' }: { className?: string; size?: 'lg' | 'xl'; to?: string }) {
  const t = useT('landing');
  return (
    <span className={cn(baseDisplay('inline-flex', className), 'rounded-full border-[1.5px] border-dashed border-heritage/50 p-[5px]', className)}>
      <Link to={to} className={buttonClasses({ variant: 'primary', size, className: 'gap-3 whitespace-nowrap pl-6 pr-7 max-[400px]:min-h-14 max-[400px]:pl-4 max-[400px]:pr-5 max-[400px]:text-[0.95rem]' })}>
        <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-cream/15">
          <Mic className="size-4" />
        </span>
        {t('cta.primary')}
      </Link>
    </span>
  );
}

export interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
  /** Heading id for aria-labelledby on the section. */
  id?: string;
  className?: string;
  /** Right-side slot (e.g. a link) on wide screens when align="left". */
  aside?: ReactNode;
}

export function SectionHeading({ eyebrow, title, lead, align = 'left', tone = 'light', id, className, aside }: SectionHeadingProps) {
  const dark = tone === 'dark';
  return (
    <Reveal className={cn('flex flex-col gap-6', align === 'left' && Boolean(aside) && 'md:flex-row md:items-end md:justify-between', className)}>
      <div className={cn(align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl')}>
        <p className={cn('inline-flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em]', dark ? 'text-mint' : 'text-terracotta')}>
          <span aria-hidden="true" className={cn('h-px w-6', dark ? 'bg-mint/60' : 'bg-terracotta/60')} />
          {eyebrow}
        </p>
        <h2 id={id} className={cn('mt-4 text-balance font-serif text-[clamp(1.9rem,4.2vw,3.15rem)] font-semibold leading-display tracking-[-0.02em]', dark ? 'text-night-ink' : 'text-heritage-deep')}>
          {title}
        </h2>
        {lead && <p className={cn('mt-5 text-pretty text-[1.05rem] leading-relaxed md:text-[1.12rem]', dark ? 'text-night-ink/80' : 'text-ink-soft', align === 'center' && 'mx-auto max-w-2xl')}>{lead}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </Reveal>
  );
}

/** Text link with an arrow that nudges on hover. `diagonal` rotates the arrow −45° (Prisma "↗"). */
export function ArrowLink({ to, children, tone = 'light', diagonal, className }: { to: string; children: ReactNode; tone?: 'light' | 'dark'; diagonal?: boolean; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        baseDisplay('inline-flex', className),
        'group/al min-h-12 items-center gap-2 font-semibold underline-offset-[6px] hover:underline',
        tone === 'light' ? 'text-heritage' : 'text-night-ink',
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className={cn('size-4 transition-transform duration-200', diagonal ? '-rotate-45 group-hover/al:-translate-y-0.5 group-hover/al:translate-x-0.5' : 'group-hover/al:translate-x-1')} />
    </Link>
  );
}

/** Standard section wrapper: generous padding, max-w-7xl. */
export function Section({ id, labelledBy, className, children, inner }: { id?: string; labelledBy?: string; className?: string; inner?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn('scroll-mt-24 py-20 md:py-28 lg:py-32', className)}>
      <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', inner)}>{children}</div>
    </section>
  );
}
