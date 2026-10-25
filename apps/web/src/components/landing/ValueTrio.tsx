import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { StoryScene, type SceneKind } from '@/components/illustrations/scenes';
import { Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { Section, SectionHeading } from './shared';

const ITEMS: Array<{ key: 'tell' | 'keep' | 'learn'; to: string; scene: SceneKind; tint: string }> = [
  { key: 'tell', to: '/ke-chuyen', scene: 'porch', tint: 'bg-[#F2D8B2]' },
  { key: 'keep', to: '/gia-dinh', scene: 'tet', tint: 'bg-terracotta' },
  { key: 'learn', to: '/kham-pha', scene: 'pottery', tint: 'bg-[#E6C6A8]' },
];

/** Block 5 — three value cards, each linking to its experience. */
export function ValueTrio() {
  const t = useT('landing');
  return (
    <Section labelledBy="values-title" className="cv-section">
      <SectionHeading id="values-title" eyebrow={t('values.eyebrow')} title={t('values.title')} align="center" />
      <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 lg:mt-10 lg:gap-6">
        {ITEMS.map((item, i) => (
          <Reveal as="li" key={item.key} delay={i * 0.12} scale={0.97}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-line transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_-16px_rgba(22,58,49,0.45)] motion-reduce:hover:translate-y-0">
              <div className={`relative h-52 overflow-hidden ${item.tint}`}>
                <StoryScene kind={item.scene} className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100" />
                <span className="absolute left-4 top-4 rounded-full bg-cream/95 px-3 py-1 text-[0.8125rem] font-semibold text-heritage-deep">
                  0{i + 1} · {t(`values.items.${item.key}.label`)}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <h3 className="font-serif text-[1.4rem] font-semibold leading-snug text-heritage-deep">{t(`values.items.${item.key}.title`)}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-ink-soft">{t(`values.items.${item.key}.body`)}</p>
                <Link
                  to={item.to}
                  className="mt-6 inline-flex min-h-12 items-center gap-2 font-semibold text-heritage after:absolute after:inset-0 after:rounded-[1.75rem] after:content-['']"
                >
                  {t(`values.items.${item.key}.cta`)}
                  <ArrowUpRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
