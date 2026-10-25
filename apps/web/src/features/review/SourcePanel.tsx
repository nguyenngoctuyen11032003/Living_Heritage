import { CalendarDays, Clock, PencilLine, Save } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { AudioPlayer, Button, Field, Skeleton, Textarea } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { formatDate, formatDuration } from '@/lib/format';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { loadOriginalTranscript, saveTranscript, signedAudioUrl, type RecordingRow, type TranscriptRow } from './data';
import { reviewErrorKey } from './errors';
import type { TranscriptControl, TranscriptState } from './transcript';
import { TranscriptView } from './TranscriptView';

export interface SourcePanelProps {
  recording: RecordingRow | null;
  transcriptState: TranscriptState;
  onTranscriptStateChange: (next: TranscriptState) => void;
  /** Desktop side rail: the player stays at the top and only the transcript scrolls (the rail itself is sticky). */
  rail?: boolean;
  /** The viewer may correct the transcript (saved as a new version; the original is kept). */
  canEdit?: boolean;
}

export function SourcePanel({ recording, transcriptState, onTranscriptStateChange, rail, canEdit }: SourcePanelProps) {
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
    <section aria-labelledby="source-heading" className={cn('flex flex-col gap-5', rail && 'h-full min-h-0')}>
      <div className="shrink-0">
        <h2 id="source-heading" tabIndex={-1} className="font-serif text-[1.2rem] font-semibold text-heritage-deep focus:outline-none">
          {t('source.heading')}
        </h2>
        <p className="mt-1 text-[0.85rem] leading-snug text-ink-soft">{t('source.note')}</p>
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

      {recording && <TranscriptSection recordingId={recording.id} rail={rail} canEdit={canEdit} state={transcriptState} onStateChange={onTranscriptStateChange} />}
    </section>
  );
}

/**
 * The transcript with an optional correction step. A correction is inserted as a new transcripts row, so the
 * original (version 1) is kept and can be shown again (DỰ ÁN.md B8: source kept, edits saved with history).
 */
function TranscriptSection({ recordingId, rail, canEdit, state, onStateChange }: { recordingId: string; rail?: boolean; canEdit?: boolean } & TranscriptControl) {
  const t = useT('review');
  // Controlled by the page so a correction survives the mobile tab switch (TabPanel unmounts) and counts as unsaved.
  const current = state.current;
  const editing = state.draft !== null;
  const text = state.draft ?? '';
  const setText = (draft: string) => onStateChange({ ...state, draft });
  const setEditing = (on: boolean) => onStateChange({ ...state, draft: on ? (current?.text ?? '') : null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [original, setOriginal] = useState<TranscriptRow | null | 'loading' | 'error'>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const corrected = !!current && current.version > 1;

  function startEdit() {
    if (!current) return;
    setError(null);
    setSavedNote(null);
    setShowOriginal(false);
    setEditing(true);
  }

  async function save() {
    const sb = getSupabase();
    if (!sb || !current || saving) return;
    if (text.trim() === '') {
      setError(t('source.edit.emptyError'));
      return;
    }
    if (text === current.text) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await saveTranscript(sb, recordingId, current.version, text);
      onStateChange({ current: next, draft: null });
      setSavedNote(t('source.edit.saved', { v: next.version }));
    } catch (e) {
      setError(t(`errors.${reviewErrorKey(e)}`));
    } finally {
      setSaving(false);
    }
  }

  async function toggleOriginal() {
    if (showOriginal) {
      setShowOriginal(false);
      return;
    }
    setShowOriginal(true);
    if (original && original !== 'error') return;
    const sb = getSupabase();
    if (!sb) return;
    setOriginal('loading');
    try {
      setOriginal(await loadOriginalTranscript(sb, recordingId));
    } catch {
      setOriginal('error');
    }
  }

  const shown = showOriginal ? (original && typeof original === 'object' ? original : null) : current;
  let view: ReactNode;
  if (!current) view = <p className="text-ink-soft">{t('source.noTranscript')}</p>;
  else if (editing)
    view = (
      <div className="flex flex-col gap-3">
        <Field label={t('source.edit.label')} hint={t('source.edit.hint')} error={error ?? undefined}>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="leading-[1.8]" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} loading={saving} leftIcon={<Save className="size-5" aria-hidden="true" />}>
            {t('source.edit.save')}
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            {t('source.edit.cancel')}
          </Button>
        </div>
      </div>
    );
  else if (showOriginal && original === 'loading') view = <Skeleton className="h-40 w-full" />;
  else if (showOriginal && !shown) view = <p role="alert" className="text-ink-soft">{t('source.edit.originalError')}</p>;
  else view = <TranscriptView text={shown!.text} verbatim={showOriginal || !corrected} />;

  return (
    <div className={cn('flex flex-col gap-3', rail && 'min-h-0 flex-1')}>
      <div className="flex shrink-0 flex-col gap-1">
        <h3 id="transcript-heading" className="flex flex-wrap items-baseline gap-x-2 font-semibold text-ink">
          {showOriginal || !corrected ? t('source.transcriptHeading') : t('source.transcriptCorrected')}
          {current && (
            <span className="text-[0.82rem] font-normal text-ink-soft">{t('source.transcriptVersion', { v: showOriginal && shown ? shown.version : current.version })}</span>
          )}
        </h3>
        {current && !editing && (corrected || canEdit) && (
          <div className="-ml-5 flex flex-wrap gap-x-2">
            {canEdit && !showOriginal && (
              <Button variant="ghost" onClick={startEdit} leftIcon={<PencilLine className="size-4" aria-hidden="true" />}>
                {t('source.edit.open')}
              </Button>
            )}
            {corrected && (
              <Button variant="ghost" onClick={() => void toggleOriginal()} aria-pressed={showOriginal}>
                {showOriginal ? t('source.edit.showCurrent') : t('source.edit.showOriginal')}
              </Button>
            )}
          </div>
        )}
        {savedNote && (
          <p role="status" className="text-[0.85rem] font-semibold text-heritage">
            {savedNote}
          </p>
        )}
      </div>
      {rail && current && !editing ? (
        // Scrollable on its own, so it must be reachable by keyboard.
        <div tabIndex={0} role="region" aria-labelledby="transcript-heading" className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl pr-2 text-[0.95rem]">
          {view}
        </div>
      ) : (
        <div className={cn(rail && 'min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2')}>{view}</div>
      )}
    </div>
  );
}
