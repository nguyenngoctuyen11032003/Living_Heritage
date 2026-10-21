import { ArrowLeft, Printer } from 'lucide-react';
import { useCallback } from 'react';
import { Link } from 'react-router';
import { Badge, Button, Skeleton } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { LoadError, NotConfigured, Unavailable } from '@/features/vault/components/States';
import { useVaultLookups } from '@/features/vault/useLookups';
import { useT } from '@/i18n';
import { RequireAuth } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { BookPageView } from './components/BookPageView';
import { COVER_THEMES, asCoverStyle } from './covers';
import { canEditBook } from './permissions';
import { useBook, useBookPages, type ChapterEntry } from './useBook';
import type { BookRow } from './api';

// Component-scoped print CSS: A5 sheets, one page per sheet, colours kept.
const PRINT_CSS = `
.lh-sheet {
  width: min(148mm, 100%);
  aspect-ratio: 148 / 210;
  container-type: inline-size;
  margin: 0 auto 28px;
  background: #fffdf8;
  box-shadow: 0 18px 40px -26px rgba(18, 27, 24, 0.55), 0 0 0 1px rgba(31, 41, 51, 0.08);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  overflow: hidden;
}
@page { size: A5; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  .lh-print-root { padding: 0 !important; background: #fff !important; }
  .lh-sheet {
    width: 148mm;
    height: auto;
    min-height: 210mm;
    aspect-ratio: auto;
    margin: 0;
    box-shadow: none;
    overflow: visible;
    break-after: page;
    page-break-after: always;
  }
  .lh-sheet:last-child { break-after: auto; page-break-after: auto; }
  .lh-sheet > div { min-height: 210mm; }
}
`;

export function BookPrint({ bookId }: { bookId: string }) {
  return (
    <RequireAuth>
      <BookPrintInner bookId={bookId} />
    </RequireAuth>
  );
}

function BookPrintInner({ bookId }: { bookId: string }) {
  const t = useT('books');
  const { state, reload } = useBook(bookId);
  const { families, loading: familiesLoading } = useCurrentFamily();
  const back = `/sach/${bookId}`;
  if (!getSupabase())
    return (
      <div className="mx-auto max-w-xl p-6">
        <NotConfigured />
      </div>
    );
  if (state.kind === 'unavailable')
    return (
      <div className="px-4">
        <Unavailable title={t('builder.notFoundTitle')} body={t('builder.notFoundBody')} backTo="/sach" backLabel={t('builder.back')} />
      </div>
    );
  if (state.kind === 'error')
    return (
      <div className="mx-auto max-w-xl p-6">
        <LoadError onRetry={reload} message={t('state.loadError')} />
      </div>
    );
  if (state.kind === 'ready' && !familiesLoading && !canEditBook(families, state.book.family_id))
    // B11: viewers read the book in the app but cannot print or save it. The notice never shows the title.
    return (
      <div className="px-4">
        <Unavailable title={t('print.noPermissionTitle')} body={t('print.noPermissionBody')} backTo={back} backLabel={t('print.backToBook')} />
      </div>
    );
  if (state.kind === 'loading' || familiesLoading)
    return (
      <div className="mx-auto flex max-w-[148mm] flex-col gap-4 p-6" aria-busy="true">
        <p className="sr-only" role="status">
          {t('state.loading')}
        </p>
        <Skeleton className="h-12" />
        <Skeleton className="aspect-[148/210]" />
      </div>
    );
  return <PrintSheets book={state.book} chapters={state.chapters} back={back} />;
}

function PrintSheets({ book, chapters, back }: { book: BookRow; chapters: ChapterEntry[]; back: string }) {
  const t = useT('books');
  const lookups = useVaultLookups(book.family_id);
  const narratorName = useCallback((id: string) => lookups.narratorById.get(id)?.display_name, [lookups.narratorById]);
  const { inputs, pages } = useBookPages(chapters, narratorName);

  return (
    <div className="lh-print-root min-h-dvh bg-[#ece6d8] px-4 pb-10">
      <style>{PRINT_CSS}</style>
      <div className="no-print sticky top-0 z-10 -mx-4 mb-8 border-b border-line bg-cream px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Link to={back} className="inline-flex min-h-11 w-fit items-center gap-2 text-[0.95rem] font-semibold text-heritage hover:underline">
              <ArrowLeft className="size-5" aria-hidden="true" />
              {t('print.back')}
            </Link>
            <Badge tone="warning" className="w-fit">
              {t('print.label')}
            </Badge>
            <p className="text-[0.85rem] text-ink-soft">{t('print.hint')}</p>
          </div>
          <Button leftIcon={<Printer className="size-5" />} onClick={() => void document.fonts.ready.then(() => window.print())} disabled={inputs.length === 0}>
            {t('print.print')}
          </Button>
        </div>
      </div>
      {inputs.length === 0 ? (
        <main id="main" className="mx-auto max-w-xl">
          <h1 className="sr-only">{book.title}</h1>
          <p className="rounded-2xl bg-paper p-6 text-center text-ink-soft">{t('preview.empty')}</p>
        </main>
      ) : (
        <main id="main" aria-label={book.title}>
          {pages.map((page, i) => (
            <section key={i} className="lh-sheet">
              <div className="relative h-full">
                <BookPageView page={page} book={book} chapters={inputs} coverTitleAs="h1" />
                {page.kind === 'cover' && (
                  <p className="absolute inset-x-0 bottom-[3cqw] text-center font-sans" style={{ fontSize: '1.8cqw', color: COVER_THEMES[asCoverStyle(book.cover_style)].ink, opacity: 0.75 }}>
                    {t('print.label')}
                  </p>
                )}
              </div>
            </section>
          ))}
        </main>
      )}
    </div>
  );
}
