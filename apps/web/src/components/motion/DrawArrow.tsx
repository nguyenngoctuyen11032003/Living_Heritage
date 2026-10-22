import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotionSafe } from '@/design/motion';
import { cn } from '@/lib/cn';
import { observeOnce } from './inView';

export interface DrawArrowProps {
  /** SVG path of the shaft, in viewBox coordinates. */
  d: string;
  /** Optional arrow-head path, drawn after the shaft. */
  head?: string;
  viewBox: string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  delay?: number;
  duration?: number;
  /** Start when mounted instead of when scrolled into view. */
  immediate?: boolean;
}

/** Hand-drawn SVG arrow/doodle whose stroke draws itself (CSS stroke-dashoffset transition). Decorative (aria-hidden). */
export function DrawArrow({ d, head, viewBox, className, style, strokeWidth = 2.4, delay = 0, duration = 1.1, immediate }: DrawArrowProps) {
  const ref = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el) return;
    const go = () => {
      void el.getBoundingClientRect(); // commit the hidden state first so the transition runs
      el.setAttribute('data-draw-in', '');
    };
    if (immediate) {
      go();
      return;
    }
    return observeOnce(el, go);
  }, [reduced, immediate]);

  const common = { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };
  const vars = reduced ? style : ({ ...style, '--da-d': `${delay}s`, '--da-t': `${duration}s`, '--da-hd': `${delay + duration * 0.85}s` } as CSSProperties);
  return (
    <svg ref={ref} viewBox={viewBox} aria-hidden="true" className={cn('pointer-events-none overflow-visible text-heritage', !reduced && 'lh-draw', className)} style={vars}>
      <path d={d} {...common} pathLength={1} className={reduced ? undefined : 'lh-draw-shaft'} />
      {head && <path d={head} {...common} pathLength={1} className={reduced ? undefined : 'lh-draw-head'} />}
    </svg>
  );
}
