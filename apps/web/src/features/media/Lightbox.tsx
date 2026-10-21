import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Button, Dialog } from '@/components/ui';
import { useT } from '@/i18n';

export interface LightboxItem {
  id: string;
  url: string | null;
  caption: string | null;
  /** When set, the lightbox shows a link to /cau-chuyen/:storyId. */
  storyId?: string;
  storyTitle?: string;
}

/** Full-size photo viewer: Dialog (focus trap, Esc closes) + ←/→ to browse. */
export function Lightbox({ items, index, onIndex, onClose }: { items: readonly LightboxItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const t = useT('media');
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : undefined;
  const total = items.length;
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    if (!open || total < 2) return;
    function onKey(e: KeyboardEvent) {
      const i = indexRef.current;
      if (i === null) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onIndex((i + 1) % total);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndex((i - 1 + total) % total);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, total, onIndex]);

  const alt = item?.caption?.trim() || t('photos.altFallback');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t('lightbox.title', { n: (index ?? 0) + 1, total })}
      description={total > 1 ? t('lightbox.hint') : undefined}
      footer={
        item &&
        (total > 1 || item.storyId) && (
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {item.storyId ? (
              <Link to={`/cau-chuyen/${item.storyId}`} className="inline-flex min-h-12 items-center font-semibold text-heritage underline-offset-4 hover:underline">
                {item.storyTitle ? t('album.openStory', { title: item.storyTitle }) : t('lightbox.toStory')}
              </Link>
            ) : (
              <span />
            )}
            {total > 1 && (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => onIndex((index! - 1 + total) % total)} leftIcon={<ChevronLeft className="size-5" aria-hidden="true" />}>
                  {t('lightbox.prev')}
                </Button>
                <Button variant="secondary" onClick={() => onIndex((index! + 1) % total)} rightIcon={<ChevronRight className="size-5" aria-hidden="true" />}>
                  {t('lightbox.next')}
                </Button>
              </div>
            )}
          </div>
        )
      }
    >
      {item && (
        <figure className="flex flex-col gap-3 pb-2">
          <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-2xl bg-night/90">
            {item.url ? (
              <img src={item.url} alt={alt} className="max-h-[62dvh] w-auto max-w-full object-contain" />
            ) : (
              <p className="flex items-center gap-2 p-8 text-cream">
                <ImageOff className="size-5" aria-hidden="true" />
                {t('photos.noPreview')}
              </p>
            )}
          </div>
          {item.caption?.trim() && <figcaption className="font-serif text-[1.05rem] italic leading-relaxed text-ink">{item.caption}</figcaption>}
        </figure>
      )}
    </Dialog>
  );
}
