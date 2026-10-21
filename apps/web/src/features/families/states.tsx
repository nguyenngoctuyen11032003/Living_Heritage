// Small page-state building blocks shared by the family, narrator and auth pages (workstream E1).
import { Check, Copy, PlugZap, RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button, Card, EmptyState } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { copyText } from './share';

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-terracotta">{eyebrow}</p>}
        <h1 className="text-balance font-serif text-[clamp(1.8rem,4vw,2.5rem)] font-semibold leading-tight text-heritage-deep">{title}</h1>
        {description && <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

export function NotConfiguredNotice() {
  const tc = useT('common');
  const t = useT('family');
  return <EmptyState icon={<PlugZap />} title={tc('states.notConfigured')} description={t('states.notConfiguredHint')} />;
}

export function ForbiddenNotice({ children }: { children?: ReactNode }) {
  const tc = useT('common');
  return <EmptyState icon={<ShieldAlert />} title={tc('states.forbidden')} description={children} />;
}

export function ErrorNotice({ message, onRetry, className }: { message: ReactNode; onRetry?: () => void; className?: string }) {
  const tc = useT('common');
  return (
    <div role="alert" className={cn('flex flex-col items-start gap-3 rounded-2xl bg-terracotta/8 p-5 ring-1 ring-terracotta/25 sm:flex-row sm:items-center', className)}>
      <TriangleAlert aria-hidden="true" className="size-6 shrink-0 text-terracotta" />
      <p className="flex-1 leading-relaxed text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}>
          {tc('actions.retry')}
        </Button>
      )}
    </div>
  );
}

/** Read-only URL with a copy button and an aria-live confirmation. */
export function CopyField({ value, label, className }: { value: string; label: string; className?: string }) {
  const t = useT('family');
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function onCopy() {
    setState((await copyText(value)) ? 'copied' : 'failed');
  }
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-[0.9rem] font-semibold text-ink">{label}</span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={value}
          aria-label={label}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-12 w-full min-w-0 flex-1 rounded-2xl bg-cream px-4 font-mono text-[0.85rem] text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-heritage"
        />
        <Button variant="primary" onClick={onCopy} leftIcon={state === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}>
          {state === 'copied' ? t('share.copied') : t('share.copy')}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-[0.85rem] text-ink-soft">
        {state === 'copied' ? t('share.copiedHint') : state === 'failed' ? t('share.copyFailed') : ''}
      </p>
    </div>
  );
}

export function SectionCard({ title, description, children, className }: { title: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card padding="md" className={cn('md:p-8', className)}>
      <h2 className="font-serif text-[1.35rem] font-semibold text-heritage-deep">{title}</h2>
      {description && <p className="mt-1 leading-relaxed text-ink-soft">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}
