import type { CSSProperties } from 'react';
import { QrCode } from '@/components/ui';
import { useT } from '@/i18n';
import { siteHref } from '@/lib/env';
import { formatDuration } from '@/lib/format';
import { COVER_THEMES, asCoverStyle } from '../covers';
import type { BookPage, ChapterInput } from '../pages';

export interface BookMeta {
  title: string;
  subtitle: string | null;
  cover_style: string;
}

/**
 * One A5 page. All sizes are in `cqw` (percent of the page width), so the on-screen preview and the
 * 148 mm print sheet have identical line breaks. The parent must set `container-type: inline-size`.
 */
export function BookPageView({ page, book, chapters }: { page: BookPage; book: BookMeta; chapters: ChapterInput[] }) {
  const t = useT('books');
  const base: CSSProperties = { fontSize: '2.65cqw', lineHeight: 1.6 };

  if (page.kind === 'cover') {
    const theme = COVER_THEMES[asCoverStyle(book.cover_style)];
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ ...base, background: theme.bg, color: theme.ink }}>
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${theme.texture}`} />
        <div aria-hidden="true" className="absolute inset-[5cqw] rounded-[1cqw] border" style={{ borderColor: theme.accent, opacity: 0.55 }} />
        <div className="relative flex flex-1 flex-col items-center justify-center px-[14cqw] text-center">
          <p className="font-sans font-semibold uppercase" style={{ fontSize: '2.2cqw', letterSpacing: '0.3em', color: theme.accent }}>
            {t('preview.familyBook')}
          </p>
          <span aria-hidden="true" className="my-[5cqw] block h-px w-[18cqw]" style={{ background: theme.accent }} />
          <h2 className="break-words font-serif font-semibold" style={{ fontSize: '8.5cqw', lineHeight: 1.12 }}>
            {book.title}
          </h2>
          {book.subtitle && (
            <p className="mt-[4cqw] font-serif italic" style={{ fontSize: '3.6cqw', opacity: 0.9 }}>
              {book.subtitle}
            </p>
          )}
        </div>
        <p className="relative pb-[9cqw] text-center font-hand" style={{ fontSize: '4.2cqw', color: theme.accent }}>
          {t('preview.madeWith')}
        </p>
      </div>
    );
  }

  if (page.kind === 'toc') {
    return (
      <div className="flex h-full w-full flex-col bg-[#fffdf8] px-[12cqw] py-[12cqw] text-ink" style={base}>
        {page.number === 1 && (
          <h2 className="mb-[7cqw] font-serif font-semibold text-heritage-deep" style={{ fontSize: '6cqw' }}>
            {t('preview.toc')}
          </h2>
        )}
        <ol className="flex flex-col gap-[2.6cqw] font-serif">
          {page.entries.map((e) => (
            <li key={e.chapter} className="flex items-baseline gap-[2cqw]">
              <span className="shrink-0 font-sans font-semibold text-terracotta" style={{ fontSize: '2.3cqw' }}>
                {String(e.chapter).padStart(2, '0')}
              </span>
              <span className="min-w-0 break-words">{e.title}</span>
              <span aria-hidden="true" className="mx-[1cqw] min-w-[4cqw] flex-1 border-b border-dotted border-ink-soft/50" />
              <span className="shrink-0 tabular-nums text-ink-soft">{e.page}</span>
            </li>
          ))}
        </ol>
        <PageNumber n={page.number} />
      </div>
    );
  }

  const chapter = chapters[page.chapter]!;
  return (
    <div className="flex h-full w-full flex-col bg-[#fffdf8] px-[12cqw] pb-[9cqw] pt-[11cqw] text-ink" style={base}>
      {page.first && (
        <header className="mb-[5cqw]">
          <p className="font-sans font-semibold uppercase text-terracotta" style={{ fontSize: '2.1cqw', letterSpacing: '0.22em' }}>
            {t('preview.chapter', { n: page.chapter + 1 })}
          </p>
          <h2 className="mt-[2cqw] break-words font-serif font-semibold text-heritage-deep" style={{ fontSize: '6cqw', lineHeight: 1.15 }}>
            {chapter.title}
          </h2>
          {chapter.narrator && (
            <p className="mt-[2cqw] font-serif italic text-ink-soft" style={{ fontSize: '3cqw' }}>
              {t('preview.narratedBy', { name: chapter.narrator })}
            </p>
          )}
        </header>
      )}
      <div className="flex-1 font-serif" style={{ textAlign: 'justify', hyphens: 'auto' }}>
        {page.paragraphs.map((p, i) => (
          <p key={i} className="mb-[2.4cqw]" style={{ textIndent: page.first && i === 0 ? 0 : '4cqw' }}>
            {p}
          </p>
        ))}
      </div>
      {page.last && chapter.durationS !== null && (
        <figure className="mt-[3cqw] flex items-center gap-[4cqw] rounded-[2cqw] border border-line bg-cream/70 p-[3cqw]">
          <QrCode
            value={siteHref('/nghe/' + chapter.storyId)}
            label={t('preview.qrLabel', { title: chapter.title })}
            size={96}
            bg="#ffffff"
            className="h-[19cqw] w-[19cqw] shrink-0"
          />
          <figcaption className="font-sans" style={{ fontSize: '2.3cqw', lineHeight: 1.45 }}>
            <span className="block font-semibold text-heritage-deep">{t('preview.qrCaption', { d: formatDuration(chapter.durationS) })}</span>
            <span className="mt-[1cqw] block text-ink-soft">{t('preview.qrNote')}</span>
          </figcaption>
        </figure>
      )}
      <PageNumber n={page.number} />
    </div>
  );
}

function PageNumber({ n }: { n: number }) {
  return (
    <p className="mt-auto pt-[3cqw] text-center font-sans tabular-nums text-ink-soft" style={{ fontSize: '2.1cqw' }}>
      {n}
    </p>
  );
}
