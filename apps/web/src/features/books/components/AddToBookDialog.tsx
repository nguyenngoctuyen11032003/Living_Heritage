import { BookPlus, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, ButtonLink, Dialog, Skeleton, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { addChapter, booksOfStory, listBooks, nextChapterPosition, type BookSummary } from '../api';

export interface AddToBookDialogProps {
  open: boolean;
  onClose: () => void;
  storyId: string;
  familyId: string;
}

/** Append an approved story as the last chapter of one of the family's books. */
export function AddToBookDialog({ open, onClose, storyId, familyId }: AddToBookDialogProps) {
  const t = useT('vault');
  const { toast } = useToast();
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [inBook, setInBook] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const sb = getSupabase();
    if (!sb) {
      setError(t('state.loadError'));
      return;
    }
    let alive = true;
    setBooks(null);
    setError(null);
    Promise.all([listBooks(sb, familyId), booksOfStory(sb, storyId)])
      .then(([b, ids]) => {
        if (!alive) return;
        setBooks(b);
        setInBook(new Set(ids));
      })
      .catch(() => alive && setError(t('state.loadError')));
    return () => {
      alive = false;
    };
  }, [open, familyId, storyId, t]);

  async function add(book: BookSummary) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(book.id);
    setError(null);
    try {
      await addChapter(sb, { book_id: book.id, family_id: familyId, story_id: storyId, position: await nextChapterPosition(sb, book.id) });
      setInBook((prev) => new Set([...prev, book.id]));
      toast({ title: t('addToBook.added', { name: book.title }), tone: 'success' });
    } catch {
      setError(t('state.saveError'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('addToBook.title')}
      description={t('addToBook.description')}
      footer={
        <>
          <ButtonLink to="/sach?tao=1" variant="secondary" leftIcon={<BookPlus className="size-5" aria-hidden="true" />}>
            {t('addToBook.create')}
          </ButtonLink>
          <Button onClick={onClose}>{t('addToCollection.done')}</Button>
        </>
      }
    >
      {books === null && !error ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : books && books.length === 0 ? (
        <p className="text-ink-soft">{t('addToBook.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {books?.map((b) => (
            <li key={b.id} className="flex min-h-14 items-center gap-3 rounded-2xl bg-paper px-4 py-2 ring-1 ring-line">
              <span className="min-w-0 flex-1 truncate font-serif font-semibold leading-[1.4] text-heritage-deep">{b.title}</span>
              {inBook.has(b.id) ? (
                <span className="inline-flex items-center gap-1.5 text-[0.9rem] text-heritage">
                  <Check className="size-4" aria-hidden="true" />
                  {t('addToBook.already')}
                </span>
              ) : (
                <Button size="md" variant="secondary" loading={busy === b.id} disabled={busy !== null} onClick={() => void add(b)}>
                  {t('addToBook.add')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p role="status" aria-live="polite" className={error ? 'mt-3 text-terracotta' : 'sr-only'}>
        {error ?? ''}
      </p>
    </Dialog>
  );
}
