import type { MemberRole } from '@lh/shared';
import { AlertTriangle, Globe2, Lock, Users } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, Dialog, Skeleton, useToast } from '@/components/ui';
import { useCurrentFamily } from '@/features/families/current';
import { reviewErrorKey } from '@/features/review/errors';
import { ExperienceSections } from '@/features/knowledge/components/ExperienceSections';
import { findTopic, useTopics } from '@/features/knowledge/topics';
import { useLocale, usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { track } from '@/lib/events';
import { getSupabase } from '@/lib/supabase';
import { loadPreview, loadShareState, requestPublish, saveToggles, setVisibility, withdrawPublic, type PublicPreview, type ShareState } from './data';
import { canSubmitRequest, canWithdraw, currentChoice, togglePublishable, SHARE_CHOICES, shareOptions, toggleNeedsNewRequest, type ShareChoice, type ShareContext, type ShareToggles } from './rules';
import { StoryStatusBadge } from './StoryStatusBadge';

export interface ShareDialogProps {
  storyId: string;
  open: boolean;
  onClose: () => void;
  /** Called after visibility, share settings, a request or a withdrawal changed. */
  onChanged?: () => void;
}

const choiceIcon: Record<ShareChoice, ReactNode> = { private: <Lock />, family: <Users />, request_publish: <Globe2 /> };
const TOGGLES = [
  ['show_audio', 'audio'],
  ['show_real_name', 'realName'],
  ['show_region', 'region'],
  ['show_photos', 'photos'],
] as const;

/** "Nơi lưu và chia sẻ": Chỉ mình tôi / Người được mời / Đề nghị công bố, per-part toggles, exact public preview, withdraw. */
export function ShareDialog({ storyId, open, onClose, onChanged }: ShareDialogProps) {
  const t = useT('review');
  return (
    <Dialog open={open} onClose={onClose} title={t('share.title')} description={t('share.description')} size="lg" footer={<Button variant="secondary" onClick={onClose}>{t('share.close')}</Button>}>
      {open && <ShareBody storyId={storyId} onChanged={onChanged} />}
    </Dialog>
  );
}

function ShareBody({ storyId, onChanged }: { storyId: string; onChanged?: () => void }) {
  const t = useT('review');
  const tv = useT('vault');
  const { locale } = useLocale();
  const { toast } = useToast();
  const { families } = useCurrentFamily();
  const sb = getSupabase();
  const [state, setState] = useState<ShareState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [choice, setChoice] = useState<ShareChoice>('private');
  const [busy, setBusy] = useState<null | 'scope' | 'toggle' | 'submit' | 'withdraw'>(null);
  const [preview, setPreview] = useState<PublicPreview | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [ack, setAck] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [toggleNote, setToggleNote] = useState(false);
  const [status, setStatus] = useState('');
  const reasonId = useId();

  // Keyed on the role values (not the array identity) so a re-render of the family context does not reload the dialog.
  const rolesKey = families.map((f) => `${f.id}:${f.role}`).join(',');
  const roleFor = useCallback(
    (familyId: string): MemberRole | null => {
      const hit = rolesKey.split(',').find((p) => p.startsWith(`${familyId}:`));
      return hit ? (hit.slice(familyId.length + 1) as MemberRole) : null;
    },
    [rolesKey],
  );

  const reload = useCallback(async () => {
    if (!sb) return;
    try {
      const next = await loadShareState(sb, storyId, roleFor);
      setState(next);
      setLoadError(false);
      return next;
    } catch {
      setLoadError(true);
      return null;
    }
  }, [sb, storyId, roleFor]);

  useEffect(() => {
    let alive = true;
    void reload().then((next) => {
      if (alive && next) setChoice(currentChoice({ visibility: next.story.visibility, requestStatus: next.request?.status ?? null }));
    });
    return () => {
      alive = false;
    };
  }, [reload]);

  const ctx: ShareContext | null = useMemo(
    () =>
      state && {
        editStatus: state.story.edit_status,
        visibility: state.story.visibility,
        canWrite: state.canWrite,
        canPublish: state.canPublish,
        requestStatus: state.request?.status ?? null,
      },
    [state],
  );

  const refreshPreview = useCallback(async () => {
    if (!sb) return;
    setPreviewState('loading');
    try {
      setPreview(await loadPreview(sb, storyId));
      setPreviewState('idle');
    } catch {
      setPreviewState('error');
    }
  }, [sb, storyId]);

  const showPublish = choice === 'request_publish' && !!state;
  useEffect(() => {
    if (showPublish && state?.canWrite) void refreshPreview();
    // Refresh the preview whenever the dialog shows the publish section or the toggles change.
  }, [showPublish, state?.canWrite, state?.toggles, refreshPreview]);

  if (!sb) return <p className="py-4 text-ink-soft">{t('page.notConfigured')}</p>;
  if (loadError)
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-4">
        <p>{t('share.loadError')}</p>
        <Button variant="secondary" onClick={() => void reload()}>
          {t('page.retry')}
        </Button>
      </div>
    );
  if (!state || !ctx)
    return (
      <div aria-busy="true" className="flex flex-col gap-3 py-2">
        <span className="sr-only">{t('share.loading')}</span>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );

  const options = shareOptions(ctx);
  const current = currentChoice(ctx);
  const fail = (e: unknown) => toast({ title: t(`errors.${reviewErrorKey(e)}`), tone: 'error' });
  const done = (msg: string) => {
    setStatus(msg);
    toast({ title: msg, tone: 'success' });
    onChanged?.();
  };

  async function saveScope() {
    if (!sb || !state || (choice !== 'private' && choice !== 'family')) return;
    setBusy('scope');
    try {
      if (state.request?.status === 'pending' && state.canPublish) await withdrawPublic(sb, storyId);
      await setVisibility(sb, storyId, choice);
      // B17: sharing with the invited family is a share request; going back to private is un-sharing.
      if (choice === 'family') track('share_request');
      await reload();
      done(t('share.scopeSaved'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function changeToggle(key: keyof ShareToggles, value: boolean) {
    if (!sb || !state) return;
    const next = { ...state.toggles, [key]: value };
    setBusy('toggle');
    try {
      await saveToggles(sb, storyId, next, key === 'show_audio' && !value && state.story.visibility === 'public');
      setToggleNote(toggleNeedsNewRequest(state.story.visibility, state.toggles[key], value));
      await reload();
      done(t('share.toggleSaved'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!sb) return;
    setBusy('submit');
    try {
      await requestPublish(sb, storyId);
      track('share_request');
      setAck(false);
      setToggleNote(false);
      await reload();
      done(t('share.submitted'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function withdraw() {
    if (!sb) return;
    setBusy('withdraw');
    try {
      await withdrawPublic(sb, storyId);
      setConfirmWithdraw(false);
      const next = await reload();
      if (next) setChoice(currentChoice({ visibility: next.story.visibility, requestStatus: next.request?.status ?? null }));
      done(t('share.withdraw.done'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-2">
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      <StoryStatusBadge editStatus={state.story.edit_status} visibility={state.story.visibility} showScope />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-[0.95rem] font-semibold text-ink">{t('share.options.label')}</legend>
        {SHARE_CHOICES.map((c) => {
          const opt = options[c];
          const selected = choice === c;
          const descId = `${reasonId}-${c}`;
          return (
            <label
              key={c}
              className={cn(
                'relative flex cursor-pointer items-start gap-4 rounded-[1.25rem] p-4 ring-1 transition-[box-shadow,background-color] focus-within:ring-2 focus-within:ring-heritage sm:p-5',
                selected ? 'bg-mint/50 ring-2 ring-heritage' : 'bg-paper ring-line-strong hover:ring-heritage/50',
                !opt.enabled && 'cursor-not-allowed opacity-70',
              )}
            >
              <input
                type="radio"
                name={`${reasonId}-share`}
                value={c}
                checked={selected}
                disabled={!opt.enabled && c !== current}
                aria-describedby={descId}
                onChange={() => setChoice(c)}
                className="mt-1.5 size-5 shrink-0 accent-heritage"
              />
              <span aria-hidden="true" className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream text-heritage [&>svg]:size-5">
                {choiceIcon[c]}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  {t(`share.options.${c}.title`)}
                  {c === current && (
                    <Badge size="sm" tone="outline">
                      {t('share.current')}
                    </Badge>
                  )}
                </span>
                <span id={descId} className="text-[0.92rem] leading-relaxed text-ink-soft">
                  {t(`share.options.${c}.body`)}
                  {!opt.enabled && opt.reason && <span className="mt-1 block font-medium text-terracotta">{t(`share.reasons.${opt.reason}`)}</span>}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {(choice === 'private' || choice === 'family') && choice !== current && options[choice].enabled && (
        <div>
          <Button onClick={() => void saveScope()} loading={busy === 'scope'}>
            {t('share.saveScope')}
          </Button>
        </div>
      )}

      {showPublish && (
        <section className="flex flex-col gap-5" aria-labelledby={`${reasonId}-parts`}>
          <div>
            <h3 id={`${reasonId}-parts`} className="font-serif text-[1.2rem] font-semibold text-heritage-deep">
              {t('share.publicParts')}
            </h3>
            <p className="mt-1 text-[0.92rem] text-ink-soft">{t('share.publicPartsLead')}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {TOGGLES.map(([key, label]) => {
              // Public pages cannot show family photos yet (public_items has no photo column): the switch stays off and
              // locked, with the reason, so nobody believes photos will be published.
              const unavailable = !togglePublishable(key);
              const on = unavailable ? false : state.toggles[key];
              return (
                <li key={key}>
                  <label
                    className={cn(
                      'flex min-h-12 items-start gap-3 rounded-2xl bg-paper p-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-heritage',
                      unavailable ? 'cursor-not-allowed bg-cream' : 'cursor-pointer',
                    )}
                  >
                    <input
                      type="checkbox"
                      role="switch"
                      checked={on}
                      aria-checked={on}
                      disabled={unavailable || !state.canWrite || busy !== null}
                      onChange={(e) => void changeToggle(key, e.target.checked)}
                      className="mt-1 size-5 shrink-0 accent-heritage"
                    />
                    <span className="flex flex-col">
                      <span className={cn('font-semibold', unavailable && 'text-ink-soft')}>{t(`share.toggles.${label}.label`)}</span>
                      <span className="text-[0.88rem] text-ink-soft">{unavailable ? tv('sharing.photosUnavailable') : t(`share.toggles.${label}.hint`)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {toggleNote && (
            <p role="status" className="rounded-2xl bg-warning-bg p-3 text-[0.92rem] text-warning-fg">
              {t('share.toggleOnPublic')}
            </p>
          )}

          {state.canWrite && <PreviewCard preview={preview} state={previewState} onRetry={() => void refreshPreview()} />}

          <RequestStatus request={state.request} locale={locale} />

          {canSubmitRequest(ctx) && (
            <div className="flex flex-col gap-3 rounded-[1.25rem] bg-cream p-4 ring-1 ring-line">
              <p className="flex gap-2 text-[0.95rem] leading-relaxed">
                <AlertTriangle aria-hidden="true" className="mt-1 size-5 shrink-0 text-terracotta" />
                <span>{t('share.recallWarning')}</span>
              </p>
              <label className="flex min-h-12 cursor-pointer items-start gap-3">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 size-5 shrink-0 accent-heritage" />
                <span>{t('share.recallAck')}</span>
              </label>
              <div>
                <Button onClick={() => void submit()} disabled={!ack} loading={busy === 'submit'} leftIcon={<Globe2 className="size-5" aria-hidden="true" />}>
                  {t('share.submit')}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {canWithdraw(ctx) && (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          {!confirmWithdraw ? (
            <div>
              <Button variant="secondary" onClick={() => setConfirmWithdraw(true)}>
                {t('share.withdraw.button')}
              </Button>
            </div>
          ) : (
            <div role="alertdialog" aria-labelledby={`${reasonId}-wd`} aria-describedby={`${reasonId}-wdb`} className="flex flex-col gap-3 rounded-[1.25rem] bg-terracotta/5 p-4 ring-1 ring-terracotta/30">
              <p id={`${reasonId}-wd`} className="font-semibold text-terracotta">
                {t('share.withdraw.confirmTitle')}
              </p>
              <p id={`${reasonId}-wdb`} className="text-[0.95rem] leading-relaxed">
                {t('share.withdraw.confirmBody')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="terracotta" onClick={() => void withdraw()} loading={busy === 'withdraw'}>
                  {t('share.withdraw.confirm')}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmWithdraw(false)}>
                  {t('share.withdraw.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestStatus({ request, locale }: { request: ShareState['request']; locale: 'vi' | 'en' }) {
  const t = useT('review');
  return (
    <div className="rounded-[1.25rem] bg-paper p-4 ring-1 ring-line" aria-live="polite">
      <p className="text-[0.85rem] font-semibold uppercase tracking-wide text-ink-soft">{t('share.request.heading')}</p>
      {!request ? (
        <p className="mt-1">{t('share.request.none')}</p>
      ) : (
        <div className="mt-1 flex flex-col gap-1">
          <p className="font-semibold">{t(`share.request.${request.status}`)}</p>
          <p className="text-[0.9rem] text-ink-soft">{t('share.request.sentAt', { date: formatDate(request.requested_at, locale) })}</p>
          {request.note && <p className="text-[0.9rem]">{t('share.request.note', { note: request.note })}</p>}
        </div>
      )}
    </div>
  );
}

function PreviewCard({ preview, state, onRetry }: { preview: PublicPreview | null; state: 'idle' | 'loading' | 'error'; onRetry: () => void }) {
  const t = useT('review');
  const tv = useT('vault');
  const pick = usePick();
  const topics = useTopics();
  if (state === 'error')
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-[1.25rem] p-4 ring-1 ring-line">
        <p>{t('share.preview.error')}</p>
        <Button variant="secondary" onClick={onRetry}>
          {t('page.retry')}
        </Button>
      </div>
    );
  if (!preview)
    return (
      <div aria-busy="true">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  const region = preview.region === 'bac' || preview.region === 'trung' || preview.region === 'nam' ? t(`share.preview.regions.${preview.region}`) : t('share.preview.hidden');
  const topic = findTopic(topics, preview.topic_slug);
  return (
    <figure className="overflow-hidden rounded-2xl bg-paper ring-1 ring-heritage/30" aria-labelledby="share-preview-title">
      <figcaption id="share-preview-title" className="bg-mint/60 px-5 py-3 text-[0.88rem] font-semibold text-heritage-deep">
        {t('share.preview.title')}
      </figcaption>
      <div className="flex flex-col gap-3 p-5">
        <p className="font-serif text-[1.3rem] font-semibold leading-snug text-heritage-deep">{preview.title}</p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-[0.9rem] sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-ink-soft">{t('share.preview.narrator')}:</dt>
            <dd className="font-medium">{preview.narrator_label}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">{t('share.preview.region')}:</dt>
            <dd className="font-medium">{region}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">{t('share.preview.decade')}:</dt>
            <dd className="font-medium">{preview.decade ?? t('share.preview.hidden')}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">{t('share.preview.audio')}:</dt>
            <dd className="font-medium">{preview.audio_allowed ? t('share.preview.audioOn') : t('share.preview.audioOff')}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">{tv('sharing.preview.topic')}:</dt>
            <dd className="font-medium">{topic ? pick(topic.title) : t('share.preview.hidden')}</dd>
          </div>
          <div className="flex gap-2">
            {/* Public pages never carry family photos (public_items has no photo column), whatever the toggle says. */}
            <dt className="text-ink-soft">{tv('sharing.preview.photos')}:</dt>
            <dd className="font-medium">{tv('sharing.preview.photosNone')}</dd>
          </div>
        </dl>
        {preview.summary && <p className="leading-relaxed">{preview.summary}</p>}
        {/* The whole text, scrollable: the preview shows exactly what outsiders will read, not a clipped excerpt.
            Experience cards use the public page's own ExperienceSections, so empty parts read "Chưa có thông tin" there too. */}
        <div tabIndex={0} role="region" aria-label={tv('sharing.preview.body')} className="max-h-80 overflow-y-auto rounded-xl focus-visible:outline-2 focus-visible:outline-heritage">
          {preview.kind === 'story' ? (
            <p className="whitespace-pre-line leading-relaxed text-ink">{preview.body}</p>
          ) : (
            <ExperienceSections fields={preview.fields} headingLevel="h3" />
          )}
        </div>
      </div>
    </figure>
  );
}
