import { useT } from '@/i18n';

/** Renders a transcript line; `[?]` becomes a marked "chỗ nghe chưa rõ" (text label, not colour alone). */
export function UncertainText({ text, fix }: { text: string; fix?: string | null }) {
  const t = useT('demo');
  const parts = text.split('[?]');
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 &&
            (fix ? (
              <mark className="rounded bg-mint px-1 font-semibold text-heritage-deep">{fix}</mark>
            ) : (
              <mark className="rounded bg-warning-bg px-1 font-semibold text-warning-fg underline decoration-dotted underline-offset-4">
                [?] <span className="text-[0.85em] font-normal">{t('transcript.unclear')}</span>
              </mark>
            ))}
        </span>
      ))}
    </>
  );
}
