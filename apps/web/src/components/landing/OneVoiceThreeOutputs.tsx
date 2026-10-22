import { TriangleAlert, BadgeCheck, BookOpenText, FileText, Lock, Sprout } from 'lucide-react';
import { useCallback, useState } from 'react';
import { StoryScene } from '@/components/illustrations/scenes';
import { Reveal } from '@/components/motion';
import { AudioPlayer, Badge, IllustrativeBadge, Tab, TabList, TabPanel, Tabs } from '@/components/ui';
import { usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { OUTPUT_SAMPLE } from './sample-data';
import { Section, SectionHeading } from './shared';

function highlightUncertain(text: string, label: string) {
  const parts = text.split('[?]');
  if (parts.length === 1) return text;
  return (
    <>
      {parts[0]}
      <mark className="rounded-md bg-[#fbecc8] px-1.5 py-0.5 font-sans text-[0.78em] font-semibold text-[#6b4a0c]">[?] {label}</mark>
      {parts[1]}
    </>
  );
}

/** Status + visibility chips shown on both output tabs (B6: each output shows its source, permission and an example). */
function OutputStatus() {
  const t = useT('landing');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="mint" icon={<BadgeCheck />}>
        {t('outputs.status.approved')}
      </Badge>
      <Badge tone="outline" icon={<Lock />}>
        {t('outputs.status.visibility')}
      </Badge>
    </div>
  );
}

/**
 * Block "Đầu ra" (B6 #6): one narration → tabs Câu chuyện gia đình / Kinh nghiệm thực tiễn, plus the original
 * transcript. Both output tabs show the source narration, approval and visibility.
 */
export function OneVoiceThreeOutputs() {
  const t = useT('landing');
  const pick = usePick();
  const s = OUTPUT_SAMPLE;
  // Highlighted transcript line (-1 before playback starts): re-render on line changes only, not on every clock tick.
  const [active, setActive] = useState(-1);
  const onTime = useCallback((sec: number) => setActive(sec > 0 ? s.transcript.reduce((acc, line, i) => (sec >= line.t ? i : acc), 0) : -1), [s.transcript]);

  const fields: Array<{ key: 'skill' | 'context' | 'conditions' | 'cautions' | 'limits'; value: string }> = [
    { key: 'skill', value: pick(s.card.skill) },
    { key: 'context', value: pick(s.card.context) },
    { key: 'conditions', value: pick(s.card.conditions) },
  ];
  const after: typeof fields = [
    { key: 'cautions', value: pick(s.card.cautions) },
    { key: 'limits', value: pick(s.card.limits) },
  ];

  return (
    <Section id="dau-ra" labelledBy="outputs-title" className="cv-section">
      <SectionHeading id="outputs-title" eyebrow={t('outputs.eyebrow')} title={t('outputs.title')} lead={t('outputs.lead')} />
      <div className="mt-12 grid grid-cols-1 gap-6 lg:mt-16 lg:grid-cols-12 lg:gap-8">
        {/* Source narration */}
        <Reveal className="lg:col-span-4">
          <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-heritage-deep text-night-ink">
            <div className="relative h-56 overflow-hidden bg-[#F5EDDA]">
              <StoryScene kind="garden" className="absolute inset-0" />
              <div className="absolute left-4 top-4">
                <IllustrativeBadge />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6">
              <div>
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-mint-fixed">{t('outputs.narration')}</p>
                <p className="mt-1 font-serif text-[1.2rem] font-semibold">{pick(s.narrator)}</p>
              </div>
              <AudioPlayer compact tone="dark" duration={s.duration} onTime={onTime} title={pick(s.story.title)} />
              <p className="text-[0.82rem] leading-relaxed text-night-ink/75">{t('ui.player.simulated')}</p>
            </div>
          </div>
        </Reveal>

        {/* Outputs */}
        <Reveal delay={0.1} className="lg:col-span-8">
          <Tabs defaultValue="story" className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabList label={t('outputs.tabsLabel')} className="flex-wrap rounded-[1.75rem]">
                <Tab value="story" icon={<BookOpenText />}>
                  {t('outputs.tabs.story')}
                </Tab>
                <Tab value="card" icon={<Sprout />}>
                  {t('outputs.tabs.card')}
                </Tab>
                <Tab value="transcript" icon={<FileText />}>
                  {t('outputs.tabs.transcript')}
                </Tab>
              </TabList>
              <Badge tone="outline" size="sm">
                {t('meta.simulatedAi')}
              </Badge>
            </div>

            <div className="mt-4 flex-1 rounded-[1.75rem] bg-paper p-3 ring-1 ring-line sm:p-6 md:p-8">
              <TabPanel value="transcript">
                <ol className="flex flex-col gap-1">
                  {s.transcript.map((line, i) => (
                    <li key={line.t} className={cn('flex gap-3 rounded-2xl px-2 py-2.5 sm:gap-4 sm:px-3 transition-colors duration-200', i === active && 'bg-mint/60')}>
                      <span className="mt-0.5 w-10 shrink-0 text-[0.8rem] font-semibold tabular-nums text-ink-soft">{formatDuration(line.t)}</span>
                      <span className="font-serif text-[1.05rem] leading-relaxed text-ink">{highlightUncertain(pick(line.text), t('outputs.uncertain'))}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-[0.85rem] text-ink-soft">
                  <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#a0700f]" />
                  {t('outputs.uncertainHint')}
                </p>
              </TabPanel>

              <TabPanel value="story">
                <article>
                  <OutputStatus />
                  <h3 className="mt-5 font-serif text-[1.6rem] font-semibold leading-snug text-heritage-deep md:text-[1.9rem]">{pick(s.story.title)}</h3>
                  <p className="mt-1 text-[0.9rem] text-ink-soft">{pick(s.narrator)}</p>
                  <div className="mt-5 space-y-4 font-serif text-[1.08rem] leading-[1.75] text-ink">
                    {s.story.paragraphs.map((p, i) => (
                      <p key={i} className={cn(i === 0 && 'first-letter:float-left first-letter:mr-2 first-letter:pt-1 first-letter:font-serif first-letter:text-[3.4rem] first-letter:font-semibold first-letter:leading-[0.9] first-letter:text-heritage')}>
                        {pick(p)}
                      </p>
                    ))}
                  </div>
                  <p className="mt-6 text-[0.85rem] text-ink-soft">{t('outputs.storyNote')}</p>
                  <div className="mt-5 rounded-2xl bg-cream p-4 ring-1 ring-line">
                    <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-heritage">{t('outputs.fields.source')}</p>
                    <p className="mt-1 leading-relaxed text-ink">{pick(s.card.source)}</p>
                  </div>
                </article>
              </TabPanel>

              <TabPanel value="card">
                <OutputStatus />
                <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.key} className={cn(f.key === 'skill' && 'md:col-span-2')}>
                      <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-terracotta">{t(`outputs.fields.${f.key}`)}</dt>
                      <dd className={cn('mt-1.5 leading-relaxed text-ink', f.key === 'skill' && 'font-serif text-[1.35rem] font-semibold leading-snug text-heritage-deep')}>{f.value}</dd>
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-terracotta">{t('outputs.fields.steps')}</dt>
                    <dd className="mt-2">
                      <ol className="flex flex-col gap-2">
                        {s.card.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 leading-relaxed">
                            <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-heritage text-[0.8rem] font-bold text-cream-fixed">
                              {i + 1}
                            </span>
                            <span className="pt-0.5">{pick(step)}</span>
                          </li>
                        ))}
                      </ol>
                    </dd>
                  </div>
                  {after.map((f) => (
                    <div key={f.key}>
                      <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-terracotta">{t(`outputs.fields.${f.key}`)}</dt>
                      <dd className="mt-1.5 leading-relaxed text-ink">{f.value}</dd>
                    </div>
                  ))}
                  <div className="rounded-2xl bg-cream p-4 ring-1 ring-line md:col-span-2">
                    <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-heritage">{t('outputs.fields.source')}</dt>
                    <dd className="mt-1 leading-relaxed text-ink">{pick(s.card.source)}</dd>
                  </div>
                </dl>
              </TabPanel>
            </div>
          </Tabs>
        </Reveal>
      </div>
    </Section>
  );
}
