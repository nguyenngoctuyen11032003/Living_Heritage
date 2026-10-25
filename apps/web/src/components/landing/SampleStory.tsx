import { Quote } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StoryScene } from '@/components/illustrations/scenes';
import { useReducedMotionSafe } from '@/design/motion';
import { Reveal } from '@/components/motion';
import { AudioPlayer, Badge, type AudioPlayerHandle } from '@/components/ui';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { PLAY_SAMPLE_EVENT } from './events';
import { SAMPLE_STORY } from './sample-data';
import { ArrowLink, Section, SectionHeading } from './shared';

/**
 * Block 3 — sample story: illustration, a 58 s simulated player with a transcript that highlights with time, and
 * "Xem câu chuyện" to the full illustrative story on its detail screen.
 */
export function SampleStory() {
  const t = useT('landing');
  const pick = usePick();
  const reduced = useReducedMotionSafe();
  const playerRef = useRef<AudioPlayerHandle>(null);
  const lines = SAMPLE_STORY.lines;
  // Only the highlighted line is state: the section re-renders when it changes, not on every clock tick.
  const [active, setActive] = useState(0);
  const onTime = useCallback((sec: number) => setActive(lines.reduce((acc, line, i) => (sec >= line.t ? i : acc), 0)), [lines]);

  useEffect(() => {
    const onPlay = () => {
      document.getElementById('chuyen-mau')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      playerRef.current?.play();
    };
    window.addEventListener(PLAY_SAMPLE_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_SAMPLE_EVENT, onPlay);
  }, [reduced]);

  return (
    <Section id="chuyen-mau" labelledBy="sample-title">
      <SectionHeading id="sample-title" eyebrow={t('sample.eyebrow')} title={t('sample.title')} lead={t('sample.lead')} />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <figure className="relative h-full min-h-[22rem] overflow-hidden rounded-[2rem] bg-mint">
            <StoryScene kind={SAMPLE_STORY.scene} className="absolute inset-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,27,24,0.78),rgba(18,27,24,0)_55%)]" />
            <div className="absolute left-5 top-5 flex flex-wrap gap-2">
              <Badge tone="mint" size="sm">
                {pick(SAMPLE_STORY.topic)}
              </Badge>
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 p-6 text-cream-fixed md:p-8">
              <Quote aria-hidden="true" className="size-7 text-mint-fixed/80" />
              <p className="mt-2 font-serif text-[1.55rem] font-semibold leading-snug md:text-[1.8rem]">{pick(SAMPLE_STORY.title)}</p>
              <p className="mt-1 text-[0.95rem] text-cream-fixed/85">{pick(SAMPLE_STORY.narrator)}</p>
            </figcaption>
          </figure>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col gap-5 lg:col-span-7">
          <AudioPlayer ref={playerRef} title={pick(SAMPLE_STORY.title)} subtitle={pick(SAMPLE_STORY.narrator)} duration={SAMPLE_STORY.duration} onTime={onTime} />
          <div className="rounded-[1.5rem] bg-paper p-3 ring-1 ring-line sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-ink">{t('sample.transcript')}</h3>
              <p className="text-[0.8125rem] text-ink-soft">{t('sample.follow')}</p>
            </div>
            <ol className="mt-4 flex flex-col gap-1">
              {lines.map((line, i) => (
                <li key={line.t}>
                  <button
                    type="button"
                    onClick={() => {
                      playerRef.current?.seek(line.t);
                      setActive(i);
                    }}
                    aria-current={i === active ? 'true' : undefined}
                    className={cn(
                      'group flex w-full items-start gap-3 rounded-2xl px-2 py-3 sm:gap-4 sm:px-3 text-left transition-colors duration-200',
                      i === active ? 'bg-mint/70' : 'hover:bg-cream',
                    )}
                  >
                    <span className={cn('mt-0.5 w-10 shrink-0 text-[0.8rem] font-semibold tabular-nums', i === active ? 'text-heritage' : 'text-ink-soft')}>{formatDuration(line.t)}</span>
                    <span className={cn('font-serif text-[1.06rem] leading-relaxed transition-colors', i === active ? 'text-heritage-deep' : i < active ? 'text-ink' : 'text-ink/70')}>
                      {pick(line.text)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <ArrowLink to={`/tri-thuc/${SAMPLE_STORY.itemId}`} className="mt-2">
              {t('sample.open')}
            </ArrowLink>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
