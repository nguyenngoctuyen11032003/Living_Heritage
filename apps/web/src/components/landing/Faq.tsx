import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';
import { Reveal } from '@/components/motion';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { Section, SectionHeading } from './shared';

export type FaqKey = 'who' | 'ai' | 'write' | 'delete' | 'paid';
const ALL: FaqKey[] = ['who', 'ai', 'write', 'delete', 'paid'];

function FaqItem({ k, open, onToggle }: { k: FaqKey; open: boolean; onToggle: () => void }) {
  const t = useT('landing');
  const reduced = useReducedMotionSafe();
  const id = useId();
  return (
    <li className="border-b border-line">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="flex min-h-16 w-full items-center justify-between gap-6 py-5 text-left text-[1.1rem] font-semibold leading-snug text-ink transition-colors hover:text-heritage md:text-[1.2rem]"
        >
          {t(`faq.items.${k}.q`)}
          <span aria-hidden="true" className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-full ring-1 transition-[transform,background-color] duration-300', open ? 'rotate-45 bg-heritage text-cream ring-heritage' : 'text-heritage ring-line')}>
            <Plus className="size-5" />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-a`}
            role="region"
            aria-labelledby={`${id}-q`}
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="max-w-3xl pb-6 pr-12 text-[1.02rem] leading-relaxed text-ink-soft">{t(`faq.items.${k}.a`)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Block 13 — FAQ accordion (one open at a time; first open by default). */
export function Faq({ keys = ALL }: { keys?: FaqKey[] }) {
  const t = useT('landing');
  const [open, setOpen] = useState<FaqKey | null>(keys[0] ?? null);
  return (
    <Section id="cau-hoi" labelledBy="faq-title">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading id="faq-title" eyebrow={t('faq.eyebrow')} title={t('faq.title')} />
        </div>
        <Reveal className="lg:col-span-8">
          <ul className="border-t border-line">
            {keys.map((k) => (
              <FaqItem key={k} k={k} open={open === k} onToggle={() => setOpen((cur) => (cur === k ? null : k))} />
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
