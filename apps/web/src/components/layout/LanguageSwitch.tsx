import { useLocale, useT, type Locale } from '@/i18n';
import { cn } from '@/lib/cn';

/** VI | EN segmented switch. `tone="dark"` for night sections; `size="lg"` for narrator mode (larger targets). */
export function LanguageSwitch({ tone = 'light', size = 'md', className }: { tone?: 'light' | 'dark'; size?: 'md' | 'lg'; className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT('common');
  const options: Locale[] = ['vi', 'en'];
  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full p-0.5 font-semibold',
        size === 'lg' ? 'text-[0.875rem]' : 'text-[0.8rem]',
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
          aria-label={t(`lang.${l}`)}
          onClick={() => setLocale(l)}
          className={cn(
            'rounded-full px-2.5 uppercase tracking-wide transition-colors',
            size === 'lg' ? 'min-h-12 min-w-12 sm:min-h-14 sm:min-w-14' : 'min-h-11 min-w-11',
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
