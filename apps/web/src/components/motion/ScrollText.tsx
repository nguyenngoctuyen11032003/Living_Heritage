import { useMotionValueEvent, useScroll } from 'motion/react';
import { Fragment, useLayoutEffect, useMemo, useRef, type CSSProperties, type ElementType } from 'react';
import { useReducedMotionSafe } from '@/design/motion';
import { cn } from '@/lib/cn';
import './motion.css';

export interface ScrollTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  /** Opacity of a character that has not been reached yet (default 0.2). */
  dim?: number;
}

/**
 * Character-by-character reveal driven by scroll (offset 'start 0.8' → 'end 0.2'): each glyph goes from `dim` to full
 * opacity as the reading line passes it. One scroll value is written to a CSS variable; every glyph derives its own
 * opacity in CSS, so a long paragraph costs one style write per frame. Words never break mid-word, screen readers get
 * the plain sentence, and reduced motion renders it fully lit.
 */
export function ScrollText({ text, as: Tag = 'p', className, dim = 0.2 }: ScrollTextProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.2'] });

  const words = useMemo(() => {
    const list = text.normalize('NFC').split(/\s+/).filter(Boolean);
    const total = list.reduce((n, w) => n + Array.from(w).length, 0) || 1;
    let i = 0;
    return { total, list: list.map((w) => Array.from(w).map((ch) => ({ ch, s: i++ / total }))) };
  }, [text]);

  const write = (v: number) => ref.current?.style.setProperty('--st-p', String(reduced ? 1 : v));
  useMotionValueEvent(scrollYProgress, 'change', write);
  useLayoutEffect(() => write(scrollYProgress.get()));

  return (
    <Tag ref={ref} className={cn('scroll-text', className)} style={{ '--st-dim': dim, '--st-n': words.total / 6 } as CSSProperties}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {/* The space sits between the word boxes: inside an inline-block it would be trimmed. */}
        {words.list.map((chars, wi) => (
          <Fragment key={wi}>
            <span className="inline-block whitespace-nowrap">
              {chars.map(({ ch, s }, ci) => (
                <span key={ci} className="scroll-text__ch" style={{ '--st-s': s } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.list.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
