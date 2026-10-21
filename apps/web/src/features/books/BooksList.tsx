import { BookOpen, Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Dialog, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { LoadError } from '@/features/vault/components/States';
import { VaultPageHeader } from '@/features/vault/components/VaultPageHeader';
import { FamilyGate } from '@/features/vault/external';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { createBook, listBooks, type BookSummary } from './api';
import { CoverFields, type CoverValue } from './components/CoverFields';
import { COVER_THEMES, asCoverStyle } from './covers';

export function BooksList() {
  return (
    <FamilyGate>
      <BooksListInner />
    </FamilyGate>
  );
}

function BooksListInner() {
  const t = useT('books');
  const tv = useT('vault');
  const { locale } = useLocale();
  const { current, canEdit } = useCurrentFamily();
  const familyId = current!.id;
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const creating = params.get('tao') === '1' && canEdit;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    setError(false);
    listBooks(sb, familyId)
      .then((rows) => alive && setBooks(rows))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [familyId, tick]);

  const openCreate = () => setParams({ tao: '1' }, { replace: true });
  const closeCreate = () => setParams({}, { replace: true });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <VaultPageHeader
        eyebrow={tv('header.eyebrow')}
        title={t('list.title')}
        lede={t('list.intro')}
        actions={
          canEdit &&
          books !== null &&
          books.length > 0 && (
            <Button size="lg" className="w-full md:w-auto" leftIcon={<Plus className="size-5" />} onClick={openCreate}>
              {t('list.create')}
            </Button>
          )
        }
      />

      {error ? (
        <LoadError onRetry={() => setTick((x) => x + 1)} message={t('state.loadError')} />
      ) : books === null ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[148/210]" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title={t('list.emptyTitle')}
          description={canEdit ? t('list.emptyBody') : t('list.viewerEmpty')}
          action={
            canEdit ? (
              <Button leftIcon={<Plus className="size-5" />} onClick={openCreate}>
                {t('list.create')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => {
            const theme = COVER_THEMES[asCoverStyle(b.cover_style)];
            return (
              <li key={b.id}>
                <Link to={`/sach/${b.id}`} aria-label={t('list.open', { title: b.title })} className="group block rounded-xl focus-visible:outline-offset-4">
                  <div
                    className="relative flex aspect-[148/210] flex-col items-center justify-center overflow-hidden rounded-[6px] px-4 text-center shadow-[0_18px_40px_-24px_rgba(18,27,24,0.6)] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                    style={{ background: theme.bg, color: theme.ink }}
                  >
                    <span aria-hidden="true" className={`absolute inset-0 ${theme.texture}`} />
                    <span aria-hidden="true" className="absolute inset-[6%] rounded-sm border" style={{ borderColor: theme.accent, opacity: 0.5 }} />
                    <span className="relative line-clamp-4 break-words font-serif text-[1.15rem] font-semibold leading-tight">{b.title}</span>
                    {b.subtitle && <span className="relative mt-2 line-clamp-2 font-serif text-[0.8rem] italic opacity-90">{b.subtitle}</span>}
                  </div>
                  <p className="mt-3 text-[0.9rem] font-semibold text-ink">{t('list.chapters', { n: b.chapters })}</p>
                  <p className="text-[0.82rem] text-ink-soft">{t('list.updated', { date: formatDate(b.updated_at, locale) })}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <CreateBookDialog open={creating} onClose={closeCreate} familyId={familyId} />
    </div>
  );
}

function CreateBookDialog({ open, onClose, familyId }: { open: boolean; onClose: () => void; familyId: string }) {
  const t = useT('books');
  const tc = useT('common');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [value, setValue] = useState<CoverValue>({ title: '', subtitle: '', cover_style: 'lua-xanh' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue({ title: '', subtitle: '', cover_style: 'lua-xanh' });
      setError(null);
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    if (!value.title.trim()) return setError(t('form.titleRequired'));
    setSaving(true);
    try {
      const id = await createBook(sb, { family_id: familyId, title: value.title, subtitle: value.subtitle || null, cover_style: value.cover_style });
      navigate(`/sach/${id}`);
    } catch {
      toast({ title: t('state.saveError'), tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('form.createTitle')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <CoverFields value={value} onChange={setValue} error={error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {t('form.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
