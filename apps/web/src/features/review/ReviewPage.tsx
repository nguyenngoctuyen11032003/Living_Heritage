import type { AiErrorCode, MemberRole } from '@lh/shared';
import { ArrowLeft, FileQuestion, History, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { StoryScene } from '@/components/illustrations/scenes';
import { Button, ButtonLink, Dialog, EmptyState, Skeleton, Tab, TabList, TabPanel, Tabs, useToast } from '@/components/ui';
import { aiErrorKey, transcribeAndDraft } from '@/features/ai/client';
import { useCurrentFamily } from '@/features/families/current';
import { ShareDialog, StoryStatusBadge } from '@/features/sharing';
import { topicStyle } from '@/features/knowledge/topics';
import { useLocale, usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { RequireAuth, useSession } from '@/lib/session';
import { useApplyTheme } from '@/lib/theme';
import { track } from '@/lib/events';
import { getSupabase } from '@/lib/supabase';
import { ApprovalBar } from './ApprovalBar';
import { ApprovalSection } from './ApprovalSection';
import { canEditDraft, decideApproval, EMPTY_ASSISTED_CONSENT, isAssistedConsentComplete, saveWithdrawal, type AssistedConsent } from './approval';
import { approve, currentVersion, isJobActive, isJobRunning, isJobStale, jobFromResponse, loadReview, saveDraft, type AiJobRow, type ReviewBundle, type ReviewLoad } from './data';
import { DraftEditor } from './DraftEditor';
import { jobErrorCode, reviewErrorKey } from './errors';
import { parseDecade, toSaveArgs } from './fields';
import { ProcessingPanel } from './ProcessingPanel';
import { SourcePanel } from './SourcePanel';
import { transcriptDirty, type TranscriptState } from './transcript';
import { isJustFinished, trackDraftCreated } from './events';
import { useDraftForm } from './useDraftForm';
import { useJobPolling } from './useJobPolling';
import { VersionHistory } from './VersionHistory';

const DESKTOP = '(min-width: 1024px)';
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener?.('change', cb);
      return () => mq.removeEventListener?.('change', cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
}

/** /ban-nhap/:id — reachable by family users and by the anonymous narrator user (own layout, registered as `bare`). */
export default function ReviewPage() {
  return (
    <RequireAuth allowAnonymous>
      <ReviewScreen />
    </RequireAuth>
  );
}

function Shell({ narrator, children }: { narrator: boolean; children: ReactNode }) {
  const t = useT('review');
  const { isAnonymous } = useSession();
  useApplyTheme();
  return (
    <div className={cn('flex min-h-dvh flex-col bg-cream', narrator && 'narrator-mode')}>
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line bg-cream/95 px-4 py-2 md:px-8">
        <Link to={isAnonymous ? '/ke-chuyen' : '/gia-dinh'} className="inline-flex min-h-12 items-center gap-2 rounded-full pr-3 font-semibold text-heritage hover:text-heritage-deep">
          <ArrowLeft className="size-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{isAnonymous ? t('page.backNarrator') : t('page.backFamily')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 md:px-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}

function ReviewScreen() {
  const t = useT('review');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, isAnonymous } = useSession();
  const userId = user?.id ?? null;
  const { locale } = useLocale();
  const { families, loading: familiesLoading } = useCurrentFamily();
  const sb = getSupabase();
  const [load, setLoad] = useState<ReviewLoad | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(async () => {
    if (!sb || !userId) return;
    try {
      const next = await loadReview(sb, id, userId);
      if (next.type === 'redirect') {
        navigate(`/ban-nhap/${next.storyId}`, { replace: true });
        return;
      }
      setLoad(next);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [sb, userId, id, navigate]);

  useEffect(() => {
    setLoad(null);
    void refresh();
  }, [refresh, attempt]);

  const safeHref = isAnonymous ? '/ke-chuyen' : '/gia-dinh';
  const narratorView = isAnonymous || (load?.type === 'story' && load.bundle.isNarratorUser);

  let content: ReactNode;
  if (!sb) {
    content = <EmptyState icon={<WifiOff />} title={t('page.errorTitle')} description={t('page.notConfigured')} />;
  } else if (loadError) {
    content = (
      <EmptyState
        icon={<WifiOff />}
        title={t('page.errorTitle')}
        description={t('page.errorBody')}
        action={
          <Button onClick={() => setAttempt((n) => n + 1)} size="lg">
            {t('page.retry')}
          </Button>
        }
      />
    );
  } else if (!load || (load.type === 'story' && !isAnonymous && familiesLoading)) {
    content = (
      <div aria-busy="true" className="flex flex-col gap-6">
        <span className="sr-only" role="status">
          {t('page.loading')}
        </span>
        <Skeleton className="h-10 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  } else if (load.type === 'not_found' || load.type === 'redirect') {
    content = (
      <EmptyState
        icon={<FileQuestion />}
        title={t('page.notFoundTitle')}
        description={t('page.notFoundBody')}
        action={
          <ButtonLink to={safeHref} size="lg">
            {t('page.goSafe')}
          </ButtonLink>
        }
      />
    );
  } else if (load.type === 'recording') {
    content = <RecordingProcessing key={load.recording.id} recordingId={load.recording.id} initialJob={load.job} locale={locale} />;
  } else {
    const role: MemberRole | null = families.find((f) => f.id === load.bundle.story.family_id)?.role ?? null;
    content = <StoryReview key={load.bundle.story.id} bundle={load.bundle} role={role} onReload={refresh} />;
  }

  return <Shell narrator={narratorView}>{content}</Shell>;
}

/** The id is a recording without stories yet: show progress, poll ai_jobs and open the draft when it exists. */
function RecordingProcessing({ recordingId, initialJob, locale }: { recordingId: string; initialJob: AiJobRow | null; locale: 'vi' | 'en' }) {
  const navigate = useNavigate();
  const t = useT('review');
  const { isAnonymous } = useSession();
  const [job, setJob] = useState<AiJobRow | null>(initialJob);
  const [retrying, setRetrying] = useState(false);
  const [aiError, setAiError] = useState<AiErrorCode | null>(null);

  const openFirst = useCallback(
    (ids: string[]) => {
      const target = ids[0];
      if (target) navigate(`/ban-nhap/${target}`, { replace: true });
    },
    [navigate],
  );

  const onJob = useCallback(
    (j: AiJobRow | null) => {
      setJob(j);
      if (j?.status === 'done') {
        trackDraftCreated(j.story_ids);
        openFirst(j.story_ids);
      }
    },
    [openFirst],
  );
  useJobPolling(recordingId, retrying || isJobRunning(job), onJob);

  async function retry() {
    setRetrying(true);
    setAiError(null);
    try {
      const res = await transcribeAndDraft(recordingId, locale);
      // Follow the job the server is running (a concurrent call may already be transcribing it).
      setJob(jobFromResponse(res));
      if (res.story_ids.length > 0) {
        if (res.status === 'done') trackDraftCreated(res.story_ids);
        openFirst(res.story_ids);
        return;
      }
      if (res.error) setAiError(res.error);
    } catch (e) {
      setAiError(aiErrorKey(e));
    } finally {
      setRetrying(false);
    }
  }

  const status = job?.status ?? null;
  // A job stuck in progress (the function died) is offered as a retryable error; the server restarts stale jobs.
  const errorCode = aiError ?? (status === 'error' ? jobErrorCode(job?.error ?? null) : isJobStale(job) ? 'ai_unavailable' : null);
  // Loaded as "no stories yet" while the job is already done: its drafts were deleted. ai-process answers a done job
  // with the same (deleted) ids, so a retry cannot help; show a clear way out instead of "opening the draft…" forever.
  const orphaned = initialJob?.status === 'done' && status === 'done';
  return (
    <ProcessingPanel
      status={status}
      errorCode={retrying ? null : errorCode}
      retrying={retrying}
      onRetry={() => void retry()}
      orphaned={orphaned ? { backHref: isAnonymous ? '/ke-chuyen' : '/gia-dinh', backLabel: isAnonymous ? t('page.backNarrator') : t('page.backFamily') } : undefined}
    />
  );
}

function StoryReview({ bundle, role, onReload }: { bundle: ReviewBundle; role: MemberRole | null; onReload: () => Promise<void> }) {
  const t = useT('review');
  const pick = usePick();
  const { locale } = useLocale();
  const { toast } = useToast();
  const isDesktop = useIsDesktop();
  const { story, narrator, topic, recording, transcript, siblings, isNarratorUser } = bundle;
  const sb = getSupabase();

  const { form, setForm, dirty } = useDraftForm(story);
  const [transcriptState, setTranscriptState] = useState<TranscriptState>({ current: transcript, draft: null });
  // Reset only when another transcript version arrives (a reload after a draft save must not wipe a correction in progress).
  const transcriptKey = transcript?.id ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the row id on purpose
  useEffect(() => setTranscriptState({ current: transcript, draft: null }), [transcriptKey]);
  // Leaving the page loses both unsaved draft edits and an unsaved transcript correction.
  const unsaved = dirty || transcriptDirty(transcriptState);

  const [busy, setBusy] = useState<null | 'save' | 'approve'>(null);
  const [errors, setErrors] = useState<{ title?: string; decade?: string }>({});
  /** The public-withdrawal warning is open; the value is what to do after saving. */
  const [publicWarn, setPublicWarn] = useState<null | { kind: 'public' | 'pending'; then: 'stay' | 'leave'; expectedVersion?: number }>(null);
  // Kept after closing so the dialog text does not switch during its exit animation.
  const [warnKind, setWarnKind] = useState<'public' | 'pending'>('public');
  const [conflict, setConflict] = useState(false);
  const navigate = useNavigate();
  const { isAnonymous } = useSession();
  const safeHref = isAnonymous ? '/ke-chuyen' : '/gia-dinh';
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const [consent, setConsent] = useState<AssistedConsent>(EMPTY_ASSISTED_CONSENT);
  const approvalHintId = useId();
  const [tab, setTab] = useState('draft');
  const [job, setJob] = useState<AiJobRow | null>(bundle.job);

  const canEdit = canEditDraft(isNarratorUser, role);
  const mode = decideApproval({ editStatus: story.edit_status, isNarratorUser, role, narratorBound: narrator ? narrator.user_id !== null : null });

  // A re-run of the AI job for this recording: show progress and reload when it finishes.
  const onJob = useCallback(
    (j: AiJobRow | null) => {
      setJob(j);
      if (j?.status === 'done') trackDraftCreated(j.story_ids);
      if (j && !isJobActive(j)) void onReload();
    },
    [onReload],
  );
  useJobPolling(recording?.id ?? null, isJobRunning(job), onJob);
  // Opened straight from the recorder (the AI call finished there): a just-finished job counts as "draft created" once.
  useEffect(() => {
    const j = bundle.job;
    if (j?.status === 'done' && isJustFinished(j.updated_at)) trackDraftCreated(j.story_ids);
  }, [bundle.job]);

  // Unsaved-changes guard: in-app navigation and tab close / reload.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      ((dirty && !leaving.current) || transcriptDirty(transcriptState)) && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [unsaved]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (form.title.trim() === '') next.title = t('editor.titleRequired');
    if (!parseDecade(form.decade).ok) next.decade = t('editor.decadeInvalid');
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setTab('draft');
      return false;
    }
    return true;
  }

  // Synchronous double-submit guard: `busy` state only updates on the next render, so a fast second click
  // (or the public-warning confirm pressed twice) would otherwise start a second save / version.
  const inFlight = useRef(false);
  // Set right before navigating away after a "save for later", so the unsaved-changes guard does not block it.
  const leaving = useRef(false);

  /** `then: 'leave'` = "Lưu để xem sau": save if needed, then go back to the vault / my stories. */
  // `expectedVersion`: after a conflict, "overwrite" saves against the newest version on purpose (the user was warned).
  async function save(opts: { confirmedPublic?: boolean; then?: 'leave'; expectedVersion?: number } = {}) {
    if (!sb || inFlight.current) return;
    if (opts.then === 'leave' && !dirty) {
      leaving.current = true;
      navigate(safeHref);
      return;
    }
    if (!validate()) return;
    const withdrawal = saveWithdrawal(story.visibility, bundle.pendingPublish);
    if (withdrawal && !opts.confirmedPublic) {
      setWarnKind(withdrawal);
      setPublicWarn({ kind: withdrawal, then: opts.then ?? 'stay', expectedVersion: opts.expectedVersion });
      return;
    }
    setPublicWarn(null);
    inFlight.current = true;
    setBusy('save');
    try {
      const v = await saveDraft(sb, story.id, toSaveArgs(story.kind, form, story.fields, story.topic_id), story.visibility === 'public', opts.expectedVersion ?? story.current_version);
      track('draft_edit');
      toast({ title: mode === 'send_to_narrator' ? t('approval.sent') : t('editor.saved', { v }), tone: 'success' });
      if (opts.then === 'leave') {
        leaving.current = true;
        navigate(safeHref);
        return;
      }
      await onReload();
    } catch (e) {
      const key = reviewErrorKey(e);
      // Someone else saved meanwhile: keep the local edits on screen and let the user decide (no silent overwrite).
      if (key === 'stale_version') setConflict(true);
      else toast({ title: t(`errors.${key}`), tone: 'error' });
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  /** Conflict → "keep my version": save over the newest version deliberately (otherwise every retry conflicts again). */
  async function overwrite() {
    if (!sb || inFlight.current) return;
    try {
      const latest = await currentVersion(sb, story.id);
      setConflict(false);
      await save({ expectedVersion: latest });
    } catch (e) {
      toast({ title: t(`errors.${reviewErrorKey(e)}`), tone: 'error' });
    }
  }

  async function doApprove(assisted: boolean) {
    if (!sb || inFlight.current) return;
    if (assisted && !isAssistedConsentComplete(consent)) return;
    inFlight.current = true;
    setBusy('approve');
    try {
      await approve(sb, story.id, assisted && consent.method ? { method: consent.method, relation: consent.relation } : null, story.current_version);
      track('approve');
      setJustApproved(true);
      await onReload();
    } catch (e) {
      const key = reviewErrorKey(e);
      toast({ title: t(`errors.${key}`), tone: 'error' });
      // The text changed since it was read: show the newest version instead of approving unseen content.
      if (key === 'stale_version') await onReload();
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  // Only while the re-run is alive: a stale job must not hide an existing draft behind a spinner forever.
  if (isJobRunning(job)) {
    return <ProcessingPanel status={job!.status} errorCode={null} retrying={false} onRetry={() => {}} />;
  }

  const sibling = siblings[0];
  const visual = topicStyle(topic?.slug);
  const topicTitle = topic ? pick({ vi: topic.title_vi, en: topic.title_en }) : null;
  const topicOptions = bundle.topics.map((x) => ({ id: x.id, title: pick({ vi: x.title_vi, en: x.title_en }) }));
  const approvedAt = story.approved_at && story.edit_status === 'approved' ? formatDate(story.approved_at, locale) : null;

  function backToSource() {
    if (!isDesktop) setTab('source');
    requestAnimationFrame(() => {
      const el = document.getElementById('source-heading');
      if (!el) return;
      el.scrollIntoView?.({ block: 'start' });
      el.focus({ preventScroll: true });
    });
  }

  // Desktop: a quieter sticky side rail (player at the top, the transcript scrolls inside it).
  const source = isDesktop ? (
    <aside className="sticky top-6 flex max-h-[calc(100dvh-7.5rem)] flex-col rounded-[1.75rem] bg-paper/55 p-5 ring-1 ring-line/80">
      <SourcePanel recording={recording} transcriptState={transcriptState} onTranscriptStateChange={setTranscriptState} rail canEdit={canEdit} />
    </aside>
  ) : (
    <div className="rounded-[1.75rem] bg-paper/55 p-4 ring-1 ring-line/80">
      <SourcePanel recording={recording} transcriptState={transcriptState} onTranscriptStateChange={setTranscriptState} canEdit={canEdit} />
    </div>
  );
  // The story text is the hero: a wide paper sheet with a comfortable serif editor.
  const draft = (
    <section aria-labelledby="draft-heading" className="flex flex-col gap-4 rounded-[2rem] bg-paper px-5 py-6 shadow-[0_18px_40px_-32px_rgba(18,27,24,0.45)] ring-1 ring-line/80 md:px-10 md:py-9">
      <h2 id="draft-heading" className="text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {t('editor.heading')}
      </h2>
      {!canEdit && <p className="rounded-2xl bg-cream p-3 text-[0.92rem] text-ink-soft">{t('page.readOnly')}</p>}
      <DraftEditor kind={story.kind} form={form} onChange={setForm} readOnly={!canEdit} errors={errors} topic={topicTitle} topics={topicOptions} />
    </section>
  );
  const approvalSection = (
    <ApprovalSection
      mode={mode}
      canEdit={canEdit}
      dirty={dirty}
      consent={consent}
      onConsentChange={setConsent}
      justApproved={justApproved}
      approvedAt={approvedAt}
      onShare={() => setShareOpen(true)}
      onBackToSource={backToSource}
      onSaveLater={() => void save({ then: 'leave' })}
      saving={busy === 'save'}
      describedById={approvalHintId}
      narratorMode={isNarratorUser}
    />
  );

  // Slim sticky bar. Desktop: inside the draft column, so it is no wider than the content and never covers the source rail.
  const approvalBar = (
    <ApprovalBar
      mode={mode}
      canEdit={canEdit}
      dirty={dirty}
      waiting={story.edit_status === 'pending_review'}
      busy={busy}
      consent={isAssistedConsentComplete(consent)}
      onSave={() => void save()}
      onApprove={(assisted) => void doApprove(assisted)}
      describedBy={approvalHintId}
      narratorMode={isNarratorUser}
      inColumn={isDesktop}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="overflow-hidden rounded-[2rem] ring-1 ring-line/80" style={{ background: visual.band, color: visual.ink }}>
        <div className="grid items-stretch md:grid-cols-[1fr_200px]">
          <div className="flex min-w-0 flex-col gap-3 p-6 md:p-9">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] opacity-85">
              {topicTitle ? `${topicTitle} · ${t(`page.kind.${story.kind}`)}` : t(`page.kind.${story.kind}`)}
            </p>
            <h1 className="min-w-0 font-serif text-[clamp(1.7rem,4vw,2.5rem)] font-semibold text-balance leading-[1.18] [overflow-wrap:anywhere]">{story.title || t('page.title')}</h1>
            {narrator && <p className="font-serif text-[1.05rem] italic opacity-90">{t('page.narratorBy', { name: narrator.display_name })}</p>}
          </div>
          <div className="hidden h-full min-h-44 md:block" aria-hidden="true">
            <StoryScene kind={visual.scene} />
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.92rem] text-ink-soft">
          <StoryStatusBadge editStatus={story.edit_status} visibility={story.visibility} showScope />
          {approvedAt && <span>{t('approval.approvedAt', { date: approvedAt })}</span>}
        </div>
        <Button variant="secondary" onClick={() => setHistoryOpen(true)} leftIcon={<History className="size-5" aria-hidden="true" />}>
          {t('history.open')}
        </Button>
      </div>
      {sibling && (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-paper px-4 py-2 text-[0.92rem] ring-1 ring-line">
          {t(`page.sibling.${sibling.kind}`)}
          <Link to={`/ban-nhap/${sibling.id}`} className="font-semibold text-heritage underline underline-offset-4">
            {t('page.sibling.open')}
          </Link>
        </p>
      )}

      {isDesktop ? (
        <div className="grid grid-cols-12 items-start gap-8">
          <div className="col-span-4 self-stretch">{source}</div>
          <div className="col-span-8 flex min-w-0 flex-col gap-8">
            {draft}
            {approvalSection}
            {approvalBar}
          </div>
        </div>
      ) : (
        <>
          <Tabs value={tab} defaultValue="draft" onValueChange={setTab}>
            <TabList label={t('tabs.label')} className="mb-4 flex w-full">
              <Tab value="source" className="flex-1 justify-center">
                {t('tabs.source')}
              </Tab>
              <Tab value="draft" className="flex-1 justify-center">
                {t('tabs.draft')}
              </Tab>
            </TabList>
            <TabPanel value="source">{source}</TabPanel>
            <TabPanel value="draft">{draft}</TabPanel>
          </Tabs>
          {approvalSection}
        </>
      )}

      {!isDesktop && approvalBar}

      <VersionHistory open={historyOpen} onClose={() => setHistoryOpen(false)} storyId={story.id} kind={story.kind} currentVersion={story.current_version} />
      <ShareDialog storyId={story.id} open={shareOpen} onClose={() => setShareOpen(false)} onChanged={() => void onReload()} />

      <Dialog
        open={publicWarn !== null}
        onClose={() => setPublicWarn(null)}
        title={warnKind === 'pending' ? t('editor.pendingWarnTitle') : t('editor.publicWarnTitle')}
        description={warnKind === 'pending' ? t('editor.pendingWarnBody') : t('editor.publicWarnBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublicWarn(null)}>
              {t('editor.stay')}
            </Button>
            <Button variant="terracotta" loading={busy === 'save'} onClick={() => void save({ confirmedPublic: true, then: publicWarn?.then === 'leave' ? 'leave' : undefined, expectedVersion: publicWarn?.expectedVersion })}>
              {warnKind === 'pending' ? t('editor.pendingWarnConfirm') : t('editor.publicWarnConfirm')}
            </Button>
          </>
        }
      />

      <Dialog
        open={conflict}
        onClose={() => setConflict(false)}
        title={t('editor.conflictTitle')}
        description={t('editor.conflictBody')}
        footer={
          <>
            <Button variant="secondary" loading={busy === 'save'} onClick={() => void overwrite()}>
              {t('editor.conflictKeep')}
            </Button>
            <Button
              onClick={() => {
                setConflict(false);
                void onReload();
              }}
            >
              {t('editor.conflictReload')}
            </Button>
          </>
        }
      />

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title={t('editor.leaveTitle')}
        description={t('editor.leaveBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.proceed?.()}>
              {t('editor.leave')}
            </Button>
            <Button onClick={() => blocker.reset?.()}>{t('editor.stay')}</Button>
          </>
        }
      />
    </div>
  );
}
