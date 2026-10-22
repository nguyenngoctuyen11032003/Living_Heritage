import { X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotionSafe, EASE_OUT } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

export interface DialogProps {
  open: boolean;
  /** Called on Esc, overlay click and the close button. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action row at the bottom (e.g. Cancel + Confirm buttons). */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Element to focus first; defaults to the first focusable element in the panel. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Hide the × button (keep Esc). */
  hideClose?: boolean;
  className?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/**
 * Accessible modal dialog: portal, aria-modal, focus trap, Esc to close, focus returns to the opener, body scroll lock.
 * Bottom sheet on phones, centred card on larger screens.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', initialFocusRef, hideClose, className }: DialogProps) {
  const t = useT('landing');
  const reduced = useReducedMotionSafe();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = initialFocusRef?.current ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
      target.focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (!panelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <m.div
            className="absolute inset-0 bg-night/60"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onCloseRef.current()}
            aria-hidden="true"
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={reduced ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-paper text-ink shadow-[0_24px_48px_-24px_rgba(18,27,24,0.5)] focus:outline-none sm:rounded-[1.75rem]',
              widths[size],
              className,
            )}
          >
            <div className="flex items-start gap-4 px-6 pb-2 pt-6 sm:px-8 sm:pt-8">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-serif text-[1.45rem] font-semibold leading-snug text-heritage-deep">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">
                    {description}
                  </p>
                )}
              </div>
              {!hideClose && (
                <button
                  type="button"
                  onClick={() => onCloseRef.current()}
                  aria-label={t('ui.dialog.close')}
                  className="-mr-2 -mt-1 inline-flex size-12 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mint/70 hover:text-heritage"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              )}
            </div>
            {children && <div className="overflow-y-auto px-6 py-3 sm:px-8">{children}</div>}
            {footer && <div className="flex flex-col-reverse gap-3 border-t border-line/70 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">{footer}</div>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
