import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** ms before auto-dismiss. Default 6000 for success/info; errors stay until dismissed (B15: important errors persist). `null` = sticky. */
  duration?: number | null;
  /** Optional action button inside the toast. */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
}

export interface ToastApi {
  /** Show a toast; returns its id. */
  toast: (opts: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** `const { toast } = useToast(); toast({ title: 'Đã lưu', tone: 'success' })`. Requires <ToastProvider> above. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return fallbackApi;
}

const fallbackApi: ToastApi = {
  toast: (opts) => {
    if (import.meta.env.DEV) console.warn('[useToast] no <ToastProvider> mounted:', opts.title);
    return -1;
  },
  dismiss: () => {},
};

const icons = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const toneClasses = {
  success: 'text-heritage',
  error: 'text-terracotta',
  info: 'text-ink-soft',
} as const;

/** Mount once near the app root. Renders a polite live region (errors are assertive). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());
  const t = useT('landing');
  const reduced = useReducedMotionSafe();

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((i) => i.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = nextId.current++;
      const tone = opts.tone ?? 'info';
      setItems((list) => [...list.slice(-3), { ...opts, tone, id }]);
      const duration = opts.duration === undefined ? (tone === 'error' ? null : 6000) : opts.duration;
      if (duration !== null) timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-label={t('ui.toast.region')} role="region" className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex flex-col items-center gap-3 p-4 sm:bottom-4 sm:right-4 sm:left-auto sm:items-end">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const Icon = icons[item.tone ?? 'info'];
            return (
              <motion.div
                key={item.id}
                layout={reduced ? false : 'position'}
                initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                role={item.tone === 'error' ? 'alert' : 'status'}
                aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-paper p-4 pr-2 text-ink shadow-[0_20px_50px_-20px_rgba(18,27,24,0.45)] ring-1 ring-line"
              >
                <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', toneClasses[item.tone ?? 'info'])} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{item.title}</p>
                  {item.description && <p className="mt-0.5 text-[0.88rem] leading-snug text-ink-soft">{item.description}</p>}
                  {item.action && (
                    <button
                      type="button"
                      onClick={() => {
                        item.action?.onClick();
                        dismiss(item.id);
                      }}
                      className="mt-2 min-h-10 rounded-full px-3 text-[0.88rem] font-semibold text-heritage underline-offset-4 hover:underline"
                    >
                      {item.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label={t('ui.toast.close')}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-mint/60 hover:text-heritage"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
