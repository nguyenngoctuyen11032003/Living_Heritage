import { ArrowUpRight, Headphones, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { StoryScene, type SceneKind } from '@/components/illustrations/scenes';
import { Label } from '@/components/memory-book';
import { BlurWords } from '@/components/motion';
import { IllustrativeBadge } from '@/components/ui';
import { useReducedMotionSafe } from '@/design/motion';
import { getSampleItem } from '@/features/knowledge/sample-items';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { requestSamplePlay } from './events';
import { CAROUSEL_STORIES, type Bi } from './sample-data';
import './memory-sphere.css';

/*
 * "Quả cầu ký ức" — the illustrative stories on a Fibonacci sphere around a centred headline. Drag (or swipe sideways)
 * to turn it, scroll through the section to dolly in, pick a card to open it in a FLIP lightbox. The section is a tall
 * scroll track with a sticky viewport, so the sphere holds the screen while the page scrolls past it.
 */

interface Memory {
  id: string;
  scene: SceneKind;
  topic: Bi;
  quote: Bi;
  narrator: Bi;
  /** Age for the illustrative narrators of the carousel; hub samples show region · decade instead. */
  age?: number;
  /** Hub sample → /tri-thuc/:id; otherwise the card offers the sample story. */
  hubId?: string;
}

const HUB: Array<{ id: string; scene: SceneKind; topic: Bi }> = [
  { id: 'mau-tuot-la-mai', scene: 'garden', topic: { vi: 'Làm vườn', en: 'Gardening' } },
  { id: 'mau-ca-kho-to', scene: 'kitchen', topic: { vi: 'Món ăn', en: 'Cooking' } },
  { id: 'mau-nhuom-cu-nau', scene: 'tailor', topic: { vi: 'Nghề thủ công', en: 'Crafts' } },
  { id: 'mau-nam-lut-lon', scene: 'boat', topic: { vi: 'Quê hương', en: 'Hometown' } },
  { id: 'mau-dan-ro-tre', scene: 'pottery', topic: { vi: 'Nghề thủ công', en: 'Crafts' } },
  { id: 'mau-tien-de-danh', scene: 'porch', topic: { vi: 'Gia đình', en: 'Family' } },
  { id: 'mau-hat-giong-gac-bep', scene: 'field', topic: { vi: 'Làm vườn', en: 'Gardening' } },
  { id: 'mau-tet-ao-moi', scene: 'tet', topic: { vi: 'Tuổi thơ', en: 'Childhood' } },
];

/** Carousel stories and hub samples interleaved, so neighbouring cards differ. */
const MEMORIES: Memory[] = (() => {
  const a: Memory[] = CAROUSEL_STORIES.map((s) => ({ id: s.id, scene: s.scene, topic: s.topic, quote: s.quote, narrator: s.narrator, age: s.age }));
  const b: Memory[] = HUB.flatMap(({ id, scene, topic }) => {
    const item = getSampleItem(id);
    return item ? [{ id, scene, topic, quote: item.title, narrator: item.narratorLabel, hubId: id }] : [];
  });
  const out: Memory[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]!);
    if (b[i]) out.push(b[i]!);
  }
  return out;
})();

const N = MEMORIES.length;
const GA = Math.PI * (3 - Math.sqrt(5));
const DEG = 180 / Math.PI;
/** Unit vectors in CSS space (y down, z toward the viewer) and each card's facing angles. */
const POINTS = MEMORIES.map((_, i) => {
  const y = 1 - (i / (N - 1)) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * GA;
  const x = Math.cos(theta) * rad;
  const z = Math.sin(theta) * rad;
  return { x, y: -y, z, lat: Math.asin(y) * DEG, lon: Math.atan2(x, z) * DEG };
});

const PITCH_LIMIT = 32;
const TILT = -4;
const DEG_PER_PX = 0.13;

/**
 * Resting yaw that keeps the middle clear: the spin (in 2° steps) whose nearest front-facing card is farthest from
 * the headline band, so at rest the title is not hidden behind a card.
 */
const REST_SPIN = (() => {
  const sx = TILT / DEG;
  let best = 0;
  let bestScore = -1;
  for (let deg = 0; deg < 360; deg += 2) {
    const sy = deg / DEG;
    let score = Infinity;
    for (const u of POINTS) {
      const y1 = u.y * Math.cos(sx) - u.z * Math.sin(sx);
      const z1 = u.y * Math.sin(sx) + u.z * Math.cos(sx);
      const x2 = u.x * Math.cos(sy) + z1 * Math.sin(sy);
      const z2 = -u.x * Math.sin(sy) + z1 * Math.cos(sy);
      if (z2 > 0.25) score = Math.min(score, Math.hypot(x2 * 0.7, y1 * 1.8));
    }
    if (score > bestScore) {
      bestScore = score;
      best = deg;
    }
  }
  return best;
})();

interface Layout {
  R: number;
  cw: number;
  persp: number;
  hw: number;
}

function layoutFor(w: number, h: number): Layout {
  const hr = w <= 380 ? 0.36 : w <= 640 ? 0.4 : 0.43;
  const wr = w <= 380 ? 0.46 : w <= 640 ? 0.5 : 0.56;
  const floor = w <= 380 ? 108 : w <= 640 ? 120 : 155;
  const R = Math.max(floor, Math.min(460, h * hr, w * wr));
  const cw = Math.round(Math.max(64, R * (w <= 640 ? 0.36 : 0.33)));
  const persp = w <= 380 ? 620 : w <= 640 ? 760 : w <= 900 ? 920 : 1150;
  const hw = w <= 380 ? Math.min(w * 0.88, 320) : w <= 640 ? Math.min(w * 0.84, 360) : Math.min(w * 0.56, 640);
  return { R, cw, persp, hw };
}

/** Shortest equivalent of `target` (mod 360) near `from`. */
const nearestAngle = (from: number, target: number) => from + ((((target - from) % 360) + 540) % 360) - 180;

export function MemorySphere() {
  const t = useT('landing');
  const pick = usePick();
  const reduced = useReducedMotionSafe();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const washRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [layout, setLayout] = useState<Layout>(() => layoutFor(typeof window !== 'undefined' ? window.innerWidth : 1280, typeof window !== 'undefined' ? window.innerHeight : 800));
  const [coarse, setCoarse] = useState(false);
  const [lit, setLit] = useState<number | null>(null);

  // Camera state lives in a ref: the loop mutates it every frame without re-rendering.
  const cam = useRef({ spin: REST_SPIN, dragX: 0, dragY: 0, velX: 0, velY: 0, camZ: 0, seek: -1, lit: -1, p: 0, last: [] as string[] });
  const layoutRef = useRef(layout);
  const dragRef = useRef<{ id: number; x0: number; y0: number; lx: number; ly: number; moved: number; captured: boolean; touch: boolean; card: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  useLayoutEffect(() => {
    layoutRef.current = layout;
    cam.current.lit = lit ?? -1;
  }, [layout, lit]);

  useEffect(() => setCoarse(window.matchMedia?.('(pointer: coarse)').matches ?? false), []);

  // Relayout on real size changes only (ignore < 20px: scrollbars and the mobile URL bar).
  useEffect(() => {
    let w = window.innerWidth;
    let h = window.innerHeight;
    let timer = 0;
    const apply = (force?: boolean) => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      if (!force && Math.abs(nw - w) < 20 && Math.abs(nh - h) < 20) return;
      w = nw;
      h = nh;
      setLayout(layoutFor(nw, nh));
    };
    const onResize = () => apply();
    const onOrient = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => apply(true), 220);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrient);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);

  // The camera loop: runs only while the section is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    const world = worldRef.current;
    const head = headRef.current;
    if (!section || !world || !head) return;
    let frame = 0;
    let running = false;
    const c = cam.current;

    const tick = () => {
      const { R, persp } = layoutRef.current;
      const rect = section.getBoundingClientRect();
      const track = Math.max(1, rect.height - window.innerHeight);
      const p = reduced ? 0 : Math.min(1, Math.max(0, -rect.top / track));
      c.p = p;
      const isLit = c.lit >= 0;

      if (!dragRef.current?.captured && !isLit) {
        if (c.seek >= 0) {
          // Keyboard focus: turn the focused card to face the camera.
          const q = POINTS[c.seek]!;
          const sx0 = (TILT + c.dragY) / DEG;
          const qx = q.x;
          const qz = q.y * Math.sin(sx0) + q.z * Math.cos(sx0);
          const want = nearestAngle(c.spin + c.dragX, Math.atan2(-qx, qz) * DEG) - c.spin;
          c.dragX += reduced ? want - c.dragX : (want - c.dragX) * 0.12;
          if (Math.abs(want - c.dragX) < 0.05) c.seek = -1;
        } else if (!reduced) {
          c.dragX += c.velX;
          c.dragY += c.velY;
          c.velX *= 0.94;
          c.velY *= 0.94;
          if (Math.abs(c.velX) < 0.002) c.velX = 0;
          if (Math.abs(c.velY) < 0.002) c.velY = 0;
        }
      }
      c.dragY = Math.max(-PITCH_LIMIT - TILT, Math.min(PITCH_LIMIT - TILT, c.dragY));
      // Scrolling through the section turns the sphere a little and dollies forward (never through it).
      const spinTarget = REST_SPIN + p * 70;
      c.spin += isLit ? 0 : (spinTarget - c.spin) * 0.08;
      const zTarget = p * Math.min(90, R * 0.18);
      c.camZ += (zTarget - c.camZ) * 0.075;

      const sx = TILT + c.dragY;
      const sy = c.spin + c.dragX;
      world.style.transform = `translateZ(${c.camZ.toFixed(2)}px) rotateY(${sy.toFixed(3)}deg) rotateX(${sx.toFixed(3)}deg)`;
      // Same centre point and depth as before, but outside the sphere's 3D context (see the JSX): no counter-rotation needed.
      head.style.transform = `translateZ(${(c.camZ + R * 0.62).toFixed(1)}px)`;
      head.style.opacity = String(isLit ? 0 : Math.max(0, 1 - p * 0.55));

      const rx = sx / DEG;
      const ry = sy / DEG;
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const shade = 1 - Math.min(0.6, p * 0.8);
      const near = persp * 0.66;
      for (let i = 0; i < N; i++) {
        const u = POINTS[i]!;
        const z1 = u.y * sinX + u.z * cosX;
        const zf = -u.x * sinY + z1 * cosY;
        const base = 0.14 + 0.86 * Math.pow((zf + 1) / 2, 0.85);
        let dim = shade * (1 - base);
        let fade = 1;
        const absZ = zf * R + c.camZ;
        if (absZ > near) fade = Math.max(0, 1 - (absZ - near) / 190);
        if (isLit) {
          dim = Math.min(1, dim + 0.7);
          if (i === c.lit) fade = 0;
        }
        const back = zf < -0.2;
        const key = `${dim.toFixed(3)}|${fade.toFixed(3)}|${back ? 1 : 0}`;
        if (c.last[i] === key) continue;
        c.last[i] = key;
        const wash = washRefs.current[i];
        const card = cardRefs.current[i];
        if (wash) wash.style.opacity = dim.toFixed(3);
        if (card) {
          card.style.opacity = fade.toFixed(3);
          card.toggleAttribute('data-back', back);
        }
      }
      if (running) frame = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      const on = Boolean(e?.isIntersecting);
      if (on && !running) {
        running = true;
        frame = requestAnimationFrame(tick);
      } else if (!on) {
        running = false;
        cancelAnimationFrame(frame);
      }
    });
    io.observe(section);
    tick();
    return () => {
      running = false;
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  // ---- drag -------------------------------------------------------------------------------------------------------

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (lit !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const cardEl = (e.target as HTMLElement).closest<HTMLElement>('[data-idx]');
    const touch = e.pointerType === 'touch';
    dragRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0, captured: !touch, touch, card: cardEl ? Number(cardEl.dataset.idx) : -1 };
    cam.current.seek = -1;
    cam.current.velX = 0;
    cam.current.velY = 0;
    if (!touch) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const tx = e.clientX - d.x0;
    const ty = e.clientY - d.y0;
    d.moved = Math.max(d.moved, Math.hypot(tx, ty));
    if (d.touch && !d.captured) {
      if (d.moved < 10) return;
      if (Math.abs(ty) > Math.abs(tx) * 1.15) {
        dragRef.current = null; // a vertical swipe: let the page scroll
        return;
      }
      d.captured = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      d.lx = e.clientX;
      d.ly = e.clientY;
      return;
    }
    const dx = (e.clientX - d.lx) * DEG_PER_PX;
    const dy = (e.clientY - d.ly) * DEG_PER_PX;
    d.lx = e.clientX;
    d.ly = e.clientY;
    const c = cam.current;
    c.dragX += dx;
    c.dragY -= dy;
    c.velX = dx;
    c.velY = -dy;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const slop = d.touch ? 14 : 6;
    if (!cancelled && d.moved < slop && d.card >= 0) open(d.card);
  };

  // ---- lightbox ---------------------------------------------------------------------------------------------------
  const open = useCallback((idx: number) => {
    cam.current.velX = 0;
    cam.current.velY = 0;
    setLit(idx);
  }, []);
  const close = useCallback(() => setLit(null), []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="ms-title"
      className="relative h-[185vh] bg-mb-bg"
      style={{ '--ms-cw': `${layout.cw}px`, '--ms-persp': `${layout.persp}px`, '--ms-hw': `${layout.hw}px` } as CSSProperties}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div
          ref={stageRef}
          className={cn('ms-stage', dragging && 'is-dragging')}
          data-cursor="drag"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, false)}
          onPointerCancel={(e) => endDrag(e, true)}
        >
          <div ref={worldRef} className="ms-world">
            <div className="ms-orb">
              {MEMORIES.map((m, i) => {
                const u = POINTS[i]!;
                const R = layout.R;
                return (
                  <button
                    key={m.id}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    type="button"
                    data-idx={i}
                    className="ms-card"
                    aria-label={t('home.sphere.open', { title: pick(m.quote) })}
                    style={{ transform: `translate3d(${(u.x * R).toFixed(1)}px, ${(u.y * R).toFixed(1)}px, ${(u.z * R).toFixed(1)}px) rotateY(${u.lon.toFixed(2)}deg) rotateX(${u.lat.toFixed(2)}deg)` }}
                    onFocus={() => (cam.current.seek = i)}
                    onClick={(e) => {
                      // Pointer taps open from onPointerUp (the stage captures the pointer); this is the keyboard path.
                      if (e.detail === 0) open(i);
                    }}
                  >
                    <span className="ms-card__fig">
                      <StoryScene kind={m.scene} />
                      <span className="ms-card__tag">{pick(m.topic)}</span>
                    </span>
                    <span
                      ref={(el) => {
                        washRefs.current[i] = el;
                      }}
                      className="ms-card__wash"
                    />
                  </button>
                );
              })}
            </div>
          </div>
          {/*
            The headline shares the world's centre point and depth (translateZ under the same perspective) but is its
            own sibling: inside the world's preserve-3d context Chrome plane-splits it against the cards and slices the
            words. Here it always reads on top of the sphere.
          */}
          <h2 ref={headRef} id="ms-title" className="ms-headline mb-display">
            <span className="ms-headline__inner">
              <BlurWords segments={[{ text: t('home.sphere.title') }]} delay={0.2} />
            </span>
          </h2>
        </div>
        <div aria-hidden="true" className="ms-vignette" style={{ opacity: lit !== null ? 0 : 1 }} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 px-4 pt-24 sm:px-6 lg:px-8">
          <Label>{t('home.sphere.label')}</Label>
          <IllustrativeBadge tone="outline" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] flex justify-center px-4 sm:bottom-6">
          <p className="ms-cue text-center" style={{ opacity: lit !== null ? 0 : 1 }}>
            <s aria-hidden="true" />
            {coarse ? t('home.sphere.hintTouch') : t('home.sphere.hint')}
          </p>
        </div>
      </div>

      {lit !== null && <MemoryLightbox memory={MEMORIES[lit]!} source={cardRefs.current[lit] ?? null} onClose={close} reduced={reduced} />}
    </section>
  );
}

/**
 * The opened memory: the card's illustration flies from the card to the plate (FLIP) and back on close. Escape, the
 * scrim and the close button close it; focus is held inside and returned to the card.
 */
function MemoryLightbox({ memory, source, onClose, reduced }: { memory: Memory; source: HTMLElement | null; onClose: () => void; reduced: boolean }) {
  const t = useT('landing');
  const tc = useT('common');
  const tk = useT('knowledge');
  const pick = usePick();
  const rootRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);
  const hub = memory.hubId ? getSampleItem(memory.hubId) : undefined;

  const flipFrom = (el: HTMLElement | null, art: HTMLElement) => {
    if (!el) return null;
    const from = el.getBoundingClientRect();
    const to = art.getBoundingClientRect();
    if (!from.width || !to.width) return null;
    const s = Math.max(0.04, from.width / to.width);
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${s})`;
  };

  // FLIP in: start on the card, animate home.
  useLayoutEffect(() => {
    const art = artRef.current;
    if (!art || reduced) return;
    const start = flipFrom(source, art);
    if (!start) return;
    art.style.transition = 'none';
    art.style.transform = start;
    art.style.opacity = '0.4';
    void art.offsetWidth;
    art.style.transition = 'transform .62s cubic-bezier(.22,.61,.36,1), opacity .42s ease';
    art.style.transform = '';
    art.style.opacity = '';
  }, [source, reduced]);

  const requestClose = useCallback(
    (after?: () => void) => {
      if (closing) return;
      const art = artRef.current;
      const end = art && !reduced ? flipFrom(source, art) : null;
      if (!end || !art) {
        onClose();
        source?.focus({ preventScroll: true });
        after?.();
        return;
      }
      setClosing(true);
      art.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1), opacity .5s ease';
      art.style.transform = end;
      art.style.opacity = '0';
      window.setTimeout(() => {
        onClose();
        source?.focus({ preventScroll: true });
        after?.();
      }, 480);
    },
    [closing, onClose, reduced, source],
  );

  // Page scroll lock, Escape, initial focus.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    document.addEventListener('keydown', onKey);
    return () => {
      html.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [requestClose]);

  // Keep Tab inside the dialog.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !rootRef.current) return;
    const items = rootRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const meta = memory.age ? t('home.sphere.age', { age: memory.age }) : hub ? `${tk(`regions.${hub.region}`)} · ${tk('card.decade', { decade: hub.decade })}` : '';

  return createPortal(
    <div ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="ms-lit-title" className="mb-page ms-lit fixed inset-0 z-[60] text-mb" data-closing={closing ? '' : undefined} onKeyDown={onKeyDown}>
      <div aria-hidden="true" className="ms-scrim absolute inset-0" onClick={() => requestClose()} />
      <div
        className="relative h-full overflow-y-auto overscroll-contain"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('.ms-art, .ms-meta')) requestClose();
        }}
      >
        <div className="mx-auto grid min-h-full max-w-6xl items-center gap-8 px-4 pb-12 pt-20 sm:px-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-14 md:py-16 lg:px-8">
          <div ref={artRef} className="ms-art relative mx-auto aspect-[3/4] w-full max-w-[min(420px,calc((100svh-10rem)*0.75))] overflow-hidden rounded-[14px] bg-[var(--mb-fr2)] max-md:max-w-[min(300px,70vw)]">
            <StoryScene kind={memory.scene} />
          </div>
          <div className="ms-meta wrap-anywhere">
            <Label>{pick(memory.topic)}</Label>
            <h3 id="ms-lit-title" className="mb-display mt-4 text-balance text-[clamp(1.8rem,3.4vw,3rem)] text-mb">
              “{pick(memory.quote)}”
            </h3>
            <p className="mt-5 text-[1rem] text-mb/70">
              {pick(memory.narrator)}
              {meta && <span className="text-mb/50"> · {meta}</span>}
            </p>
            {hub && <p className="mt-4 max-w-xl text-pretty text-[1rem] leading-relaxed text-mb/80">{pick(hub.summary)}</p>}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {hub ? (
                <Link to={`/tri-thuc/${hub.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-mb px-6 font-semibold text-mb-bg transition-colors hover:bg-mb/85">
                  {t('home.sphere.read')}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              ) : (
                <button type="button" onClick={() => requestClose(() => window.setTimeout(requestSamplePlay, 30))} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-mb px-6 font-semibold text-mb-bg transition-colors hover:bg-mb/85">
                  <Headphones aria-hidden="true" className="size-4" />
                  {t('home.sphere.listen')}
                </button>
              )}
              <IllustrativeBadge tone="outline" />
            </div>
          </div>
        </div>
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={() => requestClose()}
        className="ms-close liquid-glass absolute right-4 top-4 inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-[0.95rem] text-mb transition-colors hover:bg-mb/10 sm:right-6 sm:top-6"
      >
        <X aria-hidden="true" className="size-4" />
        {tc('actions.close')}
      </button>
    </div>,
    document.body,
  );
}
