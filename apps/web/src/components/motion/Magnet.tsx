import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotionSafe } from '@/design/motion';
import { cn } from '@/lib/cn';

export interface MagnetProps {
  children: ReactNode;
  /** Distance (px) around the element within which it starts to follow the cursor. */
  padding?: number;
  /** Higher = weaker pull (offset is divided by it). */
  strength?: number;
  className?: string;
}

/**
 * Magnetic hover: inside `padding` px of its edges the element leans toward the cursor (offset ÷ strength), easing in
 * over 0.3 s and settling back over 0.6 s. Fine pointers only; static under reduced motion and on touch.
 */
export function Magnet({ children, padding = 90, strength = 4, className }: MagnetProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    let active = false;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const near = Math.abs(e.clientX - cx) < r.width / 2 + padding && Math.abs(e.clientY - cy) < r.height / 2 + padding;
        if (near) {
          if (!active) el.style.transition = 'transform 0.3s ease-out';
          active = true;
          el.style.transform = `translate3d(${(e.clientX - cx) / strength}px, ${(e.clientY - cy) / strength}px, 0)`;
        } else if (active) {
          active = false;
          el.style.transition = 'transform 0.6s ease-in-out';
          el.style.transform = 'translate3d(0, 0, 0)';
        }
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      el.style.transform = '';
    };
  }, [padding, strength, reduced]);

  return (
    <span ref={ref} className={cn('inline-flex max-w-full will-change-transform', className)}>
      {children}
    </span>
  );
}
