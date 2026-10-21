import { IllustrativeBadge } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

/** Explains that the cards are illustrative examples (plan rule 4: illustrative data must be labelled). */
export function SampleBanner({ notConfigured, compact, className }: { notConfigured?: boolean; compact?: boolean; className?: string }) {
  const t = useT('knowledge');
  return (
    <aside
      aria-label={t('sample.bannerTitle')}
      className={cn('rounded-[1.5rem] border border-[#e9d6a6] bg-[#fdf6e3] px-5 py-4 text-[#5b430f] md:px-6', className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <IllustrativeBadge />
        {!compact && <p className="font-serif text-[1.08rem] font-semibold">{t('sample.bannerTitle')}</p>}
      </div>
      <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed">{compact ? t('sample.detailBanner') : t('sample.bannerBody')}</p>
      {notConfigured && <p className="mt-2 text-[0.9375rem] font-medium">{t('states.notConfigured')}</p>}
    </aside>
  );
}
