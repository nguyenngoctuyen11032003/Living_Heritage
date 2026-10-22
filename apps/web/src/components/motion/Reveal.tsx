import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_CARD, useReducedMotionSafe } from '@/design/motion';

export interface RevealProps {
  children: ReactNode;
  /** Delay (s). */
  delay?: number;
  /** Rise distance in px (B15: 12–20). */
  y?: number;
  /** Start scale (e.g. 0.95 for cards). */
  scale?: number;
  duration?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'article';
}

/** Fade-up once when scrolled into view. Content is in the DOM (and clickable) from the start; reduced motion renders it static. */
export function Reveal({ children, delay = 0, y = 16, scale, duration = 0.35, className, as = 'div' }: RevealProps) {
  const reduced = useReducedMotionSafe();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduced ? false : { opacity: 0, y, scale: scale ?? 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration, ease: EASE_CARD, delay }}
    >
      {children}
    </Comp>
  );
}
