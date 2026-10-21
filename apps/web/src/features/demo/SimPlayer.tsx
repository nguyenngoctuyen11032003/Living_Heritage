import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import type { DemoLine } from './data';
import { clock, lineAt } from './helpers';
import { Pill } from './Pill';
import { UncertainText } from './UncertainText';

const TICK_MS = 250;

/**
 * A clearly labelled SIMULATED player: no audio exists, a clock advances and the transcript line being "said" is
 * highlighted. Never autoplays; the slider and every line can seek; reaching the end calls `onEnded`.
 */
export function SimPlayer({ lines, duration, onEnded }: { lines: readonly DemoLine[]; duration: number; onEnded: () => void }) {
  const t = useT('demo');
  const pick = usePick();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const sliderId = useId();
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTime((x) => Math.min(duration, x + TICK_MS / 1000));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, duration]);

  useEffect(() => {
    if (playing && time >= duration) {
      setPlaying(false);
      endedRef.current();
    }
  }, [playing, time, duration]);

  const current = lineAt(lines, time);

  function toggle() {
    if (!playing && time >= duration) setTime(0);
    setPlaying((p) => !p);
  }

  function seek(seconds: number) {
    setTime(Math.max(0, Math.min(duration, seconds)));
  }

  return (
    <div className="flex flex-col gap-5 rounded-[1.5rem] bg-paper p-5 ring-1 ring-line md:p-7">
      <Pill tone="warning" className="text-[1rem]">
        {t('listen.simulated')}
      </Pill>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={toggle} aria-pressed={playing} leftIcon={playing ? <Pause className="size-6" aria-hidden="true" /> : <Play className="size-6" aria-hidden="true" />}>
          {playing ? t('listen.pause') : t('listen.play')}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            setPlaying(false);
            setTime(0);
          }}
          leftIcon={<RotateCcw className="size-5" aria-hidden="true" />}
        >
          {t('listen.restart')}
        </Button>
        <p className="font-serif text-[1.4rem] tabular-nums text-ink">{t('listen.clock', { time: clock(time), total: clock(duration) })}</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={sliderId} className="sr-only">
          {t('listen.seek')}
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={duration}
          step={1}
          value={Math.floor(time)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-valuetext={t('listen.clock', { time: clock(time), total: clock(duration) })}
          className="h-3 w-full cursor-pointer accent-heritage"
        />
      </div>
      <ol className="flex flex-col gap-2">
        {lines.map((line, i) => {
          const active = i === current;
          return (
            <li key={line.t}>
              <button
                type="button"
                onClick={() => seek(line.t)}
                aria-current={active ? 'true' : undefined}
                aria-label={`${t('listen.lineAt', { n: i + 1 })}: ${pick(line.text).replace('[?]', '…')}`}
                className={cn(
                  'flex w-full min-h-12 items-start gap-3 rounded-2xl px-4 py-3 text-left leading-relaxed transition-colors motion-reduce:transition-none',
                  active ? 'bg-mint text-heritage-deep ring-2 ring-heritage' : 'text-ink-soft hover:bg-mint/40',
                )}
              >
                <span className="shrink-0 pt-0.5 font-mono text-[0.9rem] tabular-nums" aria-hidden="true">
                  {clock(line.t)}
                </span>
                <span aria-hidden="true">
                  <UncertainText text={pick(line.text)} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
