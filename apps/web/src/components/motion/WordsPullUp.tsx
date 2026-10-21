import { motion, useInView } from 'motion/react';
import { Fragment, useRef, type ElementType } from 'react';
import { EASE_CARD, useReducedMotionSafe } from '@/design/motion';
import { cn } from '@/lib/cn';

export interface PullUpSegment {
  text: string;
  /** Classes for this segment's words (e.g. 'font-serif italic font-normal'). */
  className?: string;
}

interface BaseProps {
  as?: ElementType;
  className?: string;
  /** Delay before the first word (s). */
  delay?: number;
  /** Delay between words (s). */
  stagger?: number;
  /** Animate on mount instead of when scrolled into view. */
  immediate?: boolean;
  /** Rise distance in px (default 20). */
  distance?: number;
}

export interface WordsPullUpProps extends BaseProps {
  text: string;
  wordClassName?: string;
  /** Render after the last word (e.g. a superscript asterisk) — it pulls up with it. */
  suffix?: React.ReactNode;
}

export interface WordsPullUpMultiStyleProps extends BaseProps {
  segments: PullUpSegment[];
}

/**
 * Each word sits in a vertically clipped slot and slides up y:20 → 0 in 350 ms (stagger 0.08 s, B15) once it enters the viewport.
 * Slots carry vertical padding so Vietnamese stacked diacritics (ố, ẫ, ặ…) are never clipped.
 * Screen readers get the plain sentence; reduced motion renders static text.
 */
function PullUp({ as: Tag = 'p', className, delay = 0, stagger = 0.08, immediate, distance = 20, words, suffix }: BaseProps & { words: Array<{ w: string; cls?: string }>; suffix?: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduced = useReducedMotionSafe();
  const show = immediate || inView;
  const label = words.map((x) => x.w).join(' ');
  return (
    <Tag ref={ref} className={className}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        {words.map(({ w, cls }, i) => {
          const last = i === words.length - 1;
          return (
            // Keyed on the word so a language switch remounts it and the pull-up replays with the new text.
            <Fragment key={`${i}:${w}`}>
              {/* Clip only vertically (overflow-y: clip, x stays visible): the rise is still masked, but a trailing
                  suffix (superscript *) or negative tracking on the last glyph is never cut at the right edge. */}
              <span className={cn('inline-block overflow-x-visible overflow-y-clip pb-[0.12em] pt-[0.22em] align-bottom -mb-[0.12em] -mt-[0.22em]', last && suffix ? 'pr-[0.08em]' : undefined)}>
              {reduced ? (
                <span className={cn('inline-block', cls)}>
                  {w}
                  {last && suffix}
                </span>
              ) : (
                <motion.span
                  className={cn('inline-block', cls)}
                  initial={{ y: distance, opacity: 0 }}
                  animate={show ? { y: 0, opacity: 1 } : undefined}
                  transition={{ duration: 0.35, ease: EASE_CARD, delay: delay + i * stagger }}
                >
                  {w}
                  {last && suffix}
                </motion.span>
              )}
              </span>
              {!last && ' '}
            </Fragment>
          );
        })}
      </span>
    </Tag>
  );
}

/** `<WordsPullUp as="h2" text="Di Sản Sống" className="text-[19vw]" />` */
export function WordsPullUp({ text, wordClassName, suffix, ...rest }: WordsPullUpProps) {
  const words = text.split(/\s+/).filter(Boolean).map((w) => ({ w, cls: wordClassName }));
  return <PullUp {...rest} words={words} suffix={suffix} />;
}

/** Mixed styles in one heading: `segments={[{ text: 'Mỗi người già' }, { text: 'là một cuốn sách', className: 'font-serif italic' }]}` */
export function WordsPullUpMultiStyle({ segments, ...rest }: WordsPullUpMultiStyleProps) {
  const words = segments.flatMap((s) =>
    s.text
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({ w, cls: s.className })),
  );
  return <PullUp {...rest} words={words} />;
}
