import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { StoryScene } from '@/components/illustrations/scenes';
import { useReducedMotionSafe } from '@/design/motion';
import { useT, usePick } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { cardGeometry, cardWidth, edgeHeight, FRAME, quadMatrix3d, wrap } from './carouselGeometry';
import type { CarouselStory } from './sample-data';

const DRIFT = -50; // units / s, right → left
const DECAY = 0.05; // momentum keeps 5% after one second (decays ~95%/s)
const PHONE_MAX = 820;
/**
 * Cards are laid out once at K× the centre card's size and projected onto their quad with matrix3d(), so every frame is
 * compositor-only. K ≈ the side/centre size ratio keeps the projection a downscale almost everywhere (text stays crisp).
 */
const K = 1.4;
const BASE_W = cardWidth(0) * K;
const BASE_H = edgeHeight(0) * K;

interface Frame {
  u: number;
  /** band size in units */
  wUnits: number;
  hUnits: number;
  phone: boolean;
}

function measure(width: number): Frame {
  const phone = width <= PHONE_MAX;
  const vh = typeof window !== 'undefined' ? window.innerHeight || 900 : 900;
  const u = phone ? width / 640 : Math.min(width / 1440, vh / 1080);
  const hUnits = phone ? 400 : 414;
  return { u: u || 1, wUnits: (width || 1440) / (u || 1), hUnits, phone };
}

export interface CurvedCarouselProps {
  stories: CarouselStory[];
  /** Called when a card's play icon is pressed. */
  onPlay?: (story: CarouselStory) => void;
  /** Visible text label for the pause control's region. */
  className?: string;
}

/**
 * Arched row of tall story cards projected onto quads (one matrix3d per card per frame: no layout, no repaint).
 * Auto-drifts ~50u/s, can be dragged 1:1 with momentum, loops seamlessly, pauses off-screen, and is static under reduced motion.
 * Decorative for assistive tech: the same stories are reachable via the sample and knowledge sections.
 */
export function CurvedCarousel({ stories, onPlay, className }: CurvedCarouselProps) {
  const t = useT('landing');
  const pick = usePick();
  const reduced = useReducedMotionSafe();
  const bandRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [frame, setFrame] = useState<Frame>(() => measure(typeof window !== 'undefined' ? window.innerWidth : 1440));
  const [userPaused, setUserPaused] = useState(false);

  const state = useRef({ offset: 0, momentum: 0, dirty: false, dragging: false, lastX: 0, lastT: 0, moved: 0, pointerId: -1, suppressClick: false, visible: true });

  const copies = Math.max(1, Math.ceil((frame.wUnits + 900) / (stories.length * FRAME.pitch)));
  const slots = useMemo(() => Array.from({ length: stories.length * copies }, (_, i) => stories[i % stories.length]!), [stories, copies]);
  const loop = slots.length * FRAME.pitch;

  const layout = useCallback(() => {
    const { u, wUnits, hUnits } = frame;
    const centre = wUnits / 2;
    const centreY = hUnits / 2 + 12;
    const { offset } = state.current;
    for (let i = 0; i < slots.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const tOff = wrap(i * FRAME.pitch + offset, loop);
      const g = cardGeometry(tOff, { centre, centreY, maxD: 1.2 });
      const halfW = g.width / 2;
      if (g.x + halfW < -20 || g.x - halfW > wUnits + 20) {
        el.style.visibility = 'hidden';
        continue;
      }
      const xl = (g.x - halfW) * u;
      const xr = (g.x + halfW) * u;
      el.style.visibility = 'visible';
      el.style.transform = quadMatrix3d(BASE_W * u, BASE_H * u, [xl, g.left.top * u], [xr, g.right.top * u], [xr, g.right.bottom * u], [xl, g.left.bottom * u]);
    }
  }, [frame, slots.length, loop]);

  // Resize → recompute frame units.
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const update = () => {
      const next = measure(band.clientWidth || window.innerWidth);
      setFrame((f) => (f.u === next.u && f.wUnits === next.wUnits && f.hUnits === next.hUnits && f.phone === next.phone ? f : next));
    };
    update();
    // The window listener catches viewport-height changes (u depends on innerHeight on desktop) that ResizeObserver misses.
    window.addEventListener('resize', update);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(band);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useLayoutEffect(() => {
    layout();
  }, [layout]);

  // Animation loop: schedules frames only while something moves (drift, momentum or a drag) and the band is on screen;
  // otherwise it stops completely (no idle 120 Hz wake-ups) until start() is called again.
  const startRef = useRef<() => void>(() => {});
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const s = state.current;
      if (!s.visible) return;
      if (s.dragging) {
        if (s.dirty) {
          s.dirty = false;
          layout();
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      const drift = reduced || userPaused ? 0 : DRIFT;
      const momentum = reduced ? 0 : s.momentum;
      if (drift === 0 && Math.abs(momentum) <= 0.5) {
        s.momentum = 0;
        if (s.dirty) {
          s.dirty = false;
          layout();
        }
        return;
      }
      s.offset = wrap(s.offset + (drift + momentum) * dt, loop);
      s.momentum *= Math.pow(DECAY, dt);
      s.dirty = false;
      layout();
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (raf || !state.current.visible) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    startRef.current = start;
    start();
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      startRef.current = () => {};
    };
  }, [layout, loop, reduced, userPaused]);

  // Visibility → only animate while on screen.
  useEffect(() => {
    const band = bandRef.current;
    if (!band || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      state.current.visible = entry?.isIntersecting ?? true;
      if (state.current.visible) startRef.current();
    });
    io.observe(band);
    return () => io.disconnect();
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const s = state.current;
    s.dragging = true;
    s.lastX = e.clientX;
    s.lastT = performance.now();
    s.moved = 0;
    s.momentum = 0;
    s.pointerId = e.pointerId;
    s.suppressClick = false;
    startRef.current();
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const s = state.current;
    if (!s.dragging || e.pointerId !== s.pointerId) return;
    const now = performance.now();
    const dx = e.clientX - s.lastX;
    const dtMs = Math.max(1, now - s.lastT);
    s.lastX = e.clientX;
    s.lastT = now;
    s.moved += Math.abs(dx);
    if (s.moved > 6 && !s.suppressClick) {
      s.suppressClick = true;
      bandRef.current?.classList.add('cursor-grabbing');
      try {
        bandRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
    const du = dx / frame.u;
    s.offset = wrap(s.offset + du, loop);
    const v = (du / dtMs) * 1000;
    s.momentum = s.momentum * 0.6 + v * 0.4;
    s.dirty = true; // applied once on the next frame, however many pointer events arrive before it
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const s = state.current;
    if (!s.dragging || e.pointerId !== s.pointerId) return;
    s.dragging = false;
    if (performance.now() - s.lastT > 80) s.momentum = 0;
    bandRef.current?.classList.remove('cursor-grabbing');
    startRef.current();
  }

  const bandStyle = { height: `${(frame.hUnits * frame.u).toFixed(1)}px`, '--u': `${frame.u}px`, touchAction: 'pan-y' } as CSSProperties;
  // Inside a card --u is K× the band's unit: the card is laid out at K× size, then projected down.
  const fs = (n: number, min: number) => ({ fontSize: `max(${min * K}px, calc(var(--u) * ${n}))` });
  const cardStyle = {
    visibility: 'hidden',
    width: `${(BASE_W * frame.u).toFixed(2)}px`,
    height: `${(BASE_H * frame.u).toFixed(2)}px`,
    borderRadius: `${(FRAME.radius * K * frame.u).toFixed(2)}px`,
    transformOrigin: '0 0',
    '--u': `${frame.u * K}px`,
  } as CSSProperties;

  return (
    <div className={cn('relative', className)}>
      <div
        ref={bandRef}
        aria-hidden="true"
        className="relative w-full cursor-grab select-none overflow-hidden"
        style={bandStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (state.current.suppressClick) {
            e.preventDefault();
            e.stopPropagation();
            state.current.suppressClick = false;
          }
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        {slots.map((story, i) => (
          <div
            key={`${story.id}-${i}`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 overflow-hidden will-change-transform [backface-visibility:hidden]"
            style={cardStyle}
          >
            <StoryScene kind={story.scene} className="absolute inset-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,27,24,0.88)_0%,rgba(18,27,24,0.45)_38%,rgba(18,27,24,0)_62%)]" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between" style={{ padding: 'calc(var(--u) * 26) calc(var(--u) * 14) 0' }}>
              <span className="rounded-full bg-cream/90 font-semibold text-heritage-deep" style={{ ...fs(11, 9), padding: 'calc(var(--u) * 3) calc(var(--u) * 9)' }}>
                {pick(story.topic)}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 text-cream-fixed" style={{ padding: '0 calc(var(--u) * 14) calc(var(--u) * 30)' }}>
              <p className="font-serif italic leading-[1.3]" style={fs(15.5, 11)}>
                “{pick(story.quote)}”
              </p>
              <div className="flex items-center" style={{ marginTop: 'calc(var(--u) * 10)', gap: 'calc(var(--u) * 8)' }}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onPlay?.(story)}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/40 transition-transform hover:scale-110"
                  style={{ width: `max(${30 * K}px, calc(var(--u) * 38))`, height: `max(${30 * K}px, calc(var(--u) * 38))` }}
                  aria-label={t('ui.carousel.listen', { title: pick(story.quote) })}
                >
                  <Play className="ml-[8%] size-[42%] fill-current" />
                </button>
                {/* Name on its own line (wraps rather than truncating on narrow cards); age · duration below. */}
                <span className="min-w-0 leading-tight">
                  <span className="block text-balance break-words font-semibold" style={fs(11.5, 9)}>
                    {pick(story.narrator)}
                  </span>
                  <span className="block opacity-80 tabular-nums" style={fs(10.5, 9)}>
                    <span className="whitespace-nowrap">{t('meta.age', { age: story.age })}</span> · <span className="whitespace-nowrap">{formatDuration(story.duration)}</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Controls row under the band (never over a card): the pause control. */}
      <div className="mx-auto mt-3 flex min-h-12 max-w-[1264px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {!reduced && (
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-pressed={userPaused}
            aria-label={userPaused ? t('ui.carousel.resume') : t('ui.carousel.pause')}
            title={userPaused ? t('ui.carousel.resume') : t('ui.carousel.pause')}
            className="inline-flex size-12 items-center justify-center rounded-full bg-paper text-heritage ring-1 ring-line transition-colors hover:bg-paper"
          >
            {userPaused ? <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" /> : <Pause className="size-4 fill-current" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
