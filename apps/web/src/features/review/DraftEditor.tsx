import type { StoryKind } from '@lh/shared';
import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef, type ChangeEvent } from 'react';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { useT } from '@/i18n';
import type { DraftForm } from './fields';

export interface DraftEditorProps {
  kind: StoryKind;
  form: DraftForm;
  onChange: (next: DraftForm) => void;
  readOnly?: boolean;
  errors?: { title?: string; decade?: string };
  /** Elder narrator view: larger touch targets (56px). */
  narratorMode?: boolean;
}

/** Textarea that grows with its content (keeps the native resize handle as a fallback). */
function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);
  return <Textarea ref={ref} {...props} />;
}

type ListKey = 'conditions' | 'steps' | 'cautions';

function ListEditor({ label, items, onChange, readOnly, ordered, narratorMode }: { label: string; items: string[]; onChange: (xs: string[]) => void; readOnly?: boolean; ordered?: boolean; narratorMode?: boolean }) {
  const t = useT('review');
  const size = narratorMode ? 'lg' : 'md';
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const List = ordered ? 'ol' : 'ul';
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[0.9rem] font-semibold text-ink">{label}</legend>
      {items.length === 0 && <p className="text-[0.9rem] italic text-ink-soft">{t('editor.list.empty')}</p>}
      <List className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex flex-wrap items-start gap-x-2 gap-y-1">
            {ordered && (
              <span aria-hidden="true" className="mt-3 w-6 shrink-0 text-right font-semibold text-heritage">
                {i + 1}.
              </span>
            )}
            <div className="min-w-[min(100%,12rem)] flex-1">
              <Field label={t('editor.list.item', { label, n: i + 1 })} hideLabel>
                <AutoTextarea
                  rows={1}
                  value={item}
                  readOnly={readOnly}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))}
                  className="min-h-12 resize-none py-2.5"
                />
              </Field>
            </div>
            {!readOnly && (
              <div className="ml-auto flex shrink-0 gap-0.5">
                <Button variant="ghost" size={size} iconOnly aria-label={t('editor.list.up', { n: i + 1 })} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="size-5" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size={size} iconOnly aria-label={t('editor.list.down', { n: i + 1 })} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="size-5" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size={size} iconOnly aria-label={t('editor.list.remove', { n: i + 1 })} onClick={() => onChange(items.filter((_, k) => k !== i))}>
                  <Trash2 className="size-5" aria-hidden="true" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </List>
      {!readOnly && (
        <div>
          <Button variant="secondary" size={size} leftIcon={<Plus className="size-5" aria-hidden="true" />} onClick={() => onChange([...items, ''])}>
            {t('editor.list.add')}
          </Button>
        </div>
      )}
    </fieldset>
  );
}

/** Story: title + body. Experience: title, summary, skill, context, conditions[], steps[], cautions[], limits. Both: optional decade. */
export function DraftEditor({ kind, form, onChange, readOnly, errors, narratorMode }: DraftEditorProps) {
  const t = useT('review');
  const empty = t('editor.empty');
  const set = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) => onChange({ ...form, [key]: value });
  const text = (key: 'title' | 'summary' | 'body' | 'skill' | 'context' | 'limits') => ({
    value: form[key],
    readOnly,
    placeholder: empty,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
  });
  const list = (key: ListKey, label: string, ordered?: boolean) => (
    <ListEditor label={label} items={form[key]} onChange={(xs) => set(key, xs)} readOnly={readOnly} ordered={ordered} narratorMode={narratorMode} />
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="flex gap-2.5 rounded-2xl bg-mint/50 p-3 ring-1 ring-heritage/15 text-[0.92rem] leading-relaxed text-heritage-deep">
        <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>
          {t('editor.aiNote')} <span className="text-ink-soft">{t('editor.editedNote')}</span>
        </span>
      </p>

      <Field label={t('editor.title')} required error={errors?.title}>
        <Input {...text('title')} maxLength={200} />
      </Field>

      {kind === 'story' ? (
        <Field label={t('editor.body')} hint={t('editor.bodyHint')}>
          <AutoTextarea {...text('body')} rows={10} className="font-serif text-[1.05rem] leading-[1.85]" />
        </Field>
      ) : (
        <>
          <Field label={t('editor.summary')}>
            <AutoTextarea {...text('summary')} rows={3} maxLength={2000} />
          </Field>
          <Field label={t('editor.skill')}>
            <Input {...text('skill')} />
          </Field>
          <Field label={t('editor.context')}>
            <AutoTextarea {...text('context')} rows={2} />
          </Field>
          {list('conditions', t('editor.conditions'))}
          {list('steps', t('editor.steps'), true)}
          {list('cautions', t('editor.cautions'))}
          <Field label={t('editor.limits')}>
            <AutoTextarea {...text('limits')} rows={2} />
          </Field>
        </>
      )}

      <Field label={t('editor.decade')} hint={t('editor.decadeHint')} error={errors?.decade} className="max-w-xs">
        <Input value={form.decade} readOnly={readOnly} inputMode="numeric" maxLength={4} placeholder="1970" onChange={(e) => set('decade', e.target.value)} />
      </Field>
    </div>
  );
}
