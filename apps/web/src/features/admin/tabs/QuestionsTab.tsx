import { Eye, EyeOff, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Database } from '@lh/shared';
import { Button, Field, Select, Textarea, useToast } from '@/components/ui';
import { useLocale, useT } from '@/i18n';
import { getSupabase, type Supabase } from '@/lib/supabase';
import { fetchAllPages, nextSort, PROMPT_MAX, topicQuestions, validateQuestion, type PromptError } from '../questions';
import { ListHeader, ListState, StatusPill } from '../shared';
import { must, useAdminQuery } from '../useAdminQuery';

type Topic = Pick<Database['public']['Tables']['topics']['Row'], 'id' | 'slug' | 'title_vi' | 'title_en' | 'sort' | 'active'>;
type Question = Pick<Database['public']['Tables']['questions']['Row'], 'id' | 'topic_id' | 'prompt_vi' | 'prompt_en' | 'kind_hint' | 'sort' | 'active'>;
type KindHint = Question['kind_hint'];

/** Admins read inactive rows too (RLS "active or admin read"). */
async function loadLibrary(sb: Supabase): Promise<{ topics: Topic[]; questions: Question[] }> {
  const [topics, questions] = await Promise.all([
    sb.from('topics').select('id, slug, title_vi, title_en, sort, active').order('sort'),
    fetchAllPages(async (from, to) =>
      must(await sb.from('questions').select('id, topic_id, prompt_vi, prompt_en, kind_hint, sort, active').order('sort').order('id').range(from, to)),
    ),
  ]);
  return { topics: must(topics), questions };
}

/** B4: manage the question library — add, edit text, retire (active = false). Nothing is deleted. */
export function QuestionsTab() {
  const t = useT('admin');
  const { locale } = useLocale();
  const { toast } = useToast();
  const q = useAdminQuery('questions', loadLibrary);
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const topics = q.data?.topics ?? [];
  const topic = topics.find((tp) => tp.id === picked) ?? topics[0];
  const list = topic && q.data ? topicQuestions(q.data.questions, topic.id) : [];
  const title = (tp: Topic) => (locale === 'vi' ? tp.title_vi : tp.title_en);

  async function setTopicActive(tp: Topic, active: boolean) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(tp.id);
    const { error } = await sb.from('topics').update({ active }).eq('id', tp.id);
    setBusy(null);
    if (error) return toast({ title: t('common.updateError'), tone: 'error' });
    toast({ title: t('common.updated'), tone: 'success' });
    q.setData((prev) => ({ ...prev, topics: prev.topics.map((x) => (x.id === tp.id ? { ...x, active } : x)) }));
  }

  return (
    <div>
      <p className="mb-5 max-w-3xl text-[0.9rem] leading-relaxed text-ink-soft">{t('questions.intro')}</p>
      <ListHeader count={q.status === 'ready' ? list.length : null} onRefresh={q.reload} loading={q.status === 'loading'}>
        <Field label={t('questions.topic')} className="w-full max-w-xs">
          <Select value={topic?.id ?? ''} onChange={(e) => setPicked(e.target.value)}>
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {title(tp)}
                {tp.active ? '' : ` (${t('questions.inactive')})`}
              </option>
            ))}
          </Select>
        </Field>
      </ListHeader>
      <ListState status={q.status} empty={topics.length === 0} emptyTitle={t('questions.emptyTitle')} emptyBody={t('questions.emptyBody')} onRetry={q.reload}>
        {topic && q.data && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-paper p-5 ring-1 ring-line">
              <div className="min-w-0">
                <h3 className="font-serif text-[1.2rem] font-semibold leading-snug text-heritage-deep">{title(topic)}</h3>
                <p className="mt-1">
                  <StatusPill tone={topic.active ? 'done' : 'muted'}>{topic.active ? t('questions.active') : t('questions.inactive')}</StatusPill>
                </p>
              </div>
              <Button
                variant="secondary"
                loading={busy === topic.id}
                disabled={busy !== null}
                onClick={() => void setTopicActive(topic, !topic.active)}
                leftIcon={topic.active ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
              >
                {topic.active ? t('questions.hideTopic') : t('questions.showTopic')}
              </Button>
            </div>
            <AddQuestion
              key={topic.id}
              topicId={topic.id}
              sort={nextSort(q.data.questions, topic.id)}
              onAdded={(row) => q.setData((prev) => ({ ...prev, questions: [...prev.questions, row] }))}
            />
            {list.length === 0 ? (
              <p className="text-ink-soft">{t('questions.noQuestions')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {list.map((row) => (
                  <QuestionCard key={row.id} row={row} onChanged={(next) => q.setData((prev) => ({ ...prev, questions: prev.questions.map((x) => (x.id === next.id ? next : x)) }))} />
                ))}
              </ul>
            )}
          </div>
        )}
      </ListState>
    </div>
  );
}

function usePromptLabel() {
  const t = useT('admin');
  return (e: PromptError | null) => (e ? t(`questions.errors.${e}`, { max: PROMPT_MAX }) : undefined);
}

function PromptFields({ vi, en, setVi, setEn, errors }: { vi: string; en: string; setVi: (v: string) => void; setEn: (v: string) => void; errors: { vi: PromptError | null; en: PromptError | null } | null }) {
  const t = useT('admin');
  const err = usePromptLabel();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t('questions.promptVi')} error={errors ? err(errors.vi) : undefined} required>
        <Textarea lang="vi" value={vi} onChange={(e) => setVi(e.target.value)} maxLength={PROMPT_MAX + 50} rows={2} />
      </Field>
      <Field label={t('questions.promptEn')} error={errors ? err(errors.en) : undefined} required>
        <Textarea lang="en" value={en} onChange={(e) => setEn(e.target.value)} maxLength={PROMPT_MAX + 50} rows={2} />
      </Field>
    </div>
  );
}

function AddQuestion({ topicId, sort, onAdded }: { topicId: string; sort: number; onAdded: (q: Question) => void }) {
  const t = useT('admin');
  const { toast } = useToast();
  const [vi, setVi] = useState('');
  const [en, setEn] = useState('');
  const [kind, setKind] = useState<'' | NonNullable<KindHint>>('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const v = validateQuestion({ vi, en });

  async function add() {
    setTried(true);
    const sb = getSupabase();
    if (!sb || busy || !v.ok) return;
    setBusy(true);
    const { data, error } = await sb
      .from('questions')
      .insert({ topic_id: topicId, prompt_vi: vi.trim(), prompt_en: en.trim(), kind_hint: kind || null, sort, active: true })
      .select('id, topic_id, prompt_vi, prompt_en, kind_hint, sort, active')
      .single();
    setBusy(false);
    if (error || !data) return toast({ title: t('questions.saveError'), tone: 'error' });
    toast({ title: t('questions.added'), tone: 'success' });
    onAdded(data);
    setVi('');
    setEn('');
    setKind('');
    setTried(false);
  }

  return (
    <section aria-labelledby="add-question" className="rounded-[1.5rem] bg-paper p-5 ring-1 ring-line md:p-6">
      <h3 id="add-question" className="font-semibold text-ink">
        {t('questions.addTitle')}
      </h3>
      <div className="mt-3">
        <PromptFields vi={vi} en={en} setVi={setVi} setEn={setEn} errors={tried ? v : null} />
      </div>
      <Field label={t('questions.kind')} className="mt-4 max-w-xs">
        <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="">{t('questions.kinds.any')}</option>
          <option value="story">{t('questions.kinds.story')}</option>
          <option value="experience">{t('questions.kinds.experience')}</option>
        </Select>
      </Field>
      <Button className="mt-4" loading={busy} disabled={busy} onClick={() => void add()} leftIcon={<Plus aria-hidden="true" className="size-4" />}>
        {t('questions.add')}
      </Button>
    </section>
  );
}

function QuestionCard({ row, onChanged }: { row: Question; onChanged: (q: Question) => void }) {
  const t = useT('admin');
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [vi, setVi] = useState(row.prompt_vi);
  const [en, setEn] = useState(row.prompt_en);
  const [busy, setBusy] = useState<'save' | 'toggle' | null>(null);
  const v = validateQuestion({ vi, en });

  async function patch(update: Partial<Pick<Question, 'prompt_vi' | 'prompt_en' | 'active'>>, kind: 'save' | 'toggle') {
    const sb = getSupabase();
    if (!sb || busy) return false;
    setBusy(kind);
    const { error } = await sb.from('questions').update(update).eq('id', row.id);
    setBusy(null);
    if (error) {
      toast({ title: t('questions.saveError'), tone: 'error' });
      return false;
    }
    toast({ title: t('common.updated'), tone: 'success' });
    onChanged({ ...row, ...update });
    return true;
  }

  async function save() {
    if (!v.ok) return;
    if (await patch({ prompt_vi: vi.trim(), prompt_en: en.trim() }, 'save')) setEditing(false);
  }

  return (
    <li className="rounded-[1.25rem] bg-paper p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {editing ? (
          <div className="min-w-0 flex-1 basis-full">
            <PromptFields vi={vi} en={en} setVi={setVi} setEn={setEn} errors={v} />
          </div>
        ) : (
          <div className={`min-w-0 flex-1 basis-64 ${row.active ? '' : 'opacity-70'}`}>
            <p lang="vi" className="leading-relaxed text-ink">
              {row.prompt_vi}
            </p>
            <p lang="en" className="mt-1 text-[0.92rem] leading-relaxed text-ink-soft">
              {row.prompt_en}
            </p>
          </div>
        )}
        {!editing && <StatusPill tone={row.active ? 'done' : 'muted'}>{row.active ? t('questions.active') : t('questions.inactive')}</StatusPill>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {editing ? (
          <>
            <Button loading={busy === 'save'} disabled={busy !== null || !v.ok} onClick={() => void save()}>
              {t('questions.save')}
            </Button>
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => {
                setVi(row.prompt_vi);
                setEn(row.prompt_en);
                setEditing(false);
              }}
            >
              {t('questions.cancel')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" disabled={busy !== null} onClick={() => setEditing(true)} leftIcon={<Pencil aria-hidden="true" className="size-4" />}>
              {t('questions.edit')}
            </Button>
            <Button
              variant="secondary"
              loading={busy === 'toggle'}
              disabled={busy !== null}
              onClick={() => void patch({ active: !row.active }, 'toggle')}
              leftIcon={row.active ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
            >
              {row.active ? t('questions.hide') : t('questions.show')}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
