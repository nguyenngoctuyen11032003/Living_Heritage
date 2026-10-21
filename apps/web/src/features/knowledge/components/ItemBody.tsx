import { useLocale, useT } from '@/i18n';
import { formatDate } from '@/lib/format';
import { paragraphs } from '../experience';
import type { KnowledgeItem } from '../types';
import { ExperienceSections } from './ExperienceSections';

/** Lede + full narration (story) or the experience sections. Also used for the admin's exact preview. */
export function ItemBody({ item, headingLevel = 'h2' }: { item: KnowledgeItem; headingLevel?: 'h2' | 'h3' }) {
  const t = useT('knowledge');
  const H = headingLevel;
  const paras = paragraphs(item.body);
  return (
    <div>
      {item.summary && <p className="max-w-[62ch] font-serif text-[1.28rem] italic leading-relaxed text-ink md:text-[1.4rem]">{item.summary}</p>}
      {item.kind === 'experience' ? (
        <div className="mt-10">
          <ExperienceSections fields={item.fields} headingLevel={headingLevel} />
          {paras.length > 0 && (
            <section className="mt-12 border-t border-line pt-8">
              <H className="font-serif text-[1.35rem] font-semibold text-heritage-deep">{t('detail.transcript')}</H>
              <div className="mt-4 max-w-[68ch] space-y-4 leading-[1.8] text-ink">
                {paras.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <section className="mt-10">
          <H className="text-[0.875rem] font-bold uppercase tracking-[0.14em] text-terracotta">{t('detail.transcript')}</H>
          {paras.length > 0 ? (
            <div className="mt-5 max-w-[68ch] space-y-5 text-[1.08rem] leading-[1.85] text-ink first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-[3.6rem] first-letter:font-semibold first-letter:leading-[0.85] first-letter:text-heritage-deep">
              {paras.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <p className="mt-4 italic text-ink-soft">{t('detail.missing')}</p>
          )}
        </section>
      )}
    </div>
  );
}

/** "Nguồn kể & phạm vi sử dụng" — always shown on public items. */
export function SourceBox({ item, topicTitle, headingLevel = 'h2' }: { item: KnowledgeItem; topicTitle?: string | null; headingLevel?: 'h2' | 'h3' }) {
  const t = useT('knowledge');
  const { locale } = useLocale();
  const H = headingLevel;
  const rows: [string, string][] = [
    [t('detail.sourceNarrator'), item.narratorLabel || t('detail.missing')],
    [t('detail.sourceRegion'), item.region ? t(`regions.${item.region}`) : t('detail.missing')],
    [t('detail.sourceDecade'), item.decade ? t('card.decade', { decade: item.decade }) : t('detail.missing')],
  ];
  if (item.publishedAt && !item.sample) rows.push([t('detail.sourcePublished'), formatDate(item.publishedAt, locale)]);
  return (
    <section className="rounded-[1.5rem] bg-paper p-6 ring-1 ring-line">
      <H className="font-serif text-[1.15rem] font-semibold text-heritage-deep">{t('detail.sections.source')}</H>
      {topicTitle && <p className="mt-1 text-[0.9375rem] text-ink-soft">{topicTitle}</p>}
      <dl className="mt-4 divide-y divide-line/70 text-[0.95rem]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-ink-soft">{k}</dt>
            <dd className="min-w-0 break-words text-right font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-line/70 pt-4 text-[0.9375rem] leading-relaxed text-ink-soft">{item.sample ? t('detail.sourceSample') : t('detail.sourceUsage')}</p>
    </section>
  );
}
