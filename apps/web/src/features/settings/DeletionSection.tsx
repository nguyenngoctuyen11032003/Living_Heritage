import { useState, type FormEvent } from 'react';
import { Button, Field, Select, Textarea, useToast } from '@/components/ui';
import type { FamilySummary } from '@/features/families/current';
import { SectionCard } from '@/features/families/states';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { getSupabase } from '@/lib/supabase';
import { hasErrors, hasOpenDuplicate, REASON_MAX, REASON_MIN, toDeletionInsert, validateDeletionForm, type DeletionFormErrors } from './deletion';
import { ConfirmCheckbox, DeletionRequestList } from './DeletionRequestList';
import { useDeletionErrorText, useMyDeletionRequests } from './useDeletionRequests';

export interface StoryOption {
  id: string;
  title: string;
}

export function DeletionSection({ family, stories, storiesError }: { family: FamilySummary; stories: StoryOption[]; storiesError: boolean }) {
  const t = useT('settings');
  const { toast } = useToast();
  const errorText = useDeletionErrorText();
  const requests = useMyDeletionRequests(family.id);
  const [scope, setScope] = useState<'family' | 'story'>('story');
  const [storyId, setStoryId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<DeletionFormErrors>({});
  const [busy, setBusy] = useState(false);
  const titles = new Map(stories.map((s) => [s.id, s.title || t('deletion.storyUntitled')]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || busy) return;
    const form = { scope, storyId, reason, confirmed };
    const errs = validateDeletionForm(form, family.id);
    setErrors(errs);
    if (hasErrors(errs)) return;
    const row = toDeletionInsert(form, family.id);
    if (hasOpenDuplicate(requests.rows, row)) {
      toast({ title: t('deletion.errors.duplicate'), tone: 'error' });
      return;
    }
    setBusy(true);
    const { error } = await sb.from('deletion_requests').insert(row);
    setBusy(false);
    if (error) toast({ title: t('states.saveError'), tone: 'error' });
    else {
      setReason('');
      setStoryId('');
      setConfirmed(false);
      toast({ title: t('deletion.sent'), tone: 'success' });
      void requests.reload();
    }
  }

  const msg = errorText(errors);
  const scopes = [
    { value: 'story' as const, label: t('deletion.scopeStory'), hint: t('deletion.scopeStoryHint') },
    { value: 'family' as const, label: t('deletion.scopeFamily'), hint: t('deletion.scopeFamilyHint') },
  ];

  return (
    <SectionCard title={t('deletion.title')} description={t('deletion.body')}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 rounded-2xl bg-cream p-4 text-[0.95rem] leading-relaxed text-ink ring-1 ring-line">
          <p>{t('deletion.statusesNote')}</p>
          <p className="text-ink-soft">{t('deletion.backupNote')}</p>
        </div>

        <div>
          <h3 className="font-serif text-[1.1rem] font-semibold text-heritage-deep">{t('deletion.listTitle')}</h3>
          <p className="mb-3 text-[0.9rem] text-ink-soft">{t('deletion.listNote')}</p>
          <DeletionRequestList rows={requests.rows} loading={requests.loading} error={requests.error} onRetry={() => void requests.reload()} storyTitles={titles} only={['family', 'story']} />
        </div>

        <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-5">
          <h3 className="font-serif text-[1.1rem] font-semibold text-heritage-deep">{t('deletion.newTitle')}</h3>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-[0.9rem] font-semibold text-ink">{t('deletion.scopeLabel')}</legend>
            {scopes.map((s) => (
              <label
                key={s.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 focus-within:ring-2 focus-within:ring-heritage',
                  scope === s.value ? 'bg-mint/60 ring-heritage/40' : 'bg-paper ring-line-strong',
                )}
              >
                <input type="radio" name="lh-deletion-scope" value={s.value} checked={scope === s.value} onChange={() => setScope(s.value)} className="mt-1 size-5 shrink-0 accent-heritage" />
                <span>
                  <span className="block font-semibold text-ink">{s.label}</span>
                  <span className="block text-[0.9rem] text-ink-soft">{s.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {scope === 'story' &&
            (storiesError ? (
              <p role="alert" className="text-terracotta">{t('deletion.storiesError')}</p>
            ) : stories.length === 0 ? (
              <p className="text-ink-soft">{t('deletion.noStories')}</p>
            ) : (
              <Field label={t('deletion.storyLabel')} error={msg.story} required>
                <Select value={storyId} onChange={(e) => setStoryId(e.target.value)}>
                  <option value="">{t('deletion.storyPlaceholder')}</option>
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {titles.get(s.id)}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}

          <Field label={t('deletion.reasonLabel')} hint={t('deletion.reasonHint', { min: REASON_MIN, max: REASON_MAX })} error={msg.reason} required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={REASON_MAX + 50} />
          </Field>

          {scope === 'family' && <ConfirmCheckbox checked={confirmed} onChange={setConfirmed} label={t('deletion.confirmFamily')} error={msg.confirmed} />}

          <div>
            <Button type="submit" variant="terracotta" loading={busy} disabled={scope === 'story' && stories.length === 0}>
              {t('deletion.submit')}
            </Button>
          </div>
        </form>
      </div>
    </SectionCard>
  );
}
