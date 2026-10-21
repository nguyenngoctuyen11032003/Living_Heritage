import { Field, Input } from '@/components/ui';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { COVER_STYLES, COVER_THEMES, type CoverStyle } from '../covers';

const LABEL_KEY = { 'lua-xanh': 'covers.luaXanh', 'giay-do': 'covers.giayDo', 'dat-nung': 'covers.datNung' } as const;

function useCoverLabel() {
  const t = useT('books');
  return (style: CoverStyle) => t(LABEL_KEY[style]);
}

export interface CoverValue {
  title: string;
  subtitle: string;
  cover_style: CoverStyle;
}

/** Title, subtitle and the three cover swatches (radio group). */
export function CoverFields({ value, onChange, error }: { value: CoverValue; onChange: (v: CoverValue) => void; error?: string | null }) {
  const t = useT('books');
  const label = useCoverLabel();
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('form.title')} required error={error ?? undefined}>
        <Input value={value.title} maxLength={160} placeholder={t('form.titlePlaceholder')} onChange={(e) => onChange({ ...value, title: e.target.value })} />
      </Field>
      <Field label={t('form.subtitle')}>
        <Input value={value.subtitle} maxLength={200} placeholder={t('form.subtitlePlaceholder')} onChange={(e) => onChange({ ...value, subtitle: e.target.value })} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-[0.9rem] font-semibold text-ink">{t('form.cover')}</legend>
        <div className="grid grid-cols-3 gap-3">
          {COVER_STYLES.map((style) => {
            const theme = COVER_THEMES[style];
            const checked = value.cover_style === style;
            return (
              <label
                key={style}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-2 ring-1 transition-shadow focus-within:ring-2 focus-within:ring-heritage',
                  checked ? 'bg-mint/60 ring-heritage/50' : 'bg-paper ring-line',
                )}
              >
                <input type="radio" name="lh-cover" value={style} checked={checked} onChange={() => onChange({ ...value, cover_style: style })} className="sr-only" />
                <span aria-hidden="true" className="relative block aspect-[148/210] w-full overflow-hidden rounded-lg" style={{ background: theme.bg }}>
                  <span className={`absolute inset-0 ${theme.texture}`} />
                  <span className="absolute inset-[10%] rounded-sm border" style={{ borderColor: theme.accent, opacity: 0.6 }} />
                </span>
                <span className={cn('text-center text-[0.85rem]', checked ? 'font-semibold text-heritage-deep' : 'text-ink-soft')}>{label(style)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
