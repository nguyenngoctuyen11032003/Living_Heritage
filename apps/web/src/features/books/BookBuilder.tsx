import { AlertTriangle, BookOpen, Eye, Printer, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, ButtonLink, Dialog, Skeleton, useToast } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { fetchRecordings } from '@/features/vault/api';
import { fetchFamilyStories } from '@/features/vault/collectionsApi';
import { OrderedList } from '@/features/vault/components/OrderedList';
import { LoadError, Unavailable } from '@/features/vault/components/States';
import { StoryPicker } from '@/features/vault/components/StoryPicker';
import { VaultPageHeader } from '@/features/vault/components/VaultPageHeader';
import { FamilyGate } from '@/features/vault/external';
import { usePageTitle } from '@/lib/usePageTitle';
import type { VaultStory } from '@/features/vault/types';
import { useVaultLookups } from '@/features/vault/useLookups';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { addChapter, deleteBook, removeChapter, saveChapterPositions, updateBook, type BookRow } from './api';
import { BookPreview } from './components/BookPreview';
import { CoverFields, type CoverValue } from './components/CoverFields';
import { asCoverStyle } from './covers';
import { moveItem, nextPosition, positionUpdates, renumber } from './reorder';
import { useBook, useBookPages, type ChapterEntry } from './useBook';

export function BookBuilder({ bookId }: { bookId: string }) {
  return (
    <FamilyGate showSwitcher={false}>
      <BookBuilderInner bookId={bookId} />
    </FamilyGate>
  );
}

function BookBuilderInner({ bookId }: { bookId: string }) {
  const t = useT('books');
  const { state, reload } = useBook(bookId);
  usePageTitle(state.kind === 'loading' ? null : state.kind === 'ready' ? null : t('list.title'));
  if (state.kind === 'unavailable')
    return <Unavailable title={t('builder.notFoundTitle')} body={t('builder.notFoundBody')} backTo="/sach" backLabel={t('builder.back')} />;
  if (state.kind === 'error') return <LoadError onRetry={reload} message={t('state.loadError')} />;
  if (state.kind === 'loading')
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-5" aria-busy="true">
        <p className="sr-only" role="status">
          {t('state.loading')}
        </p>
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  return <Builder key={state.book.id} book={state.book} initialChapters={state.chapters} />;
}

function Builder({ book: initialBook, initialChapters }: { book: BookRow; initialChapters: ChapterEntry[] }) {
  const t = useT('books');
  const tv = useT('vault');
  const tc = useT('common');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { families } = useCurrentFamily();
  const role = families.find((f) => f.id === initialBook.family_id)?.role;
  const canEdit = role === 'owner' || role === 'manager' || role === 'editor';
  const lookups = useVaultLookups(initialBook.family_id);
  const narratorName = useCallback((id: string) => lookups.narratorById.get(id)?.display_name, [lookups.narratorById]);

  const [book, setBook] = useState(initialBook);
  const [chapters, setChapters] = useState<ChapterEntry[]>(initialChapters);
  const [approved, setApproved] = useState<VaultStory[] | null>(null);
  const [approvedError, setApprovedError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [announce, setAnnounce] = useState('');
  const { inputs, pages } = useBookPages(chapters, narratorName);
  usePageTitle(book.title);

  const loadApproved = useCallback(() => {
    const sb = getSupabase();
    if (!sb || !canEdit) return;
    setApprovedError(false);
    fetchFamilyStories(sb, initialBook.family_id, { approvedOnly: true })
      .then(setApproved)
      .catch(() => setApprovedError(true));
  }, [canEdit, initialBook.family_id]);
  useEffect(loadApproved, [loadApproved]);

  async function add(story: VaultStory) {
    const sb = getSupabase();
    if (!sb) return;
    setBusyId(story.id);
    try {
      const position = nextPosition(chapters);
      await addChapter(sb, { book_id: book.id, family_id: book.family_id, story_id: story.id, position });
      const rec = story.recording_id ? (await fetchRecordings(sb, [story.recording_id]).catch(() => []))[0] : undefined;
      const durationS = rec?.duration_s != null ? Number(rec.duration_s) : null;
      setChapters((prev) => [...prev, { story_id: story.id, position, story, durationS }]);
      const msg = t('builder.chapters.added', { title: story.title.trim() || tv('card.untitled') });
      setAnnounce(msg);
      toast({ title: msg, tone: 'success', duration: 2500 });
    } catch {
      toast({ title: t('state.saveError'), tone: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function move(from: number, to: number) {
    const sb = getSupabase();
    if (!sb) return;
    const previous = chapters;
    const next = moveItem(chapters, from, to);
    setChapters(renumber(next));
    setSaving(true);
    try {
      await saveChapterPositions(sb, book.id, positionUpdates(next));
      setAnnounce(t('builder.chapters.saved'));
    } catch {
      setChapters(previous);
      toast({ title: t('state.saveError'), tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: ChapterEntry) {
    const sb = getSupabase();
    if (!sb) return;
    const previous = chapters;
    setChapters(chapters.filter((c) => c.story_id !== row.story_id));
    try {
      await removeChapter(sb, book.id, row.story_id);
    } catch {
      setChapters(previous);
      toast({ title: t('state.saveError'), tone: 'error' });
    }
  }

  async function doDelete() {
    const sb = getSupabase();
    if (!sb) return;
    setSaving(true);
    try {
      await deleteBook(sb, book.id);
      toast({ title: t('builder.deleted'), tone: 'success' });
      navigate('/sach');
    } catch {
      toast({ title: t('state.saveError'), tone: 'error' });
      setSaving(false);
    }
  }

  const untitled = tv('card.untitled');
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <VaultPageHeader
        back={{ to: '/sach', label: t('builder.back') }}
        eyebrow={t('list.title')}
        title={book.title}
        lede={book.subtitle ? <span className="font-serif text-[1.1rem] italic">{book.subtitle}</span> : undefined}
        meta={chapters.length === 1 ? t('builder.chapters.countOne') : t('builder.chapters.count', { n: chapters.length })}
        actions={
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
            <Button leftIcon={<Eye className="size-5" aria-hidden="true" />} onClick={() => setPreview(true)}>
              {t('builder.preview')}
            </Button>
            <ButtonLink to={`/sach/${book.id}/in`} variant="secondary" leftIcon={<Printer className="size-5" aria-hidden="true" />}>
              {t('builder.print')}
            </ButtonLink>
          </div>
        }
      />
      {!canEdit && <p className="rounded-2xl bg-mint/50 px-4 py-3 text-ink">{t('builder.readOnly')}</p>}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {canEdit && (
          <section aria-labelledby="book-picker" className="flex min-w-0 flex-col gap-3 rounded-[1.75rem] bg-paper p-5 ring-1 ring-line/80 md:p-6">
            <h2 id="book-picker" className="font-serif text-[1.3rem] font-semibold leading-[1.25] text-heritage-deep">
              {t('builder.picker.title')}
            </h2>
            <p className="text-[0.9rem] text-ink-soft">{t('builder.picker.hint')}</p>
            {approvedError ? (
              <LoadError onRetry={loadApproved} message={t('state.loadError')} />
            ) : approved === null ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-12" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : (
              <StoryPicker
                stories={approved}
                selected={new Set(chapters.map((c) => c.story_id))}
                onAdd={(s) => void add(s)}
                busyId={busyId}
                narratorName={narratorName}
                labels={{
                  search: t('builder.picker.searchLabel'),
                  add: t('builder.picker.add'),
                  addLabel: (title) => t('builder.picker.addLabel', { title }),
                  added: t('builder.picker.inBook'),
                  none: t('builder.picker.none'),
                  noMatch: t('builder.picker.noMatch'),
                  untitled,
                }}
              />
            )}
          </section>
        )}

        <div className={canEdit ? 'flex min-w-0 flex-col gap-8' : 'flex min-w-0 flex-col gap-8 lg:col-span-2'}>
          <section aria-labelledby="book-chapters" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="book-chapters" className="font-serif text-[1.3rem] font-semibold leading-[1.25] text-heritage-deep">
                {t('builder.chapters.title')}
              </h2>
              {canEdit && chapters.length > 1 && <p className="text-[0.9rem] text-ink-soft">{t('builder.chapters.dragHint')}</p>}
            </div>
            {chapters.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-line bg-paper/70 px-5 py-10 text-center">
                <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint text-heritage">
                  <BookOpen className="size-6" />
                </span>
                <p className="max-w-[40ch] leading-relaxed text-ink-soft">{t('builder.chapters.empty')}</p>
              </div>
            ) : (
              <OrderedList
                items={chapters}
                getKey={(c) => c.story_id}
                getTitle={(c) => c.story.title.trim() || untitled}
                disabled={saving}
                onMove={canEdit ? (from, to) => void move(from, to) : undefined}
                onRemove={canEdit ? (c) => void remove(c) : undefined}
                labels={{
                  moveUp: (title) => t('builder.chapters.moveUp', { title }),
                  moveDown: (title) => t('builder.chapters.moveDown', { title }),
                  remove: (title) => t('builder.chapters.remove', { title }),
                }}
                render={(c, i) => (
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-terracotta">{t('builder.chapters.chapterN', { n: i + 1 })}</span>
                    <Link to={`/cau-chuyen/${c.story_id}`} className="break-words font-serif text-[1.1rem] font-semibold leading-[1.35] text-heritage-deep hover:underline">
                      {c.story.title.trim() || untitled}
                    </Link>
                    <span className="text-[0.9rem] text-ink-soft">{narratorName(c.story.narrator_id) ?? ''}</span>
                    {c.story.edit_status !== 'approved' && (
                      <span className="inline-flex items-start gap-1.5 text-[0.9rem] text-[#6b4a0c]">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {t('builder.chapters.notApproved')}
                      </span>
                    )}
                  </div>
                )}
              />
            )}
          </section>

          {canEdit && <CoverEditor book={book} onSaved={setBook} />}
        </div>
      </div>

      {canEdit && (
        <section aria-labelledby="book-danger" className="flex flex-col gap-3 rounded-[1.75rem] border border-terracotta/30 bg-terracotta/5 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div className="min-w-0">
            <h2 id="book-danger" className="font-serif text-[1.15rem] font-semibold text-terracotta">
              {t('builder.danger.title')}
            </h2>
            <p className="mt-1 max-w-xl text-[0.95rem] text-ink-soft">{t('builder.danger.body')}</p>
          </div>
          <Button variant="terracotta" className="shrink-0" leftIcon={<Trash2 className="size-5" />} onClick={() => setConfirmDelete(true)}>
            {t('builder.delete')}
          </Button>
        </section>
      )}

      <BookPreview open={preview} onClose={() => setPreview(false)} book={book} pages={pages} chapters={inputs} />
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('builder.deleteTitle')}
        description={t('builder.deleteBody', { title: book.title })}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              {tc('actions.cancel')}
            </Button>
            <Button variant="terracotta" loading={saving} onClick={doDelete}>
              {t('builder.delete')}
            </Button>
          </>
        }
      />
    </div>
  );
}

function CoverEditor({ book, onSaved }: { book: BookRow; onSaved: (b: BookRow) => void }) {
  const t = useT('books');
  const { toast } = useToast();
  const [value, setValue] = useState<CoverValue>({ title: book.title, subtitle: book.subtitle ?? '', cover_style: asCoverStyle(book.cover_style) });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    if (!value.title.trim()) return setError(t('form.titleRequired'));
    setError(null);
    setSaving(true);
    try {
      await updateBook(sb, book.id, { title: value.title, subtitle: value.subtitle || null, cover_style: value.cover_style });
      onSaved({ ...book, title: value.title.trim(), subtitle: value.subtitle.trim() || null, cover_style: value.cover_style });
      toast({ title: t('form.saved'), tone: 'success' });
    } catch {
      toast({ title: t('state.saveError'), tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="book-cover" className="rounded-[1.75rem] bg-paper p-5 ring-1 ring-line/80 md:p-6">
      <h2 id="book-cover" className="mb-4 font-serif text-[1.3rem] font-semibold leading-[1.25] text-heritage-deep">
        {t('builder.cover')}
      </h2>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <CoverFields value={value} onChange={setValue} error={error} />
        <div>
          <Button type="submit" variant="secondary" loading={saving}>
            {t('form.save')}
          </Button>
        </div>
      </form>
    </section>
  );
}
