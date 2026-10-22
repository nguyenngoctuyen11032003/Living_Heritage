import { CalendarDays, Clock, PencilLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AudioPlayer, Button, Field, Skeleton, Textarea, useToast } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { formatDate, formatDuration } from '@/lib/format';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { reviewErrorKey } from './errors';
import { saveTranscript, signedAudioUrl, type RecordingRow, type TranscriptRow } from './data';
import { TranscriptView } from './TranscriptView';

export interface SourcePanelProps {
  recording: RecordingRow | null;
  transcript: TranscriptRow | null;
  /** Desktop side rail: the player stays at the top and only the transcript scrolls (the rail itself is sticky). */
  rail?: boolean;
  /** Editors and the narrator can correct the transcript; the correction is saved as a new transcript version. */
  canEdit?: boolean;
  onTranscriptSaved?: () => void;
}

export function SourcePanel({ recording, transcript, rail, canEdit, onTranscriptSaved }: SourcePanelProps) {
  const t = useT('review');
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveEdit() {
    const sb = getSupabase();
    if (!sb || !recording || saving) return;
    setSaving(true);
    try {
      await saveTranscript(sb, recording.id, draftText);
      toast({ title: t('source.edit.saved'), tone: 'success' });
      setEditing(false);
      onTranscriptSaved?.();
    } catch (e) {
      toast({ title: t(`errors.${reviewErrorKey(e)}`), tone: 'error' });
    } finally {
      setSaving(false);
    }
  }
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
    <section aria-labelledby="source-heading" className={cn('flex flex-col gap-5', rail && 'h-full min-h-0')}>
      <div className="shrink-0">
        <h2 id="source-heading" tabIndex={-1} className="font-serif text-[1.2rem] font-semibold leading-snug text-heritage-deep focus:outline-none">
          {t('source.heading')}
        </h2>
        <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft">{t('source.note')}</p>
      </div>

      {!recording ? (
        <p className="text-ink-soft">{t('source.noRecording')}</p>
      ) : (
        <div className="flex shrink-0 flex-col gap-3">
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
        <div className={cn('flex flex-col gap-3', rail && 'min-h-0 flex-1')}>
          <h3 id="transcript-heading" className="flex shrink-0 flex-wrap items-baseline gap-2 font-semibold text-ink">
            {t('source.transcriptHeading')}
            {transcript && <span className="text-[0.875rem] font-normal text-ink-soft">{t('source.transcriptVersion', { v: transcript.version })}</span>}
          </h3>
          {editing ? (
            <div className="flex flex-col gap-3">
              <Field label={t('source.edit.label')} hint={t('source.edit.hint')}>
                <Textarea value={draftText} rows={12} onChange={(e) => setDraftText(e.target.value)} className="text-[1rem] leading-[1.8]" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void saveEdit()} loading={saving} disabled={draftText.trim() === '' || draftText === transcript?.text}>
                  {t('source.edit.save')}
                </Button>
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                  {t('source.edit.cancel')}
                </Button>
              </div>
            </div>
          ) : transcript ? (
            rail ? (
              // Scrollable on its own, so it must be reachable by keyboard.
              <div tabIndex={0} role="region" aria-labelledby="transcript-heading" className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl pr-2 text-[0.95rem]">
                <TranscriptView text={transcript.text} />
              </div>
            ) : (
              <TranscriptView text={transcript.text} />
            )
          ) : (
            <p className="text-ink-soft">{t('source.noTranscript')}</p>
          )}
          {canEdit && transcript && !editing && (
            <div>
              <Button
                variant="secondary"
                leftIcon={<PencilLine className="size-5" aria-hidden="true" />}
                onClick={() => {
                  setDraftText(transcript.text);
                  setEditing(true);
                }}
              >
                {t('source.edit.open')}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
