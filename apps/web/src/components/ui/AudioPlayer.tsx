import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';

/** Imperative controls, e.g. to start a sample from elsewhere on the page or seek from a transcript line. */
export interface AudioPlayerHandle {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
}

export interface AudioPlayerProps {
  /** Audio URL (signed or public). When absent the player runs a silent simulated clock (illustrative samples). */
  src?: string;
  /** Length in seconds. Required for the simulated clock; for real audio it is shown until metadata loads. */
  duration?: number;
  title?: string;
  subtitle?: string;
  /** Called with the current position (seconds) while playing and after seeks — drive transcript highlighting with it. */
  onTime?: (seconds: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  /** Single-row layout for cards and lists. */
  compact?: boolean;
  tone?: 'light' | 'dark';
  className?: string;
  ref?: Ref<AudioPlayerHandle>;
}

const SKIP = 10;

/** Deterministic pseudo-waveform (decorative only). */
function bars(count: number, seed: number): number[] {
  let x = seed || 1;
  return Array.from({ length: count }, (_, i) => {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    const envelope = 0.55 + 0.45 * Math.sin((i / count) * Math.PI);
    return Math.max(0.16, Math.min(1, envelope * (0.35 + r * 0.75)));
  });
}

/**
 * Accessible audio player: play/pause (aria-pressed), ±10 s, seek slider (native range → arrow keys), mm:ss, waveform track.
 * Works with a real `<audio>` (src) or a silent simulated clock for illustrative samples (clearly labelled).
 */
export function AudioPlayer({ src, duration: durationProp = 0, title, subtitle, onTime, onPlayingChange, compact, tone = 'light', className, ref }: AudioPlayerProps) {
  const t = useT('landing');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const simulated = !src;
  const duration = loadedDuration ?? durationProp;
  const timeRef = useRef(0);
  const onTimeRef = useRef(onTime);
  const onPlayingRef = useRef(onPlayingChange);

  useEffect(() => {
    onTimeRef.current = onTime;
    onPlayingRef.current = onPlayingChange;
  }, [onTime, onPlayingChange]);

  const report = useCallback((sec: number) => {
    timeRef.current = sec;
    setTime(sec);
    onTimeRef.current?.(sec);
  }, []);

  const setPlayingState = useCallback((next: boolean) => {
    setPlaying(next);
    onPlayingRef.current?.(next);
  }, []);

  // Simulated clock.
  useEffect(() => {
    if (!simulated || !playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = Math.min(duration, timeRef.current + dt);
      report(next);
      if (next >= duration) {
        setPlayingState(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [simulated, playing, duration, report, setPlayingState]);

  const play = useCallback(() => {
    if (simulated) {
      if (timeRef.current >= duration) report(0);
      setPlayingState(true);
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    void el.play().catch(() => setFailed(true));
  }, [simulated, duration, report, setPlayingState]);

  const pause = useCallback(() => {
    if (simulated) setPlayingState(false);
    else audioRef.current?.pause();
  }, [simulated, setPlayingState]);

  const seek = useCallback(
    (sec: number) => {
      const clamped = Math.max(0, Math.min(duration || 0, sec));
      if (!simulated && audioRef.current) audioRef.current.currentTime = clamped;
      report(clamped);
    },
    [duration, simulated, report],
  );

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  useImperativeHandle(ref, () => ({ play, pause, toggle, seek }), [play, pause, toggle, seek]);

  const waveform = useMemo(() => bars(compact ? 36 : 56, Math.round(durationProp * 7) + (title?.length ?? 3)), [compact, durationProp, title]);
  const progress = duration > 0 ? time / duration : 0;
  const dark = tone === 'dark';
  const timeText = `${formatDuration(time)} / ${formatDuration(duration)}`;

  const skipBtn = cn(
    'inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-colors',
    dark ? 'text-night-ink/80 hover:bg-white/10 hover:text-night-ink' : 'text-ink-soft hover:bg-mint/70 hover:text-heritage',
  );

  const playButton = (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? t('ui.player.pause') : t('ui.player.play')}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-200 active:scale-95',
        compact ? 'size-12' : 'size-14',
        dark ? 'bg-night-ink text-night hover:bg-white' : 'bg-heritage text-cream hover:bg-heritage-deep',
      )}
    >
      {playing ? <Pause className="size-5 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />}
    </button>
  );

  const track = (
    <div className={cn('relative flex min-w-0 flex-1 items-center rounded-lg has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-terracotta', compact ? 'h-10' : 'h-12')}>
      <div aria-hidden="true" className="flex h-full w-full items-center gap-[2px]">
        {waveform.map((h, i) => (
          <span
            key={i}
            className={cn(
              'flex-1 rounded-full transition-colors duration-150',
              i / waveform.length < progress ? (dark ? 'bg-night-ink' : 'bg-heritage') : dark ? 'bg-white/20' : 'bg-heritage/18',
            )}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.round(duration))}
        step={1}
        value={Math.round(time)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label={t('ui.player.seek')}
        aria-valuetext={t('ui.player.timeOf', { current: formatDuration(time), total: formatDuration(duration) })}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );

  return (
    <div
      className={cn(
        'w-full',
        compact ? 'flex items-center gap-3' : 'rounded-[1.5rem] p-4 sm:p-5',
        !compact && (dark ? 'bg-night-card ring-1 ring-white/10' : 'bg-paper ring-1 ring-line'),
        dark ? 'text-night-ink' : 'text-ink',
        className,
      )}
    >
      {!simulated && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setLoadedDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => report(e.currentTarget.currentTime)}
          onPlay={() => setPlayingState(true)}
          onPause={() => setPlayingState(false)}
          onEnded={() => setPlayingState(false)}
          onError={() => setFailed(true)}
        />
      )}
      {compact ? (
        <>
          {playButton}
          {track}
          <span className={cn('shrink-0 text-[0.8rem] font-medium tabular-nums', dark ? 'text-night-ink/80' : 'text-ink-soft')}>{timeText}</span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            {playButton}
            <div className="min-w-0 flex-1">
              {title && <p className="truncate font-semibold leading-snug">{title}</p>}
              {subtitle && <p className={cn('truncate text-[0.85rem]', dark ? 'text-night-ink/75' : 'text-ink-soft')}>{subtitle}</p>}
            </div>
            <span className={cn('shrink-0 text-[0.85rem] font-medium tabular-nums', dark ? 'text-night-ink/80' : 'text-ink-soft')} aria-hidden="true">
              {timeText}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={() => seek(time - SKIP)} aria-label={t('ui.player.back10')} className={skipBtn}>
              <RotateCcw className="size-5" aria-hidden="true" />
            </button>
            {track}
            <button type="button" onClick={() => seek(time + SKIP)} aria-label={t('ui.player.fwd10')} className={skipBtn}>
              <RotateCw className="size-5" aria-hidden="true" />
            </button>
          </div>
          {(simulated || failed) && (
            <p className={cn('mt-2 text-[0.78rem]', failed ? 'text-terracotta' : dark ? 'text-night-ink/70' : 'text-ink-soft')}>
              {failed ? t('ui.player.error') : t('ui.player.simulated')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
