import { CalendarDays, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AudioPlayer, Skeleton } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { formatDate, formatDuration } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { signedAudioUrl, type RecordingRow, type TranscriptRow } from './data';
import { TranscriptView } from './TranscriptView';

export function SourcePanel({ recording, transcript }: { recording: RecordingRow | null; transcript: TranscriptRow | null }) {
  const t = useT('review');
  const { locale } = useLocale();
  const [audio, setAudio] = useState<{ path: string; url: string | null } | null>(null);
  const path = recording?.storage_path ?? null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !path) return;
    let alive = true;
    void signedAudioUrl(sb, path).then((url) => {
      if (alive) setAudio({ path, url });
    });
    return () => {
      alive = false;
    };
  }, [path]);

  const audioState = !path ? null : audio?.path === path ? audio.url : undefined;

  return (
    <section aria-labelledby="source-heading" className="flex flex-col gap-5">
      <div>
        <h2 id="source-heading" className="font-serif text-[1.35rem] font-semibold leading-snug text-heritage-deep">
          {t('source.heading')}
        </h2>
        <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft">{t('source.note')}</p>
      </div>

      {!recording ? (
        <p className="text-ink-soft">{t('source.noRecording')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {audioState === undefined ? (
            <Skeleton className="h-28 w-full" />
          ) : audioState === null ? (
            <p role="status" className="rounded-2xl bg-paper p-4 text-ink-soft ring-1 ring-line">
              {t('source.audioUnavailable')}
            </p>
          ) : (
            <AudioPlayer src={audioState} duration={recording.duration_s ?? 0} title={t('source.playerTitle')} />
          )}
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-[0.9rem] text-ink-soft">
            {recording.duration_s != null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4" />
                {t('source.duration', { d: formatDuration(recording.duration_s) })}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-4" />
              {t('source.recordedAt', { date: formatDate(recording.created_at, locale) })}
            </span>
          </p>
        </div>
      )}

      {recording && (
        <div className="flex flex-col gap-3">
          <h3 className="flex flex-wrap items-baseline gap-2 font-semibold text-ink">
            {t('source.transcriptHeading')}
            {transcript && <span className="text-[0.82rem] font-normal text-ink-soft">{t('source.transcriptVersion', { v: transcript.version })}</span>}
          </h3>
          {transcript ? <TranscriptView text={transcript.text} /> : <p className="text-ink-soft">{t('source.noTranscript')}</p>}
        </div>
      )}
    </section>
  );
}
