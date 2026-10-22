import { useLocale, useT, type Locale } from '@/i18n';
import { baseDisplay } from '@/components/ui/display';
import { cn } from '@/lib/cn';

/**
 * VI | EN segmented switch. `tone="dark"` for night sections. Each option is a 48px touch target.
 *
 * Layout note: a display utility in `className` (`hidden sm:inline-flex`) replaces the base `inline-flex` (cn() and
 * baseDisplay() both resolve it since QA 2026-10-22 P0 #1). Wrapping (`<div className="hidden sm:block">`) also works.
 */
export function LanguageSwitch({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT('common');
  const options: Locale[] = ['vi', 'en'];
  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={cn(
        baseDisplay('inline-flex', className),
        'shrink-0 items-center rounded-full p-0.5 text-[0.75rem] font-semibold',
        tone === 'light' ? 'bg-heritage/8 ring-1 ring-line' : 'bg-white/10 ring-1 ring-white/15',
        className,
      )}
    >
      {options.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          title={t(`lang.${l}`)}
          onClick={() => setLocale(l)}
          className={cn(
            'min-h-12 min-w-12 rounded-full px-2.5 uppercase tracking-wide transition-colors',            locale === l
              ? tone === 'light'
                ? 'bg-heritage text-cream'
                : 'bg-night-ink text-night'
              : tone === 'light'
                ? 'text-ink-soft hover:text-heritage'
                : 'text-night-ink/70 hover:text-night-ink',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
