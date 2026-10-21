import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { StoryScene } from '@/components/illustrations/scenes';
import { IllustrativeBadge } from '@/components/ui';
import { useReducedMotionSafe } from '@/design/motion';
import { useT, usePick } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { cardGeometry, FRAME, roundedPolygonPath, wrap } from './carouselGeometry';
import type { CarouselStory } from './sample-data';

const DRIFT = -50; // units / s, right → left
const DECAY = 0.05; // momentum keeps 5% after one second (decays ~95%/s)
const PHONE_MAX = 820;

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
  // Phones use a slightly larger scale so card text stays ≥14px; laptops with short screens get a floor so cards don’t shrink below ~145px.
  const u = phone ? width / 470 : Math.min(width / 1440, Math.max(vh / 1080, width / 1600));
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
 * Arched row of tall story cards drawn as rounded quads (clip-path recomputed every frame).
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
  const [grabbing, setGrabbing] = useState(false);

  const state = useRef({ offset: 0, momentum: 0, dragging: false, lastX: 0, lastT: 0, moved: 0, pointerId: -1, suppressClick: false, visible: true });

  const copies = Math.max(1, Math.ceil((frame.wUnits + 900) / (stories.length * FRAME.pitch)));
  const slots = useMemo(() => Array.from({ length: stories.length * copies }, (_, i) => stories[i % stories.length]!), [stories, copies]);
  const loop = slots.length * FRAME.pitch;

  const layout = useCallback(() => {
    const { u, wUnits, hUnits } = frame;
    const centre = wUnits / 2;
    const centreY = hUnits / 2 + 12;
    const { offset } = state.current;
    const r = FRAME.radius * u;
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
      const top = Math.min(g.left.top, g.right.top);
      const bottom = Math.max(g.left.bottom, g.right.bottom);
      const w = g.width * u;
      const h = (bottom - top) * u;
      el.style.visibility = 'visible';
      el.style.width = `${w.toFixed(2)}px`;
      el.style.height = `${h.toFixed(2)}px`;
      el.style.transform = `translate3d(${((g.x - halfW) * u).toFixed(2)}px, ${(top * u).toFixed(2)}px, 0)`;
      const path = roundedPolygonPath(
        [
          [0, (g.left.top - top) * u],
          [w, (g.right.top - top) * u],
          [w, (g.right.bottom - top) * u],
          [0, (g.left.bottom - top) * u],
        ],
        r,
      );
      el.style.clipPath = `path('${path}')`;
    }
  }, [frame, slots.length, loop]);

  // Resize → recompute frame units.
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const update = () => setFrame(measure(band.clientWidth || window.innerWidth));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(band);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useLayoutEffect(() => {
    layout();
  }, [layout]);

  // Visibility → only animate while on screen.
  useEffect(() => {
    const band = bandRef.current;
    if (!band || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      state.current.visible = entry?.isIntersecting ?? true;
    });
    io.observe(band);
    return () => io.disconnect();
  }, []);

  // Animation loop.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      if (s.visible && !s.dragging) {
        const drift = reduced || userPaused ? 0 : DRIFT;
        const momentum = reduced ? 0 : s.momentum;
        if (drift !== 0 || Math.abs(momentum) > 0.5) {
          s.offset += (drift + momentum) * dt;
          s.offset = wrap(s.offset, loop);
          layout();
        }
        s.momentum *= Math.pow(DECAY, dt);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layout, loop, reduced, userPaused]);

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
      setGrabbing(true);
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
    layout();
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const s = state.current;
    if (!s.dragging || e.pointerId !== s.pointerId) return;
    s.dragging = false;
    if (performance.now() - s.lastT > 80) s.momentum = 0;
    setGrabbing(false);
  }

  const bandStyle = { height: `${(frame.hUnits * frame.u).toFixed(1)}px`, '--u': `${frame.u}px`, touchAction: 'pan-y' } as CSSProperties;
  const fs = (n: number, min: number) => ({ fontSize: `max(${min}px, calc(var(--u) * ${n}))` });

  return (
    <div className={cn('relative', className)}>
      <div
        ref={bandRef}
        aria-hidden="true"
        className={cn('relative w-full select-none overflow-hidden', grabbing ? 'cursor-grabbing' : 'cursor-grab')}
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
            className="absolute left-0 top-0 overflow-hidden will-change-transform"
            style={{ visibility: 'hidden' }}
          >
            <StoryScene kind={story.scene} className="absolute inset-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,27,24,0.88)_0%,rgba(18,27,24,0.45)_38%,rgba(18,27,24,0)_62%)]" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between" style={{ padding: 'calc(var(--u) * 26) calc(var(--u) * 14) 0' }}>
              <span className="rounded-full bg-cream/85 font-semibold text-heritage-deep backdrop-blur-sm" style={{ ...fs(13, 14), padding: 'calc(var(--u) * 3) calc(var(--u) * 10)' }}>
                {pick(story.topic)}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 text-cream" style={{ padding: '0 calc(var(--u) * 14) calc(var(--u) * 22)' }}>
              <p className="line-clamp-4 font-serif italic leading-[1.3]" style={fs(16, 14)}>
                “{pick(story.quote)}”
              </p>
              {/* Name on its own line (wraps rather than truncating on narrow cards); age · duration beside the play button. */}
              <p className="text-balance break-words font-semibold leading-tight" style={{ ...fs(13, 14), marginTop: 'calc(var(--u) * 8)' }}>
                {pick(story.narrator)}
              </p>
              <div className="flex items-center" style={{ marginTop: 'calc(var(--u) * 2)', gap: 'calc(var(--u) * 2)' }}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onPlay?.(story)}
                  className="group/play -ml-[6px] inline-flex size-11 shrink-0 items-center justify-center rounded-full"
                  aria-label={t('ui.carousel.listen', { title: pick(story.quote) })}
                >
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/25 text-white ring-1 ring-white/40 backdrop-blur-md transition-transform group-hover/play:scale-110">
                    <Play className="ml-0.5 size-3.5 fill-current" />
                  </span>
                </button>
                <span className="min-w-0 tabular-nums leading-tight opacity-85" style={fs(12, 14)}>
                  <span className="whitespace-nowrap">{t('meta.age', { age: story.age })}</span> · <span className="whitespace-nowrap">{formatDuration(story.duration)}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* The cards show named people: label them as illustrative right on the carousel (the band itself is aria-hidden). */}
      <IllustrativeBadge className="absolute bottom-3 left-4 z-10 md:left-8" />
      {!reduced && (
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          aria-pressed={userPaused}
          aria-label={userPaused ? t('ui.carousel.resume') : t('ui.carousel.pause')}
          title={userPaused ? t('ui.carousel.resume') : t('ui.carousel.pause')}
          className="absolute bottom-1 right-4 z-10 inline-flex size-12 items-center justify-center rounded-full bg-paper/80 text-heritage ring-1 ring-line backdrop-blur transition-colors hover:bg-paper md:right-8"
        >
          {userPaused ? <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" /> : <Pause className="size-4 fill-current" aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
