import { motion, useInView } from 'motion/react';
import { useRef, type CSSProperties } from 'react';
import { EASE_OUT, useReducedMotionSafe } from '@/design/motion';
import { cn } from '@/lib/cn';

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

/** Hand-drawn SVG arrow/doodle whose stroke draws itself (pathLength 0 → 1). Decorative (aria-hidden). */
export function DrawArrow({ d, head, viewBox, className, style, strokeWidth = 2.4, delay = 0, duration = 1.1, immediate }: DrawArrowProps) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotionSafe();
  const go = immediate || inView;
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };
  return (
    <svg ref={ref} viewBox={viewBox} aria-hidden="true" className={cn('pointer-events-none overflow-visible text-heritage', className)} style={style}>
      {reduced ? (
        <>
          <path d={d} {...common} />
          {head && <path d={head} {...common} />}
        </>
      ) : (
        <>
          <motion.path d={d} {...common} initial={{ pathLength: 0, opacity: 0 }} animate={go ? { pathLength: 1, opacity: 1 } : undefined} transition={{ pathLength: { duration, ease: EASE_OUT, delay }, opacity: { duration: 0.01, delay } }} />
          {head && (
            <motion.path
              d={head}
              {...common}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={go ? { pathLength: 1, opacity: 1 } : undefined}
              transition={{ pathLength: { duration: 0.35, ease: EASE_OUT, delay: delay + duration * 0.85 }, opacity: { duration: 0.01, delay: delay + duration * 0.85 } }}
            />
          )}
        </>
      )}
    </svg>
  );
}
