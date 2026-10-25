import { ArrowUpRight, Plus } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { FaqKey } from '@/components/landing';
import { Reveal } from '@/components/motion';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { Label, Wrap } from './sections';

function FaqItem({ k, open, onToggle }: { k: FaqKey; open: boolean; onToggle: () => void }) {
  const t = useT('landing');
  const reduced = useReducedMotionSafe();
  const id = useId();
  return (
    <li className="border-b border-mb/10">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="flex min-h-16 w-full items-center justify-between gap-6 py-5 text-left text-[1.1rem] font-semibold leading-snug text-mb transition-colors hover:text-mb/80 md:text-[1.2rem]"
        >
          {t(`faq.items.${k}.q`)}
          <span
            aria-hidden="true"
            className={cn(
              'liquid-glass inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-300',
              open ? 'rotate-45 bg-mb text-mb-bg' : 'text-mb',
            )}
          >
            <Plus className="size-5" />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={`${id}-a`}
            role="region"
            aria-labelledby={`${id}-q`}
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="max-w-3xl pb-6 pr-12 text-[1.02rem] leading-relaxed text-mb/75">{t(`faq.items.${k}.a`)}</p>
          </m.div>
        )}
      </AnimatePresence>
    </li>
  );
}

const policyLink = 'inline-flex min-h-12 items-center gap-2 font-medium text-mb underline-offset-[6px] hover:underline';

/** Dark copy of the landing FAQ accordion (same questions and answers), plus the policy links. */
export function MbFaq({ keys }: { keys: FaqKey[] }) {
  const t = useT('landing');
  const tl = useT('legal');
  const [open, setOpen] = useState<FaqKey | null>(keys[0] ?? null);
  return (
    <section id="cau-hoi" aria-labelledby="mb-faq-title" className="mb-cv scroll-mt-24 bg-mb-bg pb-16 pt-6 md:pb-24 md:pt-10">
      <Wrap className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <Reveal y={20} className="lg:col-span-4">
          <Label>{t('faq.eyebrow')}</Label>
          <h2 id="mb-faq-title" className="mb-display mt-5 text-balance text-[clamp(2.2rem,3.6vw,3.2rem)] text-mb">
            {t('faq.title')}
          </h2>
        </Reveal>
        <Reveal y={20} className="lg:col-span-8">
          <ul className="border-t border-mb/10">
            {keys.map((k) => (
              <FaqItem key={k} k={k} open={open === k} onToggle={() => setOpen((cur) => (cur === k ? null : k))} />
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="text-[0.85rem] text-mb/60">{tl('book.faqMore')}:</span>
            <Link to="/quyen-rieng-tu" className={policyLink}>
              {tl('book.privacy')}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <Link to="/dieu-khoan" className={policyLink}>
              {tl('book.terms')}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}
