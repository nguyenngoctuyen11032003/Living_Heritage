import { ArrowDown, ArrowUp, Camera, Check, ImageOff, ImagePlus, Images, Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useId, useRef, useState, type DragEvent } from 'react';
import { Button, Dialog, EmptyState, Field, Skeleton, Textarea, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { useStoryPhotos, type PhotoWithUrl } from './hooks';
import { Lightbox } from './Lightbox';
import {
  ACCEPTED_TYPES,
  MAX_CAPTION,
  PhotoError,
  deleteStoryPhoto,
  movePhoto,
  nextPosition,
  photoErrorCode,
  savePositions,
  updateCaption,
  uploadStoryPhoto,
  validatePhotoFile,
  type PhotoErrorCode,
} from './photos';

export interface StoryPhotosProps {
  storyId: string;
  /** Family of the story (storage path prefix). */
  familyId: string;
  /** Story writer AND family editor (storage upload needs is_family_editor). */
  canEdit: boolean;
  className?: string;
}

type Stage = 'waiting' | 'resizing' | 'uploading' | 'saving' | 'done' | 'error';
interface UploadItem {
  key: string;
  name: string;
  stage: Stage;
  error?: PhotoErrorCode;
}

/** "Ảnh kỷ niệm" of a story: grid with captions, lightbox, and (for editors) upload, caption edit, reorder, delete. */
export function StoryPhotos({ storyId, familyId, canEdit, className }: StoryPhotosProps) {
  const t = useT('media');
  const tc = useT('common');
  const { toast } = useToast();
  const headingId = useId();
  const { photos, state, refresh, setPhotos, onImageError } = useStoryPhotos(storyId);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [editing, setEditing] = useState<PhotoWithUrl | null>(null);
  const [removing, setRemoving] = useState<PhotoWithUrl | null>(null);
  const [busy, setBusy] = useState(false);
  // One reorder at a time: a second click before the first is saved would compute from a stale order.
  const [moving, setMoving] = useState(false);
  const busyUpload = uploads.some((u) => u.stage !== 'done' && u.stage !== 'error');

  const patch = (key: string, p: Partial<UploadItem>) => setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...p } : u)));

  const addFiles = useCallback(
    async (files: File[]) => {
      const sb = getSupabase();
      if (!sb || files.length === 0) return;
      const items = files.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name || `#${i + 1}`, file: f }));
      setUploads((list) => [...list.filter((u) => u.stage !== 'done'), ...items.map(({ key, name }) => ({ key, name, stage: 'waiting' as Stage }))]);
      let position = nextPosition(photos);
      let ok = 0;
      for (const it of items) {
        const invalid = validatePhotoFile(it.file);
        if (invalid) {
          patch(it.key, { stage: 'error', error: invalid });
          continue;
        }
        try {
          await uploadStoryPhoto(it.file, { familyId, storyId, position }, { sb, onStage: (s) => patch(it.key, { stage: s }) });
          position += 1;
          ok += 1;
          patch(it.key, { stage: 'done' });
        } catch (e) {
          patch(it.key, { stage: 'error', error: e instanceof PhotoError ? e.code : photoErrorCode(e) });
        }
      }
      if (ok > 0) {
        toast({ title: t('photos.added', { n: ok }), tone: 'success' });
        await refresh();
      }
    },
    [familyId, storyId, photos, refresh, t, toast],
  );

  async function move(p: PhotoWithUrl, delta: -1 | 1) {
    const sb = getSupabase();
    if (!sb || moving) return;
    const before = photos;
    const after = movePhoto(photos, p.id, delta);
    setMoving(true);
    setPhotos(after);
    try {
      await savePositions(sb, before, after);
      toast({ title: t('photos.reordered'), tone: 'success' });
    } catch (e) {
      // Some rows may already have their new position: reload the real order rather than guessing it.
      toast({ title: t(`errors.${e instanceof PhotoError ? e.code : 'save'}`), tone: 'error' });
      await refresh();
    } finally {
      setMoving(false);
    }
  }

  async function remove() {
    const sb = getSupabase();
    if (!sb || !removing) return;
    setBusy(true);
    try {
      await deleteStoryPhoto(sb, removing);
      toast({ title: t('photos.removed'), tone: 'success' });
      setRemoving(null);
      setOpen(null);
      await refresh();
    } catch (e) {
      toast({ title: t(`errors.${e instanceof PhotoError ? e.code : 'save'}`), tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-serif text-[1.4rem] font-semibold text-heritage-deep">
          {t('photos.title')}
          {photos.length > 0 && <span className="ml-2 align-middle text-[0.9rem] font-normal text-ink-soft">({t('photos.count', { n: photos.length })})</span>}
        </h2>
        <p className="text-[0.95rem] leading-relaxed text-ink-soft">{t('photos.subtitle')}</p>
      </div>

      {state === 'not_configured' ? (
        <p className="text-ink-soft">{t('errors.not_configured')}</p>
      ) : state === 'loading' ? (
        <div aria-busy="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <span className="sr-only" role="status">
            {t('photos.loading')}
          </span>
          <Skeleton className="aspect-[4/3]" />
          <Skeleton className="aspect-[4/3]" />
          <Skeleton className="hidden aspect-[4/3] sm:block" />
        </div>
      ) : state === 'error' ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-terracotta/5 p-4 ring-1 ring-terracotta/30 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('photos.loadError')}</p>
          <Button variant="secondary" onClick={() => void refresh()}>
            {tc('actions.retry')}
          </Button>
        </div>
      ) : photos.length === 0 && !canEdit ? (
        <EmptyState icon={<Images />} title={t('photos.emptyTitle')} description={t('photos.emptyViewer')} className="py-8" />
      ) : (
        photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p, i) => (
              <li key={p.id} className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={t('photos.open', { n: i + 1 })}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-mint ring-1 ring-line/80 focus-visible:outline-offset-4"
                >
                  {p.url ? (
                    <img
                      src={p.url}
                      alt={p.caption?.trim() || t('photos.altFallback')}
                      loading="lazy"
                      onError={onImageError}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-[0.8rem] text-ink-soft">
                      <ImageOff className="size-5" aria-hidden="true" />
                      {t('photos.noPreview')}
                    </span>
                  )}
                </button>
                {p.caption?.trim() && <p className="line-clamp-3 font-serif text-[0.95rem] italic leading-snug text-ink-soft">{p.caption}</p>}
                {canEdit && (
                  <div className="flex flex-wrap gap-0.5 -ml-1.5">
                    <Button variant="ghost" iconOnly aria-label={t('photos.captionFor', { n: i + 1 })} title={t('photos.editCaption')} onClick={() => setEditing(p)} className="size-11 min-h-11">
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" iconOnly aria-label={t('photos.moveEarlier', { n: i + 1 })} disabled={i === 0 || moving} onClick={() => void move(p, -1)} className="size-11 min-h-11">
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" iconOnly aria-label={t('photos.moveLater', { n: i + 1 })} disabled={i === photos.length - 1 || moving} onClick={() => void move(p, 1)} className="size-11 min-h-11">
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" iconOnly aria-label={t('photos.removeFor', { n: i + 1 })} onClick={() => setRemoving(p)} className="size-11 min-h-11 text-terracotta hover:bg-terracotta/10">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {canEdit && state === 'ready' && (
        <>
          <DropZone disabled={busyUpload} onFiles={(f) => void addFiles(f)} emptyHint={photos.length === 0} />
          <UploadList items={uploads} onDismiss={(key) => setUploads((l) => l.filter((u) => u.key !== key))} />
        </>
      )}

      <Lightbox items={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} onImageError={onImageError} />
      {editing && (
        <CaptionDialog
          photo={editing}
          n={photos.findIndex((p) => p.id === editing.id) + 1}
          onClose={() => setEditing(null)}
          onSaved={(caption) => {
            setPhotos(photos.map((p) => (p.id === editing.id ? { ...p, caption } : p)));
            setEditing(null);
            toast({ title: t('photos.captionSaved'), tone: 'success' });
          }}
        />
      )}
      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        size="sm"
        title={t('photos.removeTitle')}
        description={t('photos.removeBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {t('photos.keep')}
            </Button>
            <Button variant="terracotta" loading={busy} onClick={() => void remove()} leftIcon={<Trash2 className="size-4" aria-hidden="true" />}>
              {t('photos.remove')}
            </Button>
          </>
        }
      />
    </section>
  );
}

function DropZone({ onFiles, disabled, emptyHint }: { onFiles: (files: File[]) => void; disabled: boolean; emptyHint: boolean }) {
  const t = useT('media');
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const rulesId = useId();

  function take(list: FileList | null, input?: HTMLInputElement | null) {
    const files = list ? Array.from(list) : [];
    if (input) input.value = '';
    if (files.length) onFiles(files);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    if (!disabled) take(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors print:hidden',
        over ? 'border-heritage bg-mint/60' : 'border-line bg-paper/70',
      )}
    >
      {emptyHint && (
        <div className="flex flex-col items-center gap-1">
          <p className="font-serif text-[1.15rem] font-semibold text-heritage-deep">{t('photos.emptyTitle')}</p>
          <p className="max-w-md text-[0.95rem] text-ink-soft">{t('photos.emptyEditor')}</p>
        </div>
      )}
      <p className="hidden text-ink-soft sm:block">{over ? t('photos.dropActive') : t('photos.dropHere')}</p>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button onClick={() => pickRef.current?.click()} disabled={disabled} aria-describedby={rulesId} leftIcon={<ImagePlus className="size-5" aria-hidden="true" />}>
          {t('photos.pick')}
        </Button>
        <Button variant="secondary" onClick={() => camRef.current?.click()} disabled={disabled} aria-describedby={rulesId} leftIcon={<Camera className="size-5" aria-hidden="true" />}>
          {t('photos.camera')}
        </Button>
      </div>
      <p id={rulesId} className="text-[0.85rem] text-ink-soft">
        {t('photos.rules')}
      </p>
      <input ref={pickRef} type="file" accept={ACCEPTED_TYPES.join(',')} multiple hidden tabIndex={-1} aria-hidden="true" onChange={(e) => take(e.target.files, e.target)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} aria-hidden="true" onChange={(e) => take(e.target.files, e.target)} />
    </div>
  );
}

function UploadList({ items, onDismiss }: { items: UploadItem[]; onDismiss: (key: string) => void }) {
  const t = useT('media');
  return (
    <div aria-live="polite" className="print:hidden">
      {items.length > 0 && (
        <ul aria-label={t('photos.uploadsLabel')} className="flex flex-col gap-2">
          {items.map((u) => (
            <li
              key={u.key}
              className={cn('flex items-center gap-3 rounded-2xl px-4 py-2 text-[0.92rem] ring-1', u.stage === 'error' ? 'bg-terracotta/5 ring-terracotta/30' : 'bg-paper ring-line')}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{u.name}</span>
                <span className={u.stage === 'error' ? 'text-terracotta' : 'text-ink-soft'}>
                  {t(`photos.stage.${u.stage}`)}
                  {u.error && ` · ${t(`errors.${u.error}`)}`}
                </span>
              </span>
              {u.stage === 'done' ? (
                <Check className="size-5 shrink-0 text-heritage" aria-hidden="true" />
              ) : u.stage === 'error' ? (
                <Button variant="ghost" iconOnly aria-label={t('photos.dismiss', { name: u.name })} onClick={() => onDismiss(u.key)}>
                  <X className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-heritage border-t-transparent motion-reduce:animate-none" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CaptionDialog({ photo, n, onClose, onSaved }: { photo: PhotoWithUrl; n: number; onClose: () => void; onSaved: (caption: string | null) => void }) {
  const t = useT('media');
  const tc = useT('common');
  const [value, setValue] = useState(photo.caption ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PhotoErrorCode | null>(null);

  async function save() {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    try {
      await updateCaption(sb, photo.id, value);
      onSaved(value.trim().slice(0, MAX_CAPTION) || null);
    } catch (e) {
      setError(e instanceof PhotoError ? e.code : 'save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('photos.captionFor', { n })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button loading={busy} onClick={() => void save()}>
            {tc('actions.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {photo.url && <img src={photo.url} alt="" className="max-h-48 w-full rounded-2xl object-cover" />}
        <Field label={t('photos.caption')} hint={t('photos.captionHint')} error={error ? t(`errors.${error}`) : undefined}>
          <Textarea rows={3} maxLength={MAX_CAPTION} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
