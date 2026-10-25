import { Mail, MessageCircle, Phone, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { CONTACT_EMAIL as EMAIL, CONTACT_PHONE as PHONE, CONTACT_PHONE_LABEL } from '@/lib/contact';


/**
 * Landing-page chat bubble: one tap fans out the phone and email shortcuts above it. Closes on outside click,
 * Escape or navigation. Sits at the bottom-left corner, clear of the BackToTop button on the right.
 */
export function ContactFab({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const t = useT('common');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const listId = useId();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dark = tone === 'dark';
  const actions = [
    { href: `tel:${PHONE}`, icon: Phone, label: t('contactFab.call'), value: CONTACT_PHONE_LABEL },
    { href: `mailto:${EMAIL}`, icon: Mail, label: t('contactFab.email'), value: EMAIL },
  ];
  return (
    <div ref={rootRef} className="fixed bottom-5 left-4 z-30 flex flex-col items-start gap-3 sm:bottom-6 sm:left-6">
      <ul
        id={listId}
        aria-label={t('contactFab.title')}
        inert={!open}
        className={cn('flex flex-col items-start gap-2 transition-[opacity,transform] duration-300 origin-bottom-left', open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-95 opacity-0')}
      >
        {actions.map(({ href, icon: Icon, label, value }, i) => (
          <li key={href} style={{ transitionDelay: open ? `${(actions.length - 1 - i) * 50}ms` : '0ms' }} className="transition-[transform] duration-300">
            <a
              href={href}
              className={cn(
                'flex min-h-12 items-center gap-3 rounded-full py-1.5 pl-1.5 pr-5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] ring-1 backdrop-blur-md transition-colors',
                dark ? 'bg-[#151c1a]/90 text-night-ink ring-white/20 hover:bg-[#151c1a]' : 'bg-paper text-ink ring-line hover:bg-cream',
              )}
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-heritage text-cream">
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className={cn('text-[11px] font-semibold uppercase tracking-wide', dark ? 'text-night-ink/85' : 'text-ink-soft')}>{label}</span>
                <span className="text-[0.9rem] font-semibold">{value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? t('contactFab.close') : t('contactFab.open')}
        title={open ? t('contactFab.close') : t('contactFab.open')}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-14 items-center justify-center rounded-full bg-heritage text-cream shadow-[0_12px_30px_-10px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {!open && <span aria-hidden="true" className="absolute inset-0 -z-10 animate-ping rounded-full bg-heritage/30 [animation-iteration-count:3]" />}
        <MessageCircle aria-hidden="true" className={cn('absolute size-6 transition-[opacity,transform] duration-200', open ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
        <X aria-hidden="true" className={cn('absolute size-6 transition-[opacity,transform] duration-200', open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0')} />
      </button>
    </div>
  );
}
