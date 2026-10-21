import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { buildExperienceSections, readExperienceFields } from '../experience';

/** Vấn đề áp dụng / Kinh nghiệm (numbered) / Điều kiện / Lưu ý / Giới hạn áp dụng. Missing → "Chưa có thông tin". */
export function ExperienceSections({ fields, headingLevel = 'h2' }: { fields: unknown; headingLevel?: 'h2' | 'h3' }) {
  const t = useT('knowledge');
  const sections = buildExperienceSections(fields, t('detail.missing'));
  const skill = readExperienceFields(fields).skill;
  const H = headingLevel;
  return (
    <div>
      {skill && (
        <p className="mb-8 border-l-4 border-terracotta pl-4 font-serif text-[1.2rem] leading-snug text-ink">
          <span className="block text-[0.75rem] font-sans font-bold uppercase tracking-[0.16em] text-terracotta">{t('detail.skill')}</span>
          {skill}
        </p>
      )}
      <ol className="space-y-10">
        {sections.map((s, i) => (
          <li key={s.key} className="grid gap-3 md:grid-cols-[4.5rem_minmax(0,1fr)]">
            <span aria-hidden="true" className="font-serif text-[2rem] leading-none text-heritage/30 md:text-[2.4rem]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <H className="font-serif text-[1.35rem] font-semibold text-heritage-deep">{t(`detail.sections.${s.key}`)}</H>
              {s.missing ? (
                <p className="mt-2 italic text-ink-soft">{s.display[0]}</p>
              ) : s.variant === 'steps' ? (
                <ol className="mt-4 space-y-4">
                  {s.items.map((step, n) => (
                    <li key={n} className="flex gap-4">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-heritage font-serif text-[1rem] font-semibold text-cream">
                        <span className="sr-only">{t('detail.stepN', { n: n + 1 })}: </span>
                        <span aria-hidden="true">{n + 1}</span>
                      </span>
                      <p className="pt-1 leading-relaxed text-ink">{step}</p>
                    </li>
                  ))}
                </ol>
              ) : s.variant === 'list' ? (
                <ul className={cn('mt-3 space-y-2 pl-5', s.key === 'cautions' ? 'list-["!__"] marker:font-bold marker:text-terracotta' : 'list-disc marker:text-heritage')}>
                  {s.items.map((x, n) => (
                    <li key={n} className="leading-relaxed text-ink">
                      {x}
                    </li>
                  ))}
                </ul>
              ) : (
                s.items.map((x, n) => (
                  <p key={n} className="mt-2 leading-relaxed text-ink">
                    {x}
                  </p>
                ))
              )}
            </div>
          </li>
        ))}
      </ol>
      {sections.some((s) => s.missing) && <p className="mt-8 text-[0.88rem] text-ink-soft">{t('detail.missingNote')}</p>}
    </div>
  );
}
