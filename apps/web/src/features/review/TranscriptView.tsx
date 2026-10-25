import { CircleHelp } from 'lucide-react';
import { useMemo } from 'react';
import { useT } from '@/i18n';
import { countUncertain, parseTranscript } from './transcript';

/** Original transcript with `[?]` passages shown as labelled "Cần kiểm tra" chips (icon + text, not colour alone). */
/** `verbatim` false: a person corrected this version, so it is labelled as corrected rather than machine-verbatim. */
export function TranscriptView({ text, verbatim = true }: { text: string; verbatim?: boolean }) {
  const t = useT('review');
  const segments = useMemo(() => parseTranscript(text), [text]);
  const n = countUncertain(segments);
  return (
    <div className="flex flex-col gap-3">
      {n > 0 && (
        <p className="rounded-2xl bg-warning-bg p-3 text-[0.9rem] leading-relaxed text-warning-fg">
          <strong className="font-semibold">{t('source.uncertainCount', { n })}.</strong> {t('source.uncertainHint')}
        </p>
      )}
      <blockquote aria-label={verbatim ? t('source.verbatim') : t('source.correctedLabel')} className="whitespace-pre-line border-l-4 border-line pl-4 leading-[1.9] text-ink">
        {segments.map((s, i) =>
          s.kind === 'text' ? (
            <span key={i}>{s.text}</span>
          ) : (
            <mark key={i} className="mx-0.5 inline-flex items-baseline gap-1 rounded-lg bg-warning-bg px-1.5 py-0.5 text-warning-fg underline decoration-dotted decoration-2 underline-offset-4">
              {s.text ? <span>{s.text}</span> : <span className="italic">{t('source.uncertainUnclear')}</span>}
              <span className="inline-flex items-center gap-0.5 self-center whitespace-nowrap rounded-full bg-paper px-1.5 text-[0.75rem] font-semibold no-underline ring-1 ring-warning-line">
                <CircleHelp aria-hidden="true" className="size-3" />
                {t('source.uncertainLabel')}
              </span>
            </mark>
          ),
        )}
      </blockquote>
    </div>
  );
}
