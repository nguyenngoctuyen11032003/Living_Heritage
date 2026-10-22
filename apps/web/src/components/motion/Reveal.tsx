import { createElement, useEffect, useRef, type CSSProperties, type ReactNode, type TransitionEvent } from 'react';
import { useReducedMotionSafe } from '@/design/motion';
import { observeOnce } from './inView';

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

/**
 * Fade-up once when scrolled into view, as a CSS transition (opacity + transform) switched on by one shared
 * IntersectionObserver. Content is in the DOM (and clickable) from the start; reduced motion renders it static.
 */
export function Reveal({ children, delay = 0, y = 16, scale, duration = 0.35, className, as = 'div' }: RevealProps) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el) return;
    return observeOnce(el, () => {
      el.setAttribute('data-reveal-in', '');
    });
  }, [reduced]);

  if (reduced) return createElement(as, { className }, children);

  const style = {
    '--rv-y': `${y}px`,
    '--rv-s': scale ?? 1,
    '--rv-d': `${duration}s`,
    '--rv-delay': `${delay}s`,
  } as CSSProperties;
  return createElement(
    as,
    {
      ref,
      className,
      style,
      'data-reveal': '',
      onTransitionEnd: (e: TransitionEvent<HTMLElement>) => {
        if (e.target === e.currentTarget && e.propertyName === 'transform') e.currentTarget.setAttribute('data-reveal-done', '');
      },
    },
    children,
  );
}
