import type { Visibility } from '@lh/shared';
import { Globe2, Lock, Users } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

const ICON = { private: Lock, family: Users, public: Globe2 } as const;

/** Who can see a story: icon + text (never colour alone). */
export function VisibilityLabel({ visibility, className }: { visibility: Visibility; className?: string }) {
  const t = useT('vault');
  const Icon = ICON[visibility];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[0.85rem] text-ink-soft', className)}>
      <Icon className="size-4" aria-hidden="true" />
      {t(`visibility.${visibility}`)}
    </span>
  );
}
