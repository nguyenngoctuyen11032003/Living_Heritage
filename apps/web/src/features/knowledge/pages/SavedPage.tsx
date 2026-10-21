import { Bookmark, Compass, RotateCcw, X } from 'lucide-react';
import { useCallback } from 'react';
import { Link } from 'react-router';
import { Button, ButtonLink, EmptyState, PageHeader, Skeleton, useToast } from '@/components/ui';
import { useLocale, usePick, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { TopicMotif } from '../components/TopicMotif';
import { getSampleItem } from '../sample-items';
import { useWithdrawnSaved, type SavedEntry } from '../saved';
import { findTopic, topicStyle, useTopics } from '../topics';
import { bareQuote, narratorText } from '../types';
import { useSaved } from '../useSaved';

/** /da-luu — "save for later": this device when signed out, the account (saved_items) when signed in. */
export default function SavedPage() {
  const t = useT('knowledge');
  const saved = useSaved();
  const { list } = saved;
  // Device mode only: account rows of withdrawn items are removed by the database (cascade).
  const withdrawn = useWithdrawnSaved(saved.mode === 'device' ? list : NONE);
  const { toast } = useToast();
  const remove = useCallback(
    (id: string) => {
      saved.remove(id).catch(() => toast({ title: t('saved.removeError'), tone: 'error' }));
    },
    [saved, toast, t],
  );
  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-16">
        <PageHeader
          eyebrow={t('saved.kicker')}
          title={t('saved.title')}
          lede={saved.mode === 'account' ? t('saved.ledeAccount') : t('saved.lede')}
          className="mb-0 md:mb-0"
        />
        {saved.mergeFailed && (
          <p role="status" className="mt-6 rounded-2xl bg-[#fdf6e3] px-4 py-3 text-[0.92rem] leading-relaxed text-[#5b430f] ring-1 ring-[#e9d6a6]">
            {t('saved.mergeFailed')}
          </p>
        )}
        {saved.status === 'loading' ? (
          <div aria-busy="true" className="mt-10 flex flex-col gap-4">
            <span role="status" className="sr-only">
              {t('saved.loading')}
            </span>
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[1.5rem]" />
            ))}
          </div>
        ) : saved.status === 'error' ? (
          <div role="alert" className="mt-10">
            <EmptyState
              icon={<RotateCcw />}
              title={t('saved.loadError')}
              action={
                <Button onClick={saved.retry} leftIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
                  {t('states.retry')}
                </Button>
              }
            />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={<Bookmark />}
            title={t('saved.emptyTitle')}
            description={t('saved.emptyBody')}
            action={
              <ButtonLink to="/kham-pha" leftIcon={<Compass aria-hidden="true" className="size-4" />}>
                {t('saved.explore')}
              </ButtonLink>
            }
          />
        ) : (
          <>
            <p aria-live="polite" className="mt-8 text-[0.92rem] font-semibold text-ink-soft">
              {t('saved.count', { n: list.length })}
            </p>
            <ul className="mt-4 flex flex-col gap-4">
              {list.map((e) =>
                withdrawn.has(e.id) ? <WithdrawnRow key={e.id} entry={e} onRemove={remove} /> : <SavedRow key={e.id} entry={e} onRemove={remove} />,
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

const NONE: SavedEntry[] = [];

function SavedRow({ entry, onRemove }: { entry: SavedEntry; onRemove: (id: string) => void }) {
  const t = useT('knowledge');
  const pick = usePick();
  const { locale } = useLocale();
  const topics = useTopics();
  const sample = getSampleItem(entry.id);
  // Samples re-render in the current language; real items keep the title saved at the time.
  const title = sample ? sample.title[locale] : entry.title;
  const narrator = sample ? sample.narratorLabel[locale] : narratorText(entry.narratorLabel, t('card.anonymous'));
  const style = topicStyle(entry.topicSlug);
  const topic = findTopic(topics, entry.topicSlug);
  return (
    <li className="group relative flex overflow-hidden rounded-[1.5rem] bg-paper ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-heritage hover:shadow-[0_18px_40px_-30px_rgba(22,58,49,0.55)]">
      <div aria-hidden="true" className="relative w-20 shrink-0 overflow-hidden sm:w-28" style={{ backgroundColor: style.band, color: style.ink }}>
        <TopicMotif slug={entry.topicSlug} className="absolute -left-6 bottom-0 h-full w-[220%] opacity-50" />
      </div>
      <div className="min-w-0 flex-1 p-5 pr-16">
        <p className="text-[0.74rem] font-bold uppercase tracking-[0.14em] text-terracotta">
          {topic ? `${pick(topic.title)} · ` : ''}
          {t(`kinds.${entry.kind}`)}
        </p>
        <h2 className="mt-2 font-serif text-[1.15rem] font-semibold leading-snug text-heritage-deep">
          <Link to={`/tri-thuc/${entry.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            “{bareQuote(title)}”
          </Link>
        </h2>
        <p className="mt-2 text-[0.88rem] text-ink-soft">
          <span className="font-semibold text-ink">{narrator}</span>
          <span aria-hidden="true"> · </span>
          {t('saved.savedOn', { date: formatDate(entry.savedAt, locale) })}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        aria-label={t('saved.removeLabel', { title: bareQuote(title) })}
        title={t('saved.remove')}
        className="absolute right-3 top-3 z-10 inline-flex size-12 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-terracotta/10 hover:text-terracotta"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </li>
  );
}

/** A saved item the narrator has withdrawn: its stored title and narrator are not shown again (B16, NT09). */
function WithdrawnRow({ entry, onRemove }: { entry: SavedEntry; onRemove: (id: string) => void }) {
  const t = useT('knowledge');
  const { locale } = useLocale();
  return (
    <li className="relative flex overflow-hidden rounded-[1.5rem] border border-dashed border-line bg-paper/70">
      <div className="min-w-0 flex-1 p-5 pr-16">
        <h2 className="font-serif text-[1.1rem] font-semibold leading-snug text-ink-soft">{t('saved.unavailableTitle')}</h2>
        <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">{t('saved.unavailableBody')}</p>
        <p className="mt-1 text-[0.82rem] text-ink-soft">{t('saved.savedOn', { date: formatDate(entry.savedAt, locale) })}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        aria-label={t('saved.removeUnavailable')}
        title={t('saved.remove')}
        className="absolute right-3 top-3 z-10 inline-flex size-12 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-terracotta/10 hover:text-terracotta"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </li>
  );
}
