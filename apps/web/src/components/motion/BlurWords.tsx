import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import './motion.css';

export interface BlurSegment {
  text: string;
  className?: string;
  /** Line break after this segment (from `sm` up, like the hero's <br className="hidden sm:block" />). */
  breakAfter?: boolean;
}

/**
 * Words rise out of a soft blur, one after another (opacity, translateY .42em, blur 7px → sharp; 85 ms stagger).
 * Plays once: on mount (`immediate`) or when the parent element scrolls into view. The text stays real text for
 * screen readers and search; reduced motion shows it at once (motion.css).
 */
export function BlurWords({ segments, delay = 0, immediate, className, children }: { segments: BlurSegment[]; delay?: number; immediate?: boolean; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (immediate || typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && (setInView(true), io.disconnect()), { rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  let i = 0;
  return (
    <span ref={ref} className={className} data-bw-in={inView ? '' : undefined} style={{ '--bw-delay': `${delay}s` } as CSSProperties}>
      {segments.map((seg, si) => {
        const words = seg.text.split(/\s+/).filter(Boolean);
        return (
          <Fragment key={`${si}:${seg.text}`}>
            {words.map((w, wi) => (
              <Fragment key={wi}>
                <span className={cn('blur-word', seg.className)} style={{ '--bw-i': i++ } as CSSProperties}>
                  {w}
                </span>
                {wi < words.length - 1 && ' '}
              </Fragment>
            ))}
            {seg.breakAfter ? <br className="hidden sm:block" /> : null}
            {si < segments.length - 1 && ' '}
          </Fragment>
        );
      })}
      {children}
    </span>
  );
}
