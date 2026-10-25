// The family side of the walkthrough: sample vault, one story, one book chapter, and the way to the public card.
import { ArrowLeft, BookOpen, Compass, ExternalLink, Mic } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, Button, ButtonLink } from '@/components/ui';
import { STATIC_TOPICS } from '@/features/knowledge/topics';
import { usePick, useT } from '@/i18n';
import { BOOK_STORY_IDS, DEMO_NARRATORS, publicItemOf, VAULT_SAMPLES, type Bi, type DemoStatus, type VaultSample } from './data';
import { EXPLORE_SAMPLE_ID, explorePath } from './helpers';
import { Pill, type PillTone } from './Pill';
import { Paragraphs, StepTitle, type StepProps } from './NarratorSteps';
import { statusOfScope } from './state';

const STATUS_TONE: Record<DemoStatus, PillTone> = {
  draft: 'warning',
  private: 'neutral',
  invited: 'mint',
  requested: 'outline',
  public: 'heritage',
};

interface CardView {
  id: string;
  kind: 'story' | 'experience';
  topic: string;
  status: DemoStatus;
  title: string;
  narrator: string;
  summary: string;
  body: string;
  publicId: string | null;
}

function useCardView() {
  const pick = usePick();
  return (s: VaultSample): CardView => {
    const item = publicItemOf(s);
    const text = (bi: Bi | undefined) => (bi ? pick(bi) : '');
    return {
      id: s.id,
      kind: s.kind,
      topic: s.topic,
      status: s.status,
      title: item ? pick(item.title) : text(s.title),
      narrator: pick(DEMO_NARRATORS[s.narrator].name),
      summary: item ? pick(item.summary) : text(s.summary),
      body: item ? pick(item.body) : text(s.body),
      publicId: item?.id ?? null,
    };
  };
}

function StatusBadge({ status }: { status: DemoStatus }) {
  const t = useT('demo');
  return (
    <Pill tone={STATUS_TONE[status]}>{t(`status.${status}`)}</Pill>
  );
}

function TopicLabel({ slug }: { slug: string }) {
  const pick = usePick();
  const topic = STATIC_TOPICS.find((x) => x.slug === slug);
  return topic ? <>{pick(topic.title)}</> : null;
}

function StoryCard({ card, onOpen }: { card: CardView; onOpen: () => void }) {
  const t = useT('demo');
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-paper p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={card.status} />
        <Badge tone="outline" size="sm">
          {t(`kind.${card.kind}`)}
        </Badge>
        <span className="text-[0.85rem] text-ink-soft">
          <TopicLabel slug={card.topic} />
        </span>
      </div>
      <h3 className="font-serif text-[1.2rem] font-semibold leading-snug text-ink">{card.title}</h3>
      <p className="text-[0.9rem] text-ink-soft">{card.narrator}</p>
      {card.summary && <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-ink">{card.summary}</p>}
      <Button variant="secondary" className="mt-auto self-start" onClick={onOpen} aria-label={t('vault.openFor', { title: card.title })}>
        {t('vault.open')}
      </Button>
    </li>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-cream p-5 ring-1 ring-line md:p-7">
      <h3 className="flex items-center gap-2 font-serif text-[1.3rem] font-semibold text-heritage-deep">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function VaultStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  const pick = usePick();
  const view = useCardView();
  const cards = VAULT_SAMPLES.map(view);
  const exploreSample = VAULT_SAMPLES.find((x) => x.id === EXPLORE_SAMPLE_ID)!;
  const explore = view(exploreSample);

  return (
    <div className="flex flex-col gap-8">
      <StepTitle headingRef={headingRef} title={t('vault.title')} lede={t('vault.lede')} />
      <p role="status" className="empty:hidden rounded-2xl bg-mint px-5 py-3 font-medium text-heritage-deep">
        {s.saved ? t('vault.saved') : ''}
      </p>

      <section aria-labelledby="demo-mine-h" className="flex flex-col gap-3">
        <h3 id="demo-mine-h" className="font-serif text-[1.35rem] font-semibold text-heritage-deep">
          {t('vault.mineTitle')}
        </h3>
        {s.saved ? (
          <ul className="grid gap-4 md:grid-cols-2">
            <StoryCard
              card={{
                id: 'mine',
                kind: s.saved.kind === 'experience' ? 'experience' : 'story',
                topic: s.saved.topic,
                status: statusOfScope(s.saved.scope),
                title: s.saved.title,
                narrator: s.saved.narratorName,
                summary: s.saved.body.split(/\n\s*\n/)[0] ?? '',
                body: s.saved.body,
                publicId: null,
              }}
              onOpen={() => dispatch({ type: 'openStory', id: 'mine' })}
            />
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper/70 p-5">
            <p className="text-ink-soft">{t('vault.noSaved')}</p>
            <Button onClick={() => dispatch({ type: 'goto', step: 'topic' })} leftIcon={<Mic className="size-5" aria-hidden="true" />}>
              {t('vault.startJourney')}
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="demo-samples-h" className="flex flex-col gap-3">
        <h3 id="demo-samples-h" className="font-serif text-[1.35rem] font-semibold text-heritage-deep">
          {t('vault.samplesTitle')}
        </h3>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <StoryCard key={c.id} card={c} onOpen={() => dispatch({ type: 'openStory', id: c.id })} />
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={t('vault.bookTitle')} icon={<BookOpen className="size-5" aria-hidden="true" />}>
          <p>{t('vault.bookBody')}</p>
          <Button className="self-start" onClick={() => dispatch({ type: 'openBook' })}>
            {t('vault.openBook')}
          </Button>
        </Panel>
        <Panel title={t('vault.exploreTitle')} icon={<Compass className="size-5" aria-hidden="true" />}>
          <p>{t('vault.exploreBody', { title: explore.title, name: pick(DEMO_NARRATORS[exploreSample.narrator].name) })}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink to={explorePath(exploreSample.topic)} leftIcon={<Compass className="size-5" aria-hidden="true" />}>
              {t('vault.explore')}
            </ButtonLink>
            {explore.publicId && (
              <ButtonLink to={`/tri-thuc/${explore.publicId}`} variant="secondary" rightIcon={<ExternalLink className="size-4" aria-hidden="true" />}>
                {t('vault.openPublic')}
              </ButtonLink>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function BackToVault({ dispatch, label }: { dispatch: StepProps['dispatch']; label: string }) {
  return (
    <Button variant="ghost" className="-ml-2 self-start" onClick={() => dispatch({ type: 'goto', step: 'vault' })} leftIcon={<ArrowLeft className="size-5" aria-hidden="true" />}>
      {label}
    </Button>
  );
}

export function StoryStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  const view = useCardView();
  let card: CardView | null = null;
  if (s.openId === 'mine' && s.saved) {
    card = {
      id: 'mine',
      kind: s.saved.kind === 'experience' ? 'experience' : 'story',
      topic: s.saved.topic,
      status: statusOfScope(s.saved.scope),
      title: s.saved.title,
      narrator: s.saved.narratorName,
      summary: '',
      body: s.saved.body,
      publicId: null,
    };
  } else {
    const sample = VAULT_SAMPLES.find((x) => x.id === s.openId);
    if (sample) card = view(sample);
  }
  if (!card) {
    return (
      <div className="flex flex-col gap-4">
        <BackToVault dispatch={dispatch} label={t('story.back')} />
      </div>
    );
  }
  return (
    <article className="flex flex-col gap-5">
      <BackToVault dispatch={dispatch} label={t('story.back')} />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={card.status} />
        <Badge tone="outline" size="sm">
          {t(`kind.${card.kind}`)}
        </Badge>
        <span className="text-[0.9rem] text-ink-soft">
          <TopicLabel slug={card.topic} />
        </span>
      </div>
      <StepTitle headingRef={headingRef} title={card.title} lede={t('story.by', { name: card.narrator })} />
      <p className="rounded-2xl bg-cream px-5 py-3 text-ink ring-1 ring-line">{t(`story.notes.${card.status}`)}</p>
      {card.summary && <p className="text-[1.1rem] italic leading-relaxed text-ink-soft">{card.summary}</p>}
      <div className="flex max-w-3xl flex-col gap-4 font-serif text-[1.15rem] leading-relaxed text-ink">
        <Paragraphs text={card.body.replace(/\n(?!\n)/g, '\n\n')} />
      </div>
      {card.publicId && (
        <ButtonLink to={`/tri-thuc/${card.publicId}`} variant="secondary" className="self-start" rightIcon={<ExternalLink className="size-4" aria-hidden="true" />}>
          {t('story.openPublic')}
        </ButtonLink>
      )}
    </article>
  );
}

export function BookStep({ s, dispatch, headingRef }: StepProps) {
  const t = useT('demo');
  const view = useCardView();
  const chapter = BOOK_STORY_IDS.map((id) => VAULT_SAMPLES.find((x) => x.id === id)).filter((x): x is VaultSample => !!x).map(view);
  // The visitor's own story joins the chapter once it is saved (approved by confirming it).
  const mine = s.saved ? [{ id: 'mine', title: s.saved.title, narrator: s.saved.narratorName, body: s.saved.body }] : [];
  const entries = [...mine, ...chapter.map((c) => ({ id: c.id, title: c.title, narrator: c.narrator, body: c.body }))];

  return (
    <div className="flex flex-col gap-6">
      <BackToVault dispatch={dispatch} label={t('book.back')} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 rounded-[0.5rem] bg-paper px-5 py-10 shadow-[0_24px_50px_-36px_rgba(22,58,49,0.6)] ring-1 ring-line sm:px-10 md:px-14">
        <header className="flex flex-col gap-3 text-center">
          <p className="text-[0.8rem] font-bold uppercase tracking-[0.2em] text-terracotta">{t('book.kicker')}</p>
          <p className="font-serif text-[1.1rem] text-ink-soft">{t('book.title')}</p>
          <StepTitle headingRef={headingRef} title={t('book.chapter')} />
        </header>
        <p className="text-center text-[0.95rem] text-ink-soft">{t('book.note')}</p>
        {entries.map((e) => (
          <section key={e.id} className="flex flex-col gap-3">
            <h3 className="font-serif text-[1.35rem] font-semibold leading-snug text-heritage-deep">{e.title}</h3>
            <div className="flex flex-col gap-3 font-serif text-[1.1rem] leading-relaxed text-ink">
              <Paragraphs text={e.body} />
            </div>
            <p className="text-right font-serif italic text-ink-soft">{t('book.by', { name: e.narrator })}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
