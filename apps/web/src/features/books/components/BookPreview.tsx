import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useEffect, useState } from 'react';
import { Button, Dialog } from '@/components/ui';
import { useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import type { BookPage, ChapterInput } from '../pages';
import { useFinePointer } from '../useFinePointer';
import { BookPageView, type BookMeta } from './BookPageView';

// Light slide + fade between pages (B15: no 3D needed to read); reduced motion → a short cross-fade.
const slide: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir: number) => ({ x: dir > 0 ? -24 : 24, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }),
};

const fade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Page-by-page preview. ←/→ turn pages; pages slide lightly, reduced motion → simple fade. */
export function BookPreview({ open, onClose, book, pages, chapters }: { open: boolean; onClose: () => void; book: BookMeta; pages: BookPage[]; chapters: ChapterInput[] }) {
  const t = useT('books');
  const reduced = useReducedMotionSafe();
  // The ←/→ hint only makes sense with a keyboard; touch screens use the buttons.
  const finePointer = useFinePointer();
  const [[index, dir], setPos] = useState<[number, number]>([0, 1]);
  const total = pages.length;

  useEffect(() => {
    if (open) setPos([0, 1]);
  }, [open]);

  const go = (delta: 1 | -1) =>
    setPos(([i]) => {
      const next = Math.max(0, Math.min(total - 1, i + delta));
      return next === i ? [i, delta] : [next, delta];
    });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go only depends on total
  }, [open, total]);

  const page = pages[index];
  return (
    <Dialog open={open} onClose={onClose} title={t('preview.title')} description={finePointer ? t('preview.keyboardHint') : undefined} size="lg">
      {chapters.length === 0 || !page ? (
        <p className="text-ink-soft">{t('preview.empty')}</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full max-w-[420px]" style={{ containerType: 'inline-size' }}>
            <div className="relative aspect-[148/210] w-full">
              <AnimatePresence initial={false} custom={dir}>
                <motion.div
                  key={index}
                  custom={dir}
                  variants={reduced ? fade : slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0 overflow-hidden rounded-[6px] shadow-[0_24px_50px_-28px_rgba(18,27,24,0.55),0_0_0_1px_rgba(31,41,51,0.08)]"
                >
                  <BookPageView page={page} book={book} chapters={chapters} onGoToPage={(n) => setPos(([i]) => [Math.max(0, Math.min(total - 1, n)), n >= i ? 1 : -1])} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex w-full max-w-[420px] items-center justify-between gap-3">
            <Button variant="secondary" iconOnly aria-label={t('preview.prev')} onClick={() => go(-1)} disabled={index === 0}>
              <ChevronLeft className="size-5" />
            </Button>
            <p className="text-[0.9rem] tabular-nums text-ink-soft" role="status" aria-live="polite">
              {t('preview.pageOf', { n: index + 1, total })}
            </p>
            <Button variant="secondary" iconOnly aria-label={t('preview.next')} onClick={() => go(1)} disabled={index === total - 1}>
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
