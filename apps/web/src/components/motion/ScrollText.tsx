import { Fragment, useEffect, useMemo, useRef, type CSSProperties, type ElementType } from 'react';
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
 * Character-by-character reveal driven by scroll: glyphs light up as the reading line passes them (progress 0 when the
 * block's top reaches 80% of the viewport, 1 when its bottom reaches 20%). Per scrolled frame it reads one bounding
 * rect and toggles a class on only the glyphs the line crossed since the last frame; a CSS transition smooths the
 * fade. (Writing a scroll variable that every glyph derives from re-styled hundreds of spans per frame.) Words never
 * break mid-word, screen readers get the plain sentence, and reduced motion renders it fully lit.
 */
export function ScrollText({ text, as: Tag = 'p', className, dim = 0.2 }: ScrollTextProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();

  const words = useMemo(() => text.normalize('NFC').split(/\s+/).filter(Boolean).map((w) => Array.from(w)), [text]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const glyphs = Array.from(root.querySelectorAll<HTMLElement>('.scroll-text__ch'));
    if (reduced) {
      glyphs.forEach((g) => g.classList.add('is-lit'));
      return;
    }
    const n = glyphs.length;
    let lit = 0; // glyphs [0, lit) are lit
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const r = root.getBoundingClientRect();
      const start = vh * 0.8;
      const span = start - vh * 0.2 + r.height;
      const p = span > 0 ? Math.min(1, Math.max(0, (start - r.top) / span)) : 1;
      const next = Math.round(p * n);
      for (let i = lit; i < next; i++) glyphs[i]?.classList.add('is-lit');
      for (let i = lit - 1; i >= next; i--) glyphs[i]?.classList.remove('is-lit');
      lit = next;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    let listening = false;
    const setListening = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) window.addEventListener('scroll', onScroll, { passive: true });
      else window.removeEventListener('scroll', onScroll);
    };
    update();
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            setListening(Boolean(entry?.isIntersecting));
            update(); // on leaving, settle at 0 or 1 even after a fast fling
          });
    if (io) io.observe(root);
    else setListening(true);
    return () => {
      io?.disconnect();
      setListening(false);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced, words]);

  return (
    <Tag ref={ref} className={cn('scroll-text', className)} style={{ '--st-dim': dim } as CSSProperties}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {/* The space sits between the word boxes: inside an inline-block it would be trimmed. */}
        {words.map((chars, wi) => (
          <Fragment key={wi}>
            <span className="inline-block whitespace-nowrap">
              {chars.map((ch, ci) => (
                <span key={ci} className="scroll-text__ch">
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
