import { REGIONS, type Region } from '@lh/shared';
import { useState, type FormEvent } from 'react';
import { Button, Dialog, Field, Input, Select } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { rpcErrorCode, type FamilyErrorCode } from '@/features/families/rpcError';
import { ErrorNotice } from '@/features/families/states';
import type { Narrator } from './hooks';
import { toNarratorRow, validateNarrator, type NarratorDraft, type NarratorDraftErrors } from './validation';

function draftFrom(n: Narrator | null): NarratorDraft {
  return {
    display_name: n?.display_name ?? '',
    pen_name: n?.pen_name ?? '',
    birth_year: n?.birth_year ? String(n.birth_year) : '',
    region: (n?.region as Region | null) ?? '',
  };
}

export function NarratorFormDialog({ open, familyId, narrator, onClose, onSaved }: { open: boolean; familyId: string; narrator: Narrator | null; onClose: () => void; onSaved: () => void }) {
  return open ? <FormBody key={narrator?.id ?? 'new'} familyId={familyId} narrator={narrator} onClose={onClose} onSaved={onSaved} /> : null;
}

function FormBody({ familyId, narrator, onClose, onSaved }: { familyId: string; narrator: Narrator | null; onClose: () => void; onSaved: () => void }) {
  const t = useT('family');
  const tc = useT('common');
  const [draft, setDraft] = useState<NarratorDraft>(() => draftFrom(narrator));
  const [errors, setErrors] = useState<NarratorDraftErrors>({});
  const [error, setError] = useState<FamilyErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const year = new Date().getFullYear();

  const set = <K extends keyof NarratorDraft>(k: K, v: NarratorDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const msg = (k: keyof NarratorDraftErrors) => (errors[k] ? t(`narrators.form.errors.${errors[k]}`, { max: year }) : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    const v = validateNarrator(draft, year);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setBusy(true);
    setError(null);
    const row = toNarratorRow(draft);
    const { error: err } = narrator ? await sb.from('narrators').update(row).eq('id', narrator.id) : await sb.from('narrators').insert({ ...row, family_id: familyId });
    setBusy(false);
    if (err) {
      setError(rpcErrorCode(err));
      return;
    }
    onSaved();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={narrator ? t('narrators.form.editTitle') : t('narrators.form.createTitle')}
      description={t('narrators.form.description')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button type="submit" form="lh-narrator-form" loading={busy}>
            {narrator ? tc('actions.save') : t('narrators.form.create')}
          </Button>
        </>
      }
    >
      <form id="lh-narrator-form" noValidate onSubmit={onSubmit} className="flex flex-col gap-4 pb-2">
        <Field label={t('narrators.form.displayName')} hint={t('narrators.form.displayNameHint')} error={msg('display_name')} required>
          <Input value={draft.display_name} maxLength={80} onChange={(e) => set('display_name', e.target.value)} />
        </Field>
        <Field label={t('narrators.form.penName')} hint={t('narrators.form.penNameHint')} error={msg('pen_name')}>
          <Input value={draft.pen_name} maxLength={80} onChange={(e) => set('pen_name', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('narrators.form.birthYear')} error={msg('birth_year')}>
            <Input inputMode="numeric" pattern="[0-9]*" maxLength={4} value={draft.birth_year} onChange={(e) => set('birth_year', e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label={t('narrators.form.region')}>
            <Select value={draft.region} onChange={(e) => set('region', e.target.value as Region | '')}>
              <option value="">{t('narrators.form.regionNone')}</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {t(`regions.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div aria-live="assertive">{error && <ErrorNotice message={t(`errors.${error}`)} />}</div>
      </form>
    </Dialog>
  );
}
