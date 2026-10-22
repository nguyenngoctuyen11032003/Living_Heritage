import { useState } from 'react';
import { useToast } from '@/components/ui';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useReducedMotionSafe } from '@/design/motion';
import { SectionCard } from '@/features/families/states';
import { loadNamespace, translate, useLocale, useT, type Locale } from '@/i18n';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

const LOCALE_OPTIONS: Locale[] = ['vi', 'en'];

export function DisplaySection() {
  const t = useT('settings');
  const { locale, setLocale } = useLocale();
  const { user } = useSession();
  const { toast } = useToast();
  const reduced = useReducedMotionSafe();
  const [status, setStatus] = useState('');

  async function choose(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    const sb = getSupabase();
    if (!sb || !user) return;
    const { error } = await sb.from('profiles').update({ locale: next }).eq('id', user.id);
    // Messages are built with the dictionary of the language just chosen.
    if (error) {
      await loadNamespace(next, 'settings').catch(() => {});
      toast({ title: translate(next, 'settings', 'display.languageLocalOnly'), tone: 'error' });
    }
    else setStatus(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={t('display.languageTitle')} description={t('display.languageDescription')}>
        <fieldset>
          <legend className="sr-only">{t('display.languageLabel')}</legend>
          <div className="flex flex-wrap gap-3">
            {LOCALE_OPTIONS.map((l) => (
              <label
                key={l}
                lang={l}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-5 ring-1 transition-colors focus-within:ring-2 focus-within:ring-heritage',
                  locale === l ? 'bg-mint text-heritage-deep ring-heritage/40' : 'bg-paper text-ink ring-line hover:ring-heritage/40',
                )}
              >
                <input type="radio" name="lh-locale" value={l} checked={locale === l} onChange={() => void choose(l)} className="size-5 accent-heritage" />
                <span className="font-semibold">{t(`display.${l}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p aria-live="polite" className="mt-3 min-h-6 text-[0.9rem] text-ink-soft">
          {status ? t('display.languageSaved') : ''}
        </p>
      </SectionCard>

      <SectionCard title={t('display.themeTitle')} description={t('display.themeDescription')}>
        <ThemeToggle />
      </SectionCard>

      <SectionCard title={t('display.motionTitle')}>
        <p className="leading-relaxed text-ink">{reduced ? t('display.motionOn') : t('display.motionOff')}</p>
      </SectionCard>
    </div>
  );
}
