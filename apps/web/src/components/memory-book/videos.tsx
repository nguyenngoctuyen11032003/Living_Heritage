import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotionSafe } from '@/design/motion';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { PlaybackContext, usePlayback, type Playback } from './playback';

/*
 * Video rules: always muted + playsInline, aria-hidden, a gradient underneath as the fallback, no autoplay under
 * prefers-reduced-motion, below-the-fold clips load only near the viewport, and one page-wide pause/play state that
 * every video's toggle controls (WCAG 2.2.2).
 */
const FADE_MS = 500;
const FADE_OUT_BEFORE_END_S = 0.55;

/** Page-wide video state. Starts paused under reduced motion; a toggle press is an explicit choice and wins. */
export function VideoPlaybackProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionSafe();
  const [choice, setChoice] = useState<boolean | null>(null);
  const paused = choice ?? reduced;
  const value = useMemo<Playback>(() => ({ paused, reduced, toggle: () => setChoice(!paused) }), [paused, reduced]);
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

function play(v: HTMLVideoElement) {
  v.muted = true;
  const p = v.play() as Promise<void> | undefined;
  p?.catch?.(() => {});
}

/** Animate the element's opacity with requestAnimationFrame (cancels any running fade). */
function useFader() {
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return useCallback((el: HTMLElement, to: number, ms = FADE_MS) => {
    cancelAnimationFrame(raf.current);
    const from = Number.parseFloat(el.style.opacity || '0');
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      el.style.opacity = String(from + (to - from) * k);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);
}

/**
 * Full-bleed hero clip with a seamless crossfade loop: fade in on canplay, fade out in the last 0.55 s, then on ended
 * reset, wait 100 ms, replay and fade in again. Under reduced motion it never autoplays and shows the first frame.
 */
export function HeroVideo({ src, className }: { src: string; className?: string }) {
  const { paused, reduced } = usePlayback();
  const ref = useRef<HTMLVideoElement>(null);
  const fade = useFader();
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    let fadingOut = false;
    let timer = 0;
    const onCanPlay = () => {
      if (Number.parseFloat(v.style.opacity || '0') < 1 && !fadingOut) fade(v, 1);
    };
    const onTime = () => {
      if (!fadingOut && v.duration > 0 && v.duration - v.currentTime <= FADE_OUT_BEFORE_END_S) {
        fadingOut = true;
        fade(v, 0);
      }
    };
    const onEnded = () => {
      v.style.opacity = '0';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        v.currentTime = 0;
        fadingOut = false;
        if (!pausedRef.current) play(v);
        fade(v, 1);
      }, 100);
    };
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('loadeddata', onCanPlay);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    if (v.readyState >= 2) onCanPlay();
    return () => {
      window.clearTimeout(timer);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('loadeddata', onCanPlay);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnded);
    };
  }, [fade]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (paused) v.pause();
    else play(v);
  }, [paused]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      preload={reduced ? 'metadata' : 'auto'}
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
      data-testid="mb-hero-video"
      style={{ opacity: 0 }}
      className={cn('pointer-events-none absolute inset-0 size-full object-cover object-bottom', className)}
    />
  );
}

/**
 * Below-the-fold looping clip: no request until it is within 300px of the viewport (preload="none" until then), plays
 * only while visible and not paused. Under reduced motion it stays on the gradient until the visitor presses play.
 */
export function LazyVideo({ src, className }: { src: string; className?: string }) {
  const { paused } = usePlayback();
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) setNear(true);
        setVisible(e.intersectionRatio > 0);
      },
      { rootMargin: '300px 0px', threshold: [0, 0.01] },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const active = near && !paused;
  // Once loaded, keep the source so pausing shows the current frame instead of blanking.
  const [loaded, setLoaded] = useState(false);
  if (active && !loaded) setLoaded(true);

  useEffect(() => {
    const v = ref.current;
    if (!v || !loaded) return;
    if (active && visible) play(v);
    else v.pause();
  }, [active, visible, loaded]);

  return (
    <video
      ref={ref}
      src={loaded ? src : undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
      onLoadedData={() => setReady(true)}
      className={cn('pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0', className)}
    />
  );
}

/** Pause/play for every video on the page (≥48px, visible label or accessible name). */
export function VideoToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const t = useT('legal');
  const { paused, toggle } = usePlayback();
  const label = paused ? t('book.video.play') : t('book.video.pause');
  const Icon = paused ? Play : Pause;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={showLabel ? undefined : label}
      className={cn(
        'liquid-glass mb-media z-20 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-black/45 text-white transition-colors hover:bg-black/60',
        showLabel && 'px-5 text-[0.9rem] font-medium',
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn('size-4', paused && 'ml-0.5 fill-current')} />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
