import { useEffect, useRef } from 'react';
import { useReducedMotionSafe } from '@/design/motion';

const INTERACTIVE = 'a, button, [role="button"], input, label, summary, .ms-card';

/**
 * A soft dot that trails the cursor (lerp 0.2, mix-blend difference so it reads on cream and black) and opens into a
 * ring over links, buttons and memory cards, or a wider "grab" ring over the sphere. The native cursor stays.
 * Fine pointers with hover only; nothing on touch or under reduced motion. Decorative.
 */
export function CursorDot() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let frame = 0;
    let shown = false;
    const loop = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      frame = Math.abs(x - cx) + Math.abs(y - cy) > 0.1 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        shown = true;
        cx = x;
        cy = y;
        el.dataset.on = '';
      }
      const target = e.target instanceof Element ? e.target : null;
      const mode = target?.closest(INTERACTIVE) ? 'wide' : target?.closest('[data-cursor="drag"]') ? 'drag' : '';
      if (el.dataset.mode !== mode) el.dataset.mode = mode;
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      shown = false;
      delete el.dataset.on;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  return <div ref={ref} aria-hidden="true" className="home-cursor" />;
}
