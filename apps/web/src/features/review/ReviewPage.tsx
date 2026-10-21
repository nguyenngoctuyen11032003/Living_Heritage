import type { AiErrorCode, MemberRole } from '@lh/shared';
import { ArrowLeft, CheckCircle2, FileQuestion, History, Share2, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { TextScaleSwitch } from '@/components/layout/TextScaleSwitch';
import { Badge, Button, ButtonLink, Card, Dialog, EmptyState, Skeleton, Tab, TabList, TabPanel, Tabs, useToast } from '@/components/ui';
import { aiErrorKey, transcribeAndDraft } from '@/features/ai/client';
import { useCurrentFamily } from '@/features/families/current';
import { ShareDialog, StoryStatusBadge } from '@/features/sharing';
import { useLocale, usePick, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { RequireAuth, useSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { ApprovalBar } from './ApprovalBar';
import { canEditDraft, decideApproval } from './approval';
import { approve, isJobActive, loadReview, saveDraft, type AiJobRow, type ReviewBundle, type ReviewLoad } from './data';
import { DraftEditor } from './DraftEditor';
import { jobErrorCode, reviewErrorKey } from './errors';
import { formFromStory, formsEqual, parseDecade, toSaveArgs, type DraftForm } from './fields';
import { ProcessingPanel } from './ProcessingPanel';
import { SourcePanel } from './SourcePanel';
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
  return (
    <div className={cn('flex min-h-dvh flex-col bg-cream', narrator && 'narrator-mode')}>
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line bg-cream/95 px-4 py-2 md:px-8">
        <Link to={isAnonymous ? '/ke-chuyen' : '/gia-dinh'} className="inline-flex min-h-12 items-center gap-2 rounded-full pr-3 font-semibold text-heritage hover:text-heritage-deep">
          <ArrowLeft className="size-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{isAnonymous ? t('page.backNarrator') : t('page.backFamily')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <TextScaleSwitch />
          <LanguageSwitch />
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
      if (j?.status === 'done') openFirst(j.story_ids);
    },
    [openFirst],
  );
  useJobPolling(recordingId, retrying || isJobActive(job), onJob);

  async function retry() {
    setRetrying(true);
    setAiError(null);
    try {
      const res = await transcribeAndDraft(recordingId, locale);
      if (res.story_ids.length > 0) {
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
  const errorCode = aiError ?? (status === 'error' ? jobErrorCode(job?.error ?? null) : null);
  return <ProcessingPanel status={status} errorCode={retrying ? null : errorCode} retrying={retrying} onRetry={() => void retry()} />;
}

function StoryReview({ bundle, role, onReload }: { bundle: ReviewBundle; role: MemberRole | null; onReload: () => Promise<void> }) {
  const t = useT('review');
  const pick = usePick();
  const { locale } = useLocale();
  const { toast } = useToast();
  const isDesktop = useIsDesktop();
  const { story, narrator, topic, recording, transcript, siblings, isNarratorUser } = bundle;
  const sb = getSupabase();

  const baseline = useMemo(() => formFromStory(story), [story]);
  const [form, setForm] = useState<DraftForm>(baseline);
  useEffect(() => setForm(baseline), [baseline]);
  const dirty = !formsEqual(form, baseline);

  const [busy, setBusy] = useState<null | 'save' | 'approve'>(null);
  const [errors, setErrors] = useState<{ title?: string; decade?: string }>({});
  const [publicWarn, setPublicWarn] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const [tab, setTab] = useState('draft');
  const [job, setJob] = useState<AiJobRow | null>(bundle.job);

  const canEdit = canEditDraft(isNarratorUser, role);
  const mode = decideApproval({ editStatus: story.edit_status, isNarratorUser, role, narratorBound: narrator ? narrator.user_id !== null : null });

  // A re-run of the AI job for this recording: show progress and reload when it finishes.
  const onJob = useCallback(
    (j: AiJobRow | null) => {
      setJob(j);
      if (j && !isJobActive(j)) void onReload();
    },
    [onReload],
  );
  useJobPolling(recording?.id ?? null, isJobActive(job), onJob);

  // Unsaved-changes guard: in-app navigation and tab close / reload.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

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

  async function save(confirmedPublic = false) {
    if (!sb || !validate()) return;
    if (story.visibility === 'public' && !confirmedPublic) {
      setPublicWarn(true);
      return;
    }
    setPublicWarn(false);
    setBusy('save');
    try {
      const v = await saveDraft(sb, story.id, toSaveArgs(story.kind, form, story.fields), story.visibility === 'public');
      toast({ title: mode === 'send_to_narrator' ? t('approval.sent') : t('editor.saved', { v }), tone: 'success' });
      await onReload();
    } catch (e) {
      toast({ title: t(`errors.${reviewErrorKey(e)}`), tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function doApprove(assisted: boolean) {
    if (!sb) return;
    setBusy('approve');
    try {
      await approve(sb, story.id, assisted);
      setJustApproved(true);
      await onReload();
    } catch (e) {
      toast({ title: t(`errors.${reviewErrorKey(e)}`), tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  if (isJobActive(job)) {
    return <ProcessingPanel status={job!.status} errorCode={null} retrying={false} onRetry={() => {}} />;
  }

  const sibling = siblings[0];
  const source = (
    <Card padding="md" className="h-fit">
      <SourcePanel recording={recording} transcript={transcript} />
    </Card>
  );
  const draft = (
    <Card padding="md" className="h-fit">
      <section aria-labelledby="draft-heading" className="flex flex-col gap-4">
        <h2 id="draft-heading" className="font-serif text-[1.35rem] font-semibold text-heritage-deep">
          {t('editor.heading')}
        </h2>
        {!canEdit && <p className="rounded-2xl bg-cream p-3 text-[0.92rem] text-ink-soft">{t('page.readOnly')}</p>}
        <DraftEditor kind={story.kind} form={form} onChange={setForm} readOnly={!canEdit} errors={errors} />
      </section>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline">{t(`page.kind.${story.kind}`)}</Badge>
          <StoryStatusBadge editStatus={story.edit_status} visibility={story.visibility} showScope />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 font-serif text-[clamp(1.6rem,4vw,2.3rem)] font-semibold leading-tight text-heritage-deep [overflow-wrap:anywhere]">{story.title || t('page.title')}</h1>
          <Button variant="secondary" onClick={() => setHistoryOpen(true)} leftIcon={<History className="size-5" aria-hidden="true" />}>
            {t('history.open')}
          </Button>
        </div>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-ink-soft">
          {narrator && <span>{t('page.narratorBy', { name: narrator.display_name })}</span>}
          {topic && <span>{t('page.topic', { topic: pick({ vi: topic.title_vi, en: topic.title_en }) })}</span>}
          {story.approved_at && story.edit_status === 'approved' && <span>{t('approval.approvedAt', { date: formatDate(story.approved_at, locale) })}</span>}
        </p>
        {sibling && (
          <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-paper px-4 py-2 text-[0.92rem] ring-1 ring-line">
            {t(`page.sibling.${sibling.kind}`)}
            <Link to={`/ban-nhap/${sibling.id}`} className="font-semibold text-heritage underline underline-offset-4">
              {t('page.sibling.open')}
            </Link>
          </p>
        )}
      </div>

      {justApproved && mode === 'approved' && (
        <Card tone="mint" padding="md" role="status" aria-live="polite">
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-center gap-2 font-serif text-[1.35rem] font-semibold text-heritage-deep">
              <CheckCircle2 className="size-6" aria-hidden="true" />
              {t('approval.successTitle')}
            </p>
            <p>{t('approval.successBody')}</p>
            <Button size="lg" onClick={() => setShareOpen(true)} leftIcon={<Share2 className="size-5" aria-hidden="true" />}>
              {t('approval.nextStep')}
            </Button>
          </div>
        </Card>
      )}

      {isDesktop ? (
        <div className="grid grid-cols-2 items-start gap-8">
          {source}
          {draft}
        </div>
      ) : (
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
      )}

      <ApprovalBar
        mode={mode}
        canEdit={canEdit}
        dirty={dirty}
        waiting={story.edit_status === 'pending_review'}
        busy={busy}
        onSave={() => void save()}
        onApprove={(assisted) => void doApprove(assisted)}
        onShare={() => setShareOpen(true)}
        narratorMode={isNarratorUser}
      />

      <VersionHistory open={historyOpen} onClose={() => setHistoryOpen(false)} storyId={story.id} kind={story.kind} currentVersion={story.current_version} />
      <ShareDialog storyId={story.id} open={shareOpen} onClose={() => setShareOpen(false)} onChanged={() => void onReload()} />

      <Dialog
        open={publicWarn}
        onClose={() => setPublicWarn(false)}
        title={t('editor.publicWarnTitle')}
        description={t('editor.publicWarnBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublicWarn(false)}>
              {t('editor.stay')}
            </Button>
            <Button variant="terracotta" onClick={() => void save(true)}>
              {t('editor.publicWarnConfirm')}
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
