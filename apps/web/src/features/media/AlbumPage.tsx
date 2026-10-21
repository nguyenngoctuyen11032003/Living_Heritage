// /gia-dinh/album: every story photo the user can read, grouped by storyteller or by story.
import { ImageOff, Images } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ButtonLink, EmptyState, Field, Select, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { FamilyGate } from '@/features/families/FamilyGate';
import { useCurrentFamily } from '@/features/families/current';
import { ErrorNotice, NotConfiguredNotice, PageHeader } from '@/features/families/states';
import { useNarrators } from '@/features/narrators';
import { groupAlbum, type AlbumGroupMode } from './album';
import { ALBUM_LIMIT, useFamilyPhotos, type AlbumPhoto } from './hooks';
import { Lightbox } from './Lightbox';

export default function AlbumPage() {
  return (
    <FamilyGate>
      <Album />
    </FamilyGate>
  );
}

function Album() {
  const t = useT('media');
  const familyId = useCurrentFamily().current!.id;
  const { photos, state, refresh } = useFamilyPhotos(familyId);
  const { narrators } = useNarrators(familyId);
  const [mode, setMode] = useState<AlbumGroupMode>('narrator');
  const [narratorId, setNarratorId] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const groups = useMemo(
    () => groupAlbum(photos, mode, narrators, { unknownNarrator: t('album.unknownNarrator'), untitled: t('album.untitled') }, narratorId),
    [photos, mode, narrators, narratorId, t],
  );
  // Lightbox browses the photos in on-screen order.
  const flat = useMemo(() => groups.flatMap((g) => g.photos), [groups]);
  const indexOf = useMemo(() => new Map(flat.map((p, i) => [p.id, i])), [flat]);
  const items = useMemo(() => flat.map((p) => ({ ...p, storyId: p.story_id, storyTitle: p.story_title.trim() || t('album.untitled') })), [flat, t]);
  const withPhotos = useMemo(() => new Set(photos.map((p) => p.narrator_id)), [photos]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t('album.title')} description={t('album.subtitle')} />

      {state === 'not_configured' ? (
        <NotConfiguredNotice />
      ) : state === 'error' ? (
        <ErrorNotice message={t('album.loadError')} onRetry={() => void refresh()} />
      ) : state === 'loading' ? (
        <div aria-busy="true" className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          <span className="sr-only" role="status">
            {t('photos.loading')}
          </span>
          {[48, 32, 40, 56, 36, 44, 30, 52].map((h, i) => (
            <Skeleton key={i} className="mb-4 w-full break-inside-avoid" style={{ height: `${h * 4}px` }} />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState icon={<Images />} title={t('album.emptyTitle')} description={t('album.emptyBody')} action={<ButtonLink to="/gia-dinh">{t('album.emptyCta')}</ButtonLink>} />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[0.9rem] font-semibold text-ink">{t('album.groupBy')}</legend>
              <div className="inline-flex w-fit rounded-full bg-paper p-1 ring-1 ring-line">
                {(['narrator', 'story'] as const).map((m) => (
                  <label
                    key={m}
                    className={cn(
                      'inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-[0.92rem] font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-heritage',
                      mode === m ? 'bg-heritage text-cream' : 'text-ink-soft hover:text-heritage',
                    )}
                  >
                    <input type="radio" name="album-group" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                    {m === 'narrator' ? t('album.byNarrator') : t('album.byStory')}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="sm:w-72">
              <Field label={t('album.filterNarrator')}>
                <Select value={narratorId} onChange={(e) => setNarratorId(e.target.value)}>
                  <option value="">{t('album.allNarrators')}</option>
                  {narrators
                    .filter((n) => withPhotos.has(n.id) || n.id === narratorId)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.display_name}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          </div>

          <p aria-live="polite" className="mb-4 text-[0.9rem] text-ink-soft">
            {t('album.shown', { n: flat.length })}
            {photos.length >= ALBUM_LIMIT && ` · ${t('album.limitNote', { n: ALBUM_LIMIT })}`}
          </p>

          {flat.length === 0 ? (
            <EmptyState
              icon={<Images />}
              title={t('album.noMatch')}
              action={
                <button type="button" onClick={() => setNarratorId('')} className="min-h-12 font-semibold text-heritage underline underline-offset-4">
                  {t('album.clearFilter')}
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-10">
              {groups.map((g) => (
                <section key={`${mode}-${g.key}`} aria-labelledby={`album-${mode}-${g.key || 'unknown'}`}>
                  <h2 id={`album-${mode}-${g.key || 'unknown'}`} className="mb-4 flex flex-wrap items-baseline gap-x-3 font-serif text-[1.35rem] font-semibold text-heritage-deep">
                    {g.storyId ? (
                      <Link to={`/cau-chuyen/${g.storyId}`} className="underline-offset-4 hover:underline">
                        {g.label}
                      </Link>
                    ) : (
                      g.label
                    )}
                    <span className="font-sans text-[0.9rem] font-normal text-ink-soft">{t('album.count', { n: g.photos.length })}</span>
                  </h2>
                  <ul className="columns-2 gap-4 sm:columns-3 lg:columns-4">
                    {g.photos.map((p) => (
                      <AlbumTile key={p.id} photo={p} showStory={mode === 'narrator'} onOpen={() => setOpen(indexOf.get(p.id) ?? 0)} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}

function AlbumTile({ photo: p, showStory, onOpen }: { photo: AlbumPhoto; showStory: boolean; onOpen: () => void }) {
  const t = useT('media');
  const title = p.story_title.trim() || t('album.untitled');
  const alt = p.caption?.trim() || t('photos.altFallback');
  return (
    <li className="mb-4 break-inside-avoid">
      <figure className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line/80">
        <button type="button" onClick={onOpen} aria-label={alt} className="group block w-full focus-visible:outline-offset-[-4px]">
          {p.url ? (
            <img
              src={p.url}
              alt=""
              loading="lazy"
              className="block w-full transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <span className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-mint p-3 text-center text-[0.85rem] text-ink-soft">
              <ImageOff className="size-5" aria-hidden="true" />
              {t('photos.noPreview')}
            </span>
          )}
        </button>
        {(p.caption?.trim() || showStory) && (
          <figcaption className="flex flex-col gap-1 px-3 py-2.5">
            {p.caption?.trim() && <span className="line-clamp-3 font-serif text-[0.95rem] italic leading-snug text-ink">{p.caption}</span>}
            {showStory && (
              <Link to={`/cau-chuyen/${p.story_id}`} aria-label={t('album.openStory', { title })} className="inline-flex min-h-8 items-center text-[0.85rem] font-semibold text-heritage underline-offset-4 hover:underline">
                {title}
              </Link>
            )}
          </figcaption>
        )}
      </figure>
    </li>
  );
}
