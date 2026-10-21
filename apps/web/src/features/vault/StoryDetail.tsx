import { BookPlus, FolderPlus, KeyRound, PenLine } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { AudioPlayer, Button, ButtonLink, Skeleton } from '@/components/ui';
import { AddToBookDialog } from '@/features/books/components/AddToBookDialog';
import { useCurrentFamily } from '@/features/families/current';
import { useLocale, usePick, useT } from '@/i18n';
import { formatDate, formatDuration } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { canWriteStory, fetchProfileName, fetchRecordings, fetchStory, fetchTopics, signedAudioUrl } from './api';
import { AddToCollectionDialog } from './components/AddToCollectionDialog';
import { LoadError, Unavailable } from './components/States';
import { FamilyGate, ShareDialog, StoryStatusBadge } from './external';
import { topicStyle } from '@/features/knowledge/topics';
import { NarratorAvatar } from './components/NarratorAvatar';
import { VaultPageHeader } from './components/VaultPageHeader';
import { readExperienceFields, type RecordingLite, type TopicLite, type VaultStory } from './types';
import { splitParagraphs } from '@/features/books/pages';
import { StoryPhotos } from '@/features/media';

export function StoryDetail({ storyId }: { storyId: string }) {
  return (
    <FamilyGate showSwitcher={false}>
      <StoryDetailInner storyId={storyId} />
    </FamilyGate>
  );
}

interface Loaded {
  story: VaultStory;
  narratorName: string | null;
  topic: TopicLite | null;
  recording: RecordingLite | null;
  approverName: string | null;
  canWrite: boolean;
}

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'unavailable' } | { kind: 'ready'; data: Loaded };

async function load(id: string): Promise<Loaded | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const story = await fetchStory(sb, id);
  if (!story) return null;
  const [narrator, topics, recordings, canWrite, approverName] = await Promise.all([
    sb.from('narrators').select('display_name, pen_name').eq('id', story.narrator_id).maybeSingle(),
    fetchTopics(sb).catch(() => [] as TopicLite[]),
    story.recording_id ? fetchRecordings(sb, [story.recording_id]).catch(() => [] as RecordingLite[]) : Promise.resolve([] as RecordingLite[]),
    canWriteStory(sb, story.id),
    story.approved_by ? fetchProfileName(sb, story.approved_by).catch(() => null) : Promise.resolve(null),
  ]);
  return {
    story,
    narratorName: narrator.data?.display_name ?? null,
    topic: topics.find((tp) => tp.id === story.topic_id) ?? null,
    recording: recordings[0] ?? null,
    approverName,
    canWrite,
  };
}

function StoryDetailInner({ storyId }: { storyId: string }) {
  const t = useT('vault');
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ kind: 'loading' });
    load(storyId)
      .then((data) => alive && setState(data ? { kind: 'ready', data } : { kind: 'unavailable' }))
      .catch(() => alive && setState({ kind: 'error' }));
    return () => {
      alive = false;
    };
  }, [storyId, tick]);

  if (state.kind === 'unavailable') return <Unavailable backTo="/gia-dinh" />;
  if (state.kind === 'error')
    return (
      <div className="mx-auto max-w-3xl">
        <LoadError onRetry={() => setTick((x) => x + 1)} />
      </div>
    );
  if (state.kind === 'loading')
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6" aria-busy="true">
        <p className="sr-only" role="status">
          {t('state.loading')}
        </p>
        <Skeleton className="h-40 rounded-[2rem]" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  return <StoryView data={state.data} onChanged={() => setTick((x) => x + 1)} />;
}

function StoryView({ data, onChanged }: { data: Loaded; onChanged: () => void }) {
  const t = useT('vault');
  const pick = usePick();
  const { locale } = useLocale();
  const { families } = useCurrentFamily();
  const { story, topic, recording } = data;
  const role = families.find((f) => f.id === story.family_id)?.role;
  const isEditor = role === 'owner' || role === 'manager' || role === 'editor';
  const style = topicStyle(topic?.slug);
  const [dialog, setDialog] = useState<null | 'share' | 'collection' | 'book'>(null);
  const title = story.title.trim() || t('card.untitled');
  const narrator = data.narratorName ?? t('card.unknownNarrator');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <article className="flex flex-col gap-8">
        <VaultPageHeader
          back={{ to: '/gia-dinh', label: t('detail.back') }}
          band={{ background: style.band, ink: style.ink, scene: style.scene }}
          eyebrow={
            <>
              {topic ? pick({ vi: topic.title_vi, en: topic.title_en }) : t(`kind.${story.kind}`)}
              {topic && ` · ${t(`kind.${story.kind}`)}`}
            </>
          }
          title={title}
          lede={
            <span className="inline-flex items-center gap-3">
              <NarratorAvatar id={story.narrator_id} name={narrator} className="not-italic" />
              <span>{t('detail.narratorLine', { name: narrator })}</span>
            </span>
          }
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-8">
            <section aria-labelledby="story-audio" className="flex flex-col gap-3">
              <h2 id="story-audio" className="text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {t('detail.listen')}
              </h2>
              <StoryAudio recording={recording} title={title} narrator={narrator} />
            </section>

            <section aria-labelledby="story-reading" className="rounded-[2rem] bg-paper px-6 py-8 ring-1 ring-line/80 md:px-12 md:py-12">
              <h2 id="story-reading" className="sr-only">
                {t('detail.reading')}
              </h2>
              {story.kind === 'experience' ? <ExperienceReading story={story} /> : <StoryReading story={story} />}
            </section>

            {/* Uploading needs a story writer who is also a family editor (media bucket policy). */}
            <StoryPhotos storyId={story.id} familyId={story.family_id} canEdit={data.canWrite && isEditor} />
          </div>

          <aside className="flex flex-col gap-6">
            <section aria-labelledby="story-actions" className="flex flex-col gap-3 rounded-[1.75rem] bg-paper p-5 ring-1 ring-line/80">
              <h2 id="story-actions" className="text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {t('detail.actions.label')}
              </h2>
              <StoryStatusBadge showScope editStatus={story.edit_status} visibility={story.visibility} />
              {data.canWrite || isEditor ? (
                <div className="flex flex-col gap-2 pt-1">
                  {data.canWrite && (
                    <>
                      <ButtonLink to={`/ban-nhap/${story.id}`} fullWidth leftIcon={<PenLine className="size-5" />}>
                        {t('detail.actions.edit')}
                      </ButtonLink>
                      <Button variant="secondary" fullWidth leftIcon={<KeyRound className="size-5" />} onClick={() => setDialog('share')}>
                        {t('detail.actions.access')}
                      </Button>
                    </>
                  )}
                  {isEditor && (
                    <>
                      <Button variant="secondary" fullWidth leftIcon={<FolderPlus className="size-5" />} onClick={() => setDialog('collection')}>
                        {t('detail.actions.collection')}
                      </Button>
                      <Button
                        variant="secondary"
                        fullWidth
                        leftIcon={<BookPlus className="size-5" />}
                        disabled={story.edit_status !== 'approved'}
                        aria-describedby={story.edit_status !== 'approved' ? 'book-hint' : undefined}
                        onClick={() => setDialog('book')}
                      >
                        {t('detail.actions.book')}
                      </Button>
                      {story.edit_status !== 'approved' && (
                        <p id="book-hint" className="text-[0.85rem] text-ink-soft">
                          {t('detail.actions.bookNeedsApproval')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[0.9rem] text-ink-soft">{t('state.readOnly')}</p>
              )}
            </section>

            <section aria-labelledby="story-source" className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-line">
              <h2 id="story-source" className="font-serif text-[1.15rem] font-semibold text-heritage-deep">
                {t('detail.source.title')}
              </h2>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.95rem]">
                <SourceRow label={t('detail.source.recorded')} value={recording ? formatDate(recording.created_at, locale) : t('detail.source.unknown')} />
                <SourceRow
                  label={t('detail.source.duration')}
                  value={recording?.duration_s ? formatDuration(Number(recording.duration_s)) : t('detail.source.unknown')}
                />
                <SourceRow label={t('detail.source.version')} value={t('detail.source.versionValue', { n: story.current_version })} />
                {story.edit_status === 'approved' && story.approved_at ? (
                  <>
                    <SourceRow label={t('detail.source.approvedBy')} value={data.approverName ?? t('detail.source.member')} />
                    <SourceRow label={t('detail.source.approvedAt')} value={formatDate(story.approved_at, locale)} />
                  </>
                ) : (
                  <SourceRow label={t('detail.source.approvedBy')} value={t('detail.source.notApproved')} />
                )}
                <SourceRow label={t('detail.source.visibility')} value={t(`visibility.${story.visibility}`)} />
              </dl>
            </section>
          </aside>
        </div>
      </article>

      {data.canWrite && <ShareDialog storyId={story.id} open={dialog === 'share'} onClose={() => setDialog(null)} onChanged={onChanged} />}
      {isEditor && (
        <>
          <AddToCollectionDialog open={dialog === 'collection'} onClose={() => setDialog(null)} storyId={story.id} familyId={story.family_id} />
          <AddToBookDialog open={dialog === 'book'} onClose={() => setDialog(null)} storyId={story.id} familyId={story.family_id} />
        </>
      )}
    </div>
  );
}

function SourceRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{value}</dd>
    </>
  );
}

function StoryAudio({ recording, title, narrator }: { recording: RecordingLite | null; title: string; narrator: string }) {
  const t = useT('vault');
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const path = recording?.storage_path;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !path) return;
    let alive = true;
    setFailed(false);
    signedAudioUrl(sb, path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [path]);

  if (!recording) return <p className="rounded-2xl bg-paper px-5 py-4 text-ink-soft ring-1 ring-line">{t('detail.noAudio')}</p>;
  if (failed)
    return (
      <p role="alert" className="rounded-2xl bg-terracotta/5 px-5 py-4 text-ink ring-1 ring-terracotta/30">
        {t('detail.audioError')}
      </p>
    );
  if (!url) return <Skeleton className="h-20 rounded-3xl" />;
  return <AudioPlayer src={url} duration={Number(recording.duration_s) || 0} title={title} subtitle={narrator} />;
}

function StoryReading({ story }: { story: VaultStory }) {
  const t = useT('vault');
  const paragraphs = splitParagraphs(story.body);
  return (
    <div className="mx-auto max-w-[38rem] font-serif text-[1.15rem] leading-[1.85] text-ink">
      {story.summary && <p className="mb-8 border-l-4 border-terracotta/60 pl-5 italic text-ink-soft">{story.summary}</p>}
      {paragraphs.length === 0 ? (
        <p className="font-sans text-ink-soft">{t('detail.emptyBody')}</p>
      ) : (
        <div>
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-5 first:first-letter:float-left first:first-letter:mr-2 first:first-letter:text-[3.4rem] first:first-letter:leading-[0.9] first:first-letter:text-heritage">
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ExperienceReading({ story }: { story: VaultStory }) {
  const t = useT('vault');
  const f = readExperienceFields(story.fields);
  const missing = <p className="font-sans text-[0.95rem] italic text-ink-soft">{t('detail.experience.missing')}</p>;
  const text = (v: string | null) => (v ? <p>{v}</p> : missing);
  const list = (v: string[] | null, ordered = false) => {
    if (!v) return missing;
    const Tag = ordered ? 'ol' : 'ul';
    return (
      <Tag className={ordered ? 'list-decimal space-y-2 pl-6' : 'list-disc space-y-2 pl-6'}>
        {v.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </Tag>
    );
  };
  const sections: Array<[string, ReactNode]> = [
    [t('detail.experience.skill'), text(f.skill)],
    [t('detail.experience.context'), text(f.context)],
    [t('detail.experience.conditions'), list(f.conditions)],
    [t('detail.experience.steps'), list(f.steps, true)],
    [t('detail.experience.cautions'), list(f.cautions)],
    [t('detail.experience.limits'), text(f.limits)],
  ];
  return (
    <div className="mx-auto flex max-w-[38rem] flex-col gap-7 font-serif text-[1.1rem] leading-[1.8] text-ink">
      {story.summary && <p className="border-l-4 border-terracotta/60 pl-5 italic text-ink-soft">{story.summary}</p>}
      {sections.map(([label, node]) => (
        <section key={label}>
          <h3 className="mb-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-terracotta">{label}</h3>
          {node}
        </section>
      ))}
    </div>
  );
}
