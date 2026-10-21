import { Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Dialog, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { LoadError } from '@/features/vault/components/States';
import { FamilyGate } from '@/features/vault/external';
import { usePageTitle } from '@/lib/usePageTitle';
import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { createBook, listBooks, type BookSummary } from './api';
import { CoverFields, type CoverValue } from './components/CoverFields';
import { COVER_STYLES, COVER_THEMES, asCoverStyle, type CoverStyle } from './covers';

export function BooksList() {
  const t = useT('books');
  usePageTitle(t('list.title'));
  return (
    <FamilyGate>
      <BooksListInner />
    </FamilyGate>
  );
}

function BooksListInner() {
  const t = useT('books');
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.875rem] font-semibold uppercase tracking-[0.14em] text-terracotta">{t('preview.familyBook')}</p>
          <h1 className="mt-2 font-serif text-[clamp(2rem,1.45rem+2.2vw,2.75rem)] font-semibold leading-[1.2] text-heritage-deep">{t('list.title')}</h1>
          <p className="mt-2 max-w-[60ch] leading-relaxed text-ink-soft">{t('list.intro')}</p>
        </div>
        {canEdit && (
          <Button size="lg" leftIcon={<Plus className="size-5" aria-hidden="true" />} onClick={openCreate}>
            {t('list.create')}
          </Button>
        )}
      </header>

      {error ? (
        <LoadError onRetry={() => setTick((x) => x + 1)} message={t('state.loadError')} />
      ) : books === null ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[148/210] rounded-[6px]" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          className="py-14"
          icon={<CoverFan />}
          title={t('list.emptyTitle')}
          description={canEdit ? t('list.emptyBody') : t('list.viewerEmpty')}
          action={
            canEdit ? (
              <Button leftIcon={<Plus className="size-5" aria-hidden="true" />} onClick={openCreate}>
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
                    className="relative flex aspect-[148/210] flex-col items-center justify-center overflow-hidden rounded-[3px_8px_8px_3px] px-[12%] text-center shadow-[0_18px_40px_-24px_rgba(18,27,24,0.6)] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_26px_50px_-24px_rgba(18,27,24,0.65)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                    style={{ background: theme.bg, color: theme.ink }}
                  >
                    <span aria-hidden="true" className={`absolute inset-0 ${theme.texture}`} />
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/25 via-black/10 to-transparent" />
                    <span aria-hidden="true" className="absolute inset-[7%] rounded-sm border" style={{ borderColor: theme.accent, opacity: 0.5 }} />
                    <span className="relative line-clamp-4 break-words font-serif text-[clamp(1rem,0.9rem+0.5vw,1.2rem)] font-semibold leading-[1.25]">{b.title}</span>
                    <span aria-hidden="true" className="relative my-3 block h-px w-8" style={{ background: theme.accent }} />
                    {b.subtitle && <span className="relative line-clamp-2 font-serif text-[0.875rem] italic leading-snug opacity-90">{b.subtitle}</span>}
                  </div>
                  <p className="mt-3 text-[0.95rem] font-semibold text-ink">{b.chapters === 1 ? t('list.chaptersOne') : t('list.chapters', { n: b.chapters })}</p>
                  <p className="text-[0.875rem] text-ink-soft">{t('list.updated', { date: formatDate(b.updated_at, locale) })}</p>
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

/** Three tilted covers (one per style): the empty-shelf illustration. */
function CoverFan() {
  const tilt: Record<CoverStyle, string> = { 'lua-xanh': '-rotate-12 translate-x-1.5', 'giay-do': 'z-10 -translate-y-0.5', 'dat-nung': 'rotate-12 -translate-x-1.5' };
  return (
    <span className="flex items-end justify-center">
      {COVER_STYLES.map((style) => {
        const theme = COVER_THEMES[style];
        return (
          <span
            key={style}
            className={`relative block h-8 w-[22px] overflow-hidden rounded-[2px_4px_4px_2px] shadow-[0_6px_14px_-8px_rgba(18,27,24,0.7)] ${tilt[style]}`}
            style={{ background: theme.bg }}
          >
            <span className="absolute inset-y-0 left-0 w-[2px] bg-black/20" />
            <span className="absolute inset-[3px] rounded-[1px] border" style={{ borderColor: theme.accent, opacity: 0.6 }} />
          </span>
        );
      })}
    </span>
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
