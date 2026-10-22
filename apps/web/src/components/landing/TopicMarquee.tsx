import { useEffect, useRef } from 'react';
import { useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';

/**
 * Two rows of topic words that slide in opposite directions with the page scroll (offset = (scrollY − sectionTop +
 * innerHeight) × 0.3): the top row solid, the bottom row outlined. Only runs while on screen; rows are decorative and
 * the topics are listed once for screen readers. Static under reduced motion.
 */
export function TopicMarquee() {
  const t = useT('landing');
  const reduced = useReducedMotionSafe();
  const sectionRef = useRef<HTMLElement>(null);
  const rowA = useRef<HTMLDivElement>(null);
  const rowB = useRef<HTMLDivElement>(null);
  const a = t('home.marquee.rowA').split('|');
  const b = t('home.marquee.rowB').split('|');

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || reduced) return;
    let frame = 0;
    let visible = false;
    const paint = () => {
      frame = 0;
      const top = section.getBoundingClientRect().top + window.scrollY;
      const offset = (window.scrollY - top + window.innerHeight) * 0.3;
      rowA.current?.style.setProperty('transform', `translate3d(${offset - 320}px,0,0)`);
      rowB.current?.style.setProperty('transform', `translate3d(${-(offset - 320)}px,0,0)`);
    };
    const onScroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(paint);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      if (visible) onScroll();
    });
    io.observe(section);
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduced]);

  const row = (words: string[], outline: boolean) =>
    [0, 1, 2].flatMap((rep) =>
      words.map((w, i) => (
        <span key={`${rep}-${i}`} className="flex shrink-0 items-center gap-[0.45em]">
          <span className={cn('whitespace-nowrap', outline ? 'home-marquee__outline' : 'text-mb')}>{w}</span>
          <span aria-hidden="true" className="inline-block size-[0.16em] rotate-45 bg-[#d8b46a]" />
        </span>
      )),
    );

  return (
    <section ref={sectionRef} aria-label={t('home.marquee.label')} className="relative overflow-hidden bg-mb-bg py-10 md:py-16">
      <ul className="sr-only">
        {[...a, ...b].map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="mb-display flex select-none flex-col gap-2 text-[clamp(2.6rem,7.5vw,6.6rem)] leading-[1.15] md:gap-3">
        <div ref={rowA} className="flex w-max gap-[0.45em] will-change-transform">
          {row(a, false)}
        </div>
        <div ref={rowB} className="flex w-max gap-[0.45em] italic will-change-transform">
          {row(b, true)}
        </div>
      </div>
      <div aria-hidden="true" className="home-marquee__fade pointer-events-none absolute inset-0" />
    </section>
  );
}
