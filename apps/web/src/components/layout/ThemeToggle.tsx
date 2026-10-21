import { Moon, Sun } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

/**
 * Light / dark toggle for the signed-in app. Same pill as LanguageSwitch (rounded-full, ring-line, 44px target).
 * Shows the icon of the theme you would switch TO, and is named for that action.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT('common');
  const [theme, setTheme] = useTheme();
  const dark = theme === 'dark';
  const label = dark ? t('theme.toLight') : t('theme.toDark');
  return (
    <div className={cn('inline-flex shrink-0 items-center rounded-full bg-heritage/8 p-0.5 ring-1 ring-line', className)}>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-heritage"
      >
        {dark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
