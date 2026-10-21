import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { baseDisplay } from '@/components/ui/display';
import { cn } from '@/lib/cn';

export interface HandNoteProps {
  children: ReactNode;
  /** Rotation in degrees. */
  rotate?: number;
  /** Entrance delay (s). */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

/** Hand-written Caveat note in heritage green that fades in once. Decorative by default (aria-hidden) — repeat important text elsewhere. */
export function HandNote({ children, rotate = -4, delay = 0, className, style }: HandNoteProps) {
  const reduced = useReducedMotionSafe();
  return (
    <motion.span
      aria-hidden="true"
      className={cn(baseDisplay('inline-block', className), 'pointer-events-none select-none whitespace-nowrap font-hand font-semibold leading-[1.15] text-heritage', className)}
      style={{ ...style, rotate }}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.span>
  );
}
