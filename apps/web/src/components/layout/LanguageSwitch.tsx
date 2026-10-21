import { useLocale, useT, type Locale } from '@/i18n';
import { cn } from '@/lib/cn';

/**
 * VI | EN segmented switch. `tone="dark"` for night sections. Each option is a 44px touch target.
 *
 * Layout note: `className` is for spacing/alignment only. Do not pass display utilities (`hidden sm:inline-flex`) —
 * `cn()` does not merge classes, so they would fight the switch's own `inline-flex` (QA 2026-10-22 P0 #1).
 * To show it only at some breakpoints, wrap it: `<div className="hidden sm:block"><LanguageSwitch /></div>`.
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
        'inline-flex shrink-0 items-center rounded-full p-0.5 text-[13px] font-semibold',
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
            'min-h-11 min-w-11 rounded-full px-2.5 uppercase tracking-wide transition-colors',
            locale === l
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
