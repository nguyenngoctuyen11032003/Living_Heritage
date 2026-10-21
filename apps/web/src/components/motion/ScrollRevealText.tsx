import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useMemo, useRef, type ElementType } from 'react';
import { useReducedMotionSafe } from '@/design/motion';

export interface ScrollRevealTextProps {
  text: string;
  as?: ElementType;
  className?: string;
}

function Char({ ch, progress, p }: { ch: string; progress: MotionValue<number>; p: number }) {
  const opacity = useTransform(progress, [p - 0.1, p + 0.05], [0.2, 1]);
  return <motion.span style={{ opacity }}>{ch}</motion.span>;
}

/**
 * Paragraph whose characters brighten from 20% → 100% opacity as it scrolls through the viewport
 * (offset 'start 0.8' → 'end 0.2'). Words never break mid-word. Reduced motion: plain text.
 */
export function ScrollRevealText({ text, as: Tag = 'p', className }: ScrollRevealTextProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.2'] });

  const words = useMemo(() => {
    const chars = Array.from(text.normalize('NFC'));
    const total = chars.length;
    const out: Array<{ chars: Array<{ ch: string; p: number }> }> = [];
    let index = 0;
    for (const word of text.normalize('NFC').split(' ')) {
      const wc = Array.from(word).map((ch) => ({ ch, p: (index++ + 0.5) / total }));
      index++; // the space
      out.push({ chars: wc });
    }
    return out;
  }, [text]);

  if (reduced) {
    return (
      <Tag ref={ref} className={className}>
        {text}
      </Tag>
    );
  }
  return (
    <Tag ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, wi) => (
          <span key={wi}>
            <span className="inline-block whitespace-nowrap">
              {w.chars.map((c, ci) => (
                <Char key={ci} ch={c.ch} progress={scrollYProgress} p={c.p} />
              ))}
            </span>
            {wi < words.length - 1 && ' '}
          </span>
        ))}
      </span>
    </Tag>
  );
}
