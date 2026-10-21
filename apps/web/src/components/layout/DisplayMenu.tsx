import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { LanguageSwitch } from './LanguageSwitch';
import { TextScaleSwitch } from './TextScaleSwitch';
import { ThemeToggle } from './ThemeToggle';

/**
 * Compact "Hiển thị / Display" disclosure for narrow headers (NarratorShell below sm): one labelled 48px button that
 * opens a small panel with text size, the language switch and the theme toggle (and any extra rows passed as children, e.g. text size).
 * Escape or a click outside closes it and focus returns to the button.
 */
export function DisplayMenu({ children, className }: { children?: ReactNode; className?: string }) {
  const t = useT('common');
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex min-h-[48px] items-center gap-[6px] rounded-full px-[12px] text-[15px] font-semibold ring-1 ring-line transition-colors',
          open ? 'bg-mint text-heritage-deep' : 'bg-paper text-ink hover:text-heritage',
        )}
      >
        <SlidersHorizontal className="size-[20px] shrink-0" aria-hidden="true" />
        {t('display.label')}
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={t('display.label')}
          className="absolute right-0 top-full z-40 mt-2 flex w-max max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl bg-paper p-4 text-[0.85rem] shadow-[0_12px_32px_-8px_rgba(22,58,49,0.25)] ring-1 ring-line"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="text-ink-soft">{t('textScale.label')}</span>
            <TextScaleSwitch />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="text-ink-soft">{t('lang.label')}</span>
            <LanguageSwitch />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="text-ink-soft">{t('display.theme')}</span>
            <ThemeToggle />
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
