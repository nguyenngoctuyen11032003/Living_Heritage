import { CircleHelp } from 'lucide-react';
import { useMemo } from 'react';
import { useT } from '@/i18n';
import { countUncertain, parseTranscript } from './transcript';

/** Original transcript with `[?]` passages shown as labelled "Cần kiểm tra" chips (icon + text, not colour alone). */
export function TranscriptView({ text }: { text: string }) {
  const t = useT('review');
  const segments = useMemo(() => parseTranscript(text), [text]);
  const n = countUncertain(segments);
  return (
    <div className="flex flex-col gap-3">
      {n > 0 && (
        <p className="rounded-2xl bg-[#fbecc8]/60 p-3 text-[0.9rem] leading-relaxed text-[#5b3f0a]">
          <strong className="font-semibold">{t('source.uncertainCount', { n })}.</strong> {t('source.uncertainHint')}
        </p>
      )}
      <blockquote aria-label={t('source.verbatim')} className="whitespace-pre-line border-l-4 border-heritage/25 pl-4 text-[1rem] leading-[1.9] text-ink [overflow-wrap:anywhere]">
        {segments.map((s, i) =>
          s.kind === 'text' ? (
            <span key={i}>{s.text}</span>
          ) : (
            <mark key={i} className="mx-0.5 rounded-lg [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-[#fbecc8] px-1.5 py-0.5 text-[#5b3f0a] underline decoration-dotted decoration-2 underline-offset-4">
              {s.text ? <span>{s.text}</span> : <span className="italic">{t('source.uncertainUnclear')}</span>}
              <span className="ml-1 inline-flex items-center gap-1 whitespace-nowrap align-middle rounded-full bg-paper px-2 text-[0.8rem] font-semibold leading-snug no-underline ring-1 ring-[#e3c77f]">
                <CircleHelp aria-hidden="true" className="size-4" />
                {t('source.uncertainLabel')}
              </span>
            </mark>
          ),
        )}
      </blockquote>
    </div>
  );
}
