import type { CSSProperties, ReactNode } from 'react';
import { useReducedMotionSafe } from '@/design/motion';
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

/** Hand-written Caveat note in heritage green that fades in once (CSS keyframes). Decorative by default (aria-hidden) — repeat important text elsewhere. */
export function HandNote({ children, rotate = -4, delay = 0, className, style }: HandNoteProps) {
  const reduced = useReducedMotionSafe();
  return (
    <span
      aria-hidden="true"
      className={cn(baseDisplay('inline-block', className), 'pointer-events-none select-none whitespace-nowrap font-hand font-semibold leading-[1.15] text-heritage', reduced ? 'lh-note-static' : 'lh-note', className)}
      style={{ ...style, '--hn-r': `${rotate}deg`, '--hn-delay': `${delay}s` } as CSSProperties}
    >
      {children}
    </span>
  );
}
