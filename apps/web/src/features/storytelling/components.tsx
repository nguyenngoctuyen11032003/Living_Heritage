// Small building blocks shared by the storytelling pages.
import { BookOpen, CircleAlert, HandHeart, Hammer, House, Lock, PlugZap, Sprout, Sun, Users, Utensils, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, ButtonLink, EmptyState, Spinner } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import type { StorytellerContext } from './data';
import { useAddress } from './address';

const ICONS: Record<string, LucideIcon> = {
  'tuoi-tho': Sun,
  'gia-dinh': Users,
  'que-huong': House,
  'nghe-nghiep': Hammer,
  'mon-an': Utensils,
  'lam-vuon': Sprout,
};

export function TopicIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] ?? BookOpen;
  return <Icon className={className} aria-hidden="true" />;
}

/** Elder type size for every button and button-link inside (B3: 20–22 px in narrator mode; Button sizes are smaller). */
export const ELDER_CONTROLS = '[&_a]:text-[1.25rem] [&_button]:text-[1.25rem]';

/** Big, calm centred status line (loading / progress), announced politely. */
export function StatusBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col items-center gap-5 py-16 text-center text-[1.3rem] text-ink', className)}>
      <Spinner size="lg" decorative />
      <p className="max-w-md leading-relaxed">{children}</p>
    </div>
  );
}

export function AssistedBanner({ name }: { name: string }) {
  const t = useT('narrator');
  const address = useAddress();
  return (
    <div role="note" className="mb-8 flex items-start gap-3 rounded-2xl bg-[#fbecc8] px-5 py-4 text-[1.25rem] leading-relaxed text-[#5a3e0a] ring-1 ring-[#e9cf8f]">
      <HandHeart className="mt-1 size-6 shrink-0" aria-hidden="true" />
      <p>{t('assisted.banner', { who: address(name) })}</p>
    </div>
  );
}

/** Renders every non-ready state of useStoryteller(); returns null when ready. */
export function StorytellerGate({ ctx }: { ctx: StorytellerContext }) {
  const t = useT('narrator');
  switch (ctx.status) {
    case 'loading':
      return <StatusBlock>{t('gate.loading')}</StatusBlock>;
    case 'not-configured':
      return <EmptyState icon={<PlugZap />} title={t('gate.notConfiguredTitle')} description={t('gate.notConfiguredDesc')} />;
    case 'error':
      return (
        <EmptyState
          icon={<CircleAlert />}
          title={t('gate.errorTitle')}
          description={t('gate.errorDesc')}
          action={
            <Button size="lg" onClick={ctx.retry}>
              {t('gate.retry')}
            </Button>
          }
        />
      );
    case 'no-narrator':
      return ctx.isAnonymous ? (
        <EmptyState icon={<Lock />} title={t('gate.noLinkTitle')} description={t('gate.noLinkDesc')} />
      ) : (
        <EmptyState
          icon={<Users />}
          title={t('gate.chooseNarratorTitle')}
          description={t('gate.chooseNarratorDesc')}
          action={
            <ButtonLink to="/gia-dinh/nguoi-ke" size="lg">
              {t('gate.chooseNarratorAction')}
            </ButtonLink>
          }
        />
      );
    case 'forbidden':
      return (
        <EmptyState
          icon={<Lock />}
          title={t('gate.forbiddenTitle')}
          description={t('gate.forbiddenDesc')}
          action={
            <ButtonLink to="/" size="lg" variant="secondary">
              {t('gate.forbiddenAction')}
            </ButtonLink>
          }
        />
      );
    default:
      return null;
  }
}
