import { DrawArrow, Reveal } from '@/components/motion';
import { useT } from '@/i18n';
import { PrimaryCta } from './shared';

/** Closing call to action before the footer. */
export function FinalCta() {
  const t = useT('landing');
  return (
    <section aria-labelledby="final-title" className="px-4 pb-24 pt-4 md:pb-32">
      <Reveal className="relative mx-auto max-w-4xl text-center">
        <DrawArrow viewBox="0 0 80 40" className="mx-auto mb-4 h-10 w-20" d="M6 30 C 22 4, 52 4, 74 26" head="M60 26 L 75 27 L 72 12" />
        <h2 id="final-title" className="text-balance font-serif text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.14] tracking-[-0.02em] text-heritage-deep">
          {t('final.title')}
        </h2>
        <p className="mx-auto mt-5 max-w-xl font-hand text-[1.7rem] font-semibold leading-snug text-heritage md:text-[2rem]">{t('final.body')}</p>
        <div className="mt-10 flex justify-center">
          <PrimaryCta />
        </div>
      </Reveal>
    </section>
  );
}
