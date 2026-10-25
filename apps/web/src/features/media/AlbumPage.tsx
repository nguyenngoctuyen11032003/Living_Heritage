// /gia-dinh/album: every story photo the user can read, grouped by storyteller or by story.
import { ImageOff, ImagePlus, Images } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ButtonLink, EmptyState, Field, Select, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { FamilyGate } from '@/features/families/FamilyGate';
import { useCurrentFamily } from '@/features/families/current';
import { ErrorNotice, NotConfiguredNotice } from '@/features/families/states';
import { VaultPageHeader } from '@/features/vault/components/VaultPageHeader';
import { useNarrators } from '@/features/narrators';
import { groupAlbum, type AlbumGroupMode } from './album';
import { ALBUM_LIMIT, useFamilyPhotos, type AlbumPhoto } from './hooks';
import { Lightbox } from './Lightbox';

/** Below this many photos the album still looks sparse, so it points to where photos are added. */
const FEW_PHOTOS = 4;

export default function AlbumPage() {
  return (
    <FamilyGate>
      <Album />
    </FamilyGate>
  );
}

function Album() {
  const t = useT('media');
  const tv = useT('vault');
  const fam = useCurrentFamily();
  const familyId = fam.current!.id;
  // Read-only members cannot add photos, so they are never invited to (B11).
  const canAdd = fam.canEdit;
  const { photos, state, refresh, onImageError } = useFamilyPhotos(familyId);
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <VaultPageHeader eyebrow={tv('header.eyebrow')} title={t('album.title')} lede={t('album.subtitle')} />

      {state === 'not_configured' ? (
        <NotConfiguredNotice />
      ) : state === 'error' ? (
        <ErrorNotice message={t('album.loadError')} onRetry={() => void refresh()} />
      ) : state === 'loading' ? (
        <div aria-busy="true" className="columns-2 gap-4 sm:columns-3 xl:columns-4">
          <span className="sr-only" role="status">
            {t('photos.loading')}
          </span>
          {[48, 32, 40, 56, 36, 44, 30, 52].map((h, i) => (
            <Skeleton key={i} className="mb-4 w-full break-inside-avoid" style={{ height: `${h * 4}px` }} />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState icon={<Images />} title={t('album.emptyTitle')} description={canAdd ? t('album.emptyBody') : t('album.emptyBodyViewer')}action={<ButtonLink to="/gia-dinh">{t('album.emptyCta')}</ButtonLink>} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-2xl bg-paper p-4 ring-1 ring-line/80 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6 md:p-5">
            <div role="radiogroup" aria-labelledby="album-group-label" className="flex flex-col gap-1.5">
              <span id="album-group-label" className="text-[0.9rem] font-semibold text-ink">
                {t('album.groupBy')}
              </span>
              {/* 48px tall like the Select next to it, so both labels and controls line up. */}
              <div className="inline-flex min-h-12 w-fit items-center rounded-full bg-cream p-0.5 ring-1 ring-line">
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
            </div>
            <Field label={t('album.filterNarrator')} className="sm:w-72">
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
            <p aria-live="polite" className="text-[0.9rem] text-ink-soft sm:ml-auto sm:self-end sm:pb-3">
              {t('album.shown', { n: flat.length })}
              {photos.length >= ALBUM_LIMIT && ` · ${t('album.limitNote', { n: ALBUM_LIMIT })}`}
            </p>
          </div>

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
                  <ul className="columns-2 gap-4 sm:columns-3 xl:columns-4">
                    {g.photos.map((p) => (
                      <AlbumTile key={p.id} photo={p} showStory={mode === 'narrator'} onOpen={() => setOpen(indexOf.get(p.id) ?? 0)} onImageError={onImageError} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {canAdd && photos.length < FEW_PHOTOS && <AddPhotosHint />}
        </div>
      )}

      <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} onImageError={onImageError} />
    </div>
  );
}

function AlbumTile({ photo: p, showStory, onOpen, onImageError }: { photo: AlbumPhoto; showStory: boolean; onOpen: () => void; onImageError: () => void }) {
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
              onError={onImageError}
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
              <Link to={`/cau-chuyen/${p.story_id}`} aria-label={t('album.openStory', { title })} className="inline-flex min-h-11 items-center text-[0.9rem] font-semibold text-heritage underline-offset-4 hover:underline">
                {title}
              </Link>
            )}
          </figcaption>
        )}
      </figure>
    </li>
  );
}


function AddPhotosHint() {
  const t = useT('media');
  return (
    <aside className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper/70 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-heritage">
          <ImagePlus className="size-5" />
        </span>
        <div>
          <p className="font-serif text-[1.1rem] font-semibold text-heritage-deep">{t('album.addHint')}</p>
          <p className="text-[0.92rem] text-ink-soft">{t('album.addHintBody')}</p>
        </div>
      </div>
      <ButtonLink to="/gia-dinh" variant="secondary" className="shrink-0">
        {t('album.emptyCta')}
      </ButtonLink>
    </aside>
  );
}
