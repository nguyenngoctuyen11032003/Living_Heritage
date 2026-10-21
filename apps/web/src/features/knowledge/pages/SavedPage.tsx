import { Bookmark, Compass, X } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink, EmptyState } from '@/components/ui';
import { useLocale, usePick, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { TopicMotif } from '../components/TopicMotif';
import { getSampleItem } from '../sample-items';
import { removeSaved, useSavedList, type SavedEntry } from '../saved';
import { findTopic, topicStyle, useTopics } from '../topics';
import { bareQuote } from '../types';

/** /da-luu — the per-device "save for later" list. */
export default function SavedPage() {
  const t = useT('knowledge');
  const list = useSavedList();
  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-16">
        <p className="text-[0.78rem] font-bold uppercase tracking-[0.2em] text-terracotta">{t('saved.kicker')}</p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-tight text-heritage-deep md:text-[3rem]">{t('saved.title')}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{t('saved.lede')}</p>
        {list.length === 0 ? (
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
              {list.map((e) => (
                <SavedRow key={e.id} entry={e} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function SavedRow({ entry }: { entry: SavedEntry }) {
  const t = useT('knowledge');
  const pick = usePick();
  const { locale } = useLocale();
  const topics = useTopics();
  const sample = getSampleItem(entry.id);
  // Samples re-render in the current language; real items keep the title saved at the time.
  const title = sample ? sample.title[locale] : entry.title;
  const narrator = sample ? sample.narratorLabel[locale] : entry.narratorLabel;
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
        onClick={() => removeSaved(entry.id)}
        aria-label={t('saved.removeLabel', { title: bareQuote(title) })}
        title={t('saved.remove')}
        className="absolute right-3 top-3 z-10 inline-flex size-12 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-terracotta/10 hover:text-terracotta"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </li>
  );
}
