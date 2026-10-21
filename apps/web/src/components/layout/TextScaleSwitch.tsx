import { baseDisplay } from '@/components/ui/display';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { TEXT_SCALES, stepTextScale, useTextScale, type TextScale } from '@/lib/textScale';

/**
 * Text-size control (B3: increase/decrease, remembered). Sets html[data-text-scale] via lib/textScale.ts; every copy on
 * the page shares one store. Coexists with ThemeToggle (same pill style, tokens flip with the dark theme).
 * - `variant="segmented"` (default): A / A / A, each option named by its size ("Chuẩn", "Lớn", "Rất lớn"). 3 × 44px.
 * - `variant="stepper"`: A− / A+ ("Giảm cỡ chữ" / "Tăng cỡ chữ"), disabled at the ends. 2 × 44px, for 360px headers.
 */
export function TextScaleSwitch({
  variant = 'segmented',
  tone = 'light',
  className,
}: {
  variant?: 'segmented' | 'stepper';
  /** `dark` for night sections (public footer). */
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const t = useT('common');
  const [scale, setScale] = useTextScale();
  const labels: Record<TextScale, string> = { '100': t('textScale.normal'), '115': t('textScale.large'), '130': t('textScale.xlarge') };
  const group = cn(
    baseDisplay('inline-flex', className),
    'shrink-0 items-center rounded-full p-0.5',
    tone === 'light' ? 'bg-heritage/8 ring-1 ring-line' : 'bg-white/10 ring-1 ring-white/15',
    className,
  );
  const idle = tone === 'light' ? 'text-ink-soft hover:text-heritage' : 'text-night-ink/80 hover:text-night-ink';
  const active = tone === 'light' ? 'bg-heritage text-cream' : 'bg-night-ink text-night';
  const option = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-2 font-serif font-semibold transition-colors';

  if (variant === 'stepper') {
    const smaller = stepTextScale(scale, -1);
    const larger = stepTextScale(scale, 1);
    return (
      <div role="group" aria-label={`${t('textScale.label')}: ${labels[scale]}`} className={group}>
        <button
          type="button"
          aria-label={t('textScale.decrease')}
          title={t('textScale.decrease')}
          disabled={smaller === scale}
          onClick={() => setScale(smaller)}
          className={cn(option, 'text-[13px] disabled:opacity-40', idle)}
        >
          <span aria-hidden="true">A−</span>
        </button>
        <button
          type="button"
          aria-label={t('textScale.increase')}
          title={t('textScale.increase')}
          disabled={larger === scale}
          onClick={() => setScale(larger)}
          className={cn(option, 'text-[17px] disabled:opacity-40', idle)}
        >
          <span aria-hidden="true">A+</span>
        </button>
      </div>
    );
  }

  return (
    <div role="group" aria-label={t('textScale.label')} className={group}>
      {TEXT_SCALES.map((s, i) => (
        <button
          key={s}
          type="button"
          aria-pressed={scale === s}
          aria-label={labels[s]}
          title={labels[s]}
          onClick={() => setScale(s)}
          className={cn(option, scale === s ? active : idle)}
          style={{ fontSize: `${13 + i * 3}px` }}
        >
          <span aria-hidden="true">A</span>
        </button>
      ))}
    </div>
  );
}
