import { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

const SCALES = ['100', '115', '130'] as const;
type Scale = (typeof SCALES)[number];
const KEY = 'lh.textScale';

function readScale(): Scale {
  try {
    const v = localStorage.getItem(KEY);
    if (v && (SCALES as readonly string[]).includes(v)) return v as Scale;
  } catch {
    /* storage blocked */
  }
  return '100';
}

/** A / A+ / A++ — sets html[data-text-scale] (see design/global.css) and remembers it. */
export function TextScaleSwitch({ className }: { className?: string }) {
  const t = useT('common');
  const [scale, setScale] = useState<Scale>(readScale);
  useEffect(() => {
    if (scale === '100') delete document.documentElement.dataset.textScale;
    else document.documentElement.dataset.textScale = scale;
    try {
      localStorage.setItem(KEY, scale);
    } catch {
      /* storage blocked */
    }
  }, [scale]);
  const labels: Record<Scale, string> = { '100': t('textScale.normal'), '115': t('textScale.large'), '130': t('textScale.xlarge') };
  return (
    <div role="group" aria-label={t('textScale.label')} className={cn('inline-flex shrink-0 rounded-full bg-paper p-0.5 ring-1 ring-line', className)}>
      {SCALES.map((s, i) => (
        <button
          key={s}
          type="button"
          aria-pressed={scale === s}
          title={labels[s]}
          aria-label={labels[s]}
          onClick={() => setScale(s)}
          className={cn('min-h-12 min-w-12 rounded-full px-2 font-serif font-semibold leading-none transition-colors sm:min-h-14 sm:min-w-14', scale === s ? 'bg-heritage text-cream' : 'text-ink-soft hover:text-heritage')}
          style={{ fontSize: `${15 + i * 4}px` }}
        >
          A
        </button>
      ))}
    </div>
  );
}
