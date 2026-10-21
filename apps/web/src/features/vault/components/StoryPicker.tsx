import { Check, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { matchesQuery } from '../filter';
import type { VaultStory } from '../types';

export interface StoryPickerProps {
  stories: VaultStory[];
  selected: Set<string>;
  onAdd: (story: VaultStory) => void;
  busyId?: string | null;
  labels: { search: string; add: string; addLabel: (title: string) => string; added: string; none: string; noMatch?: string; untitled: string };
  narratorName?: (id: string) => string | undefined;
  /** Optional colour stripe per row (e.g. the story's topic band). */
  accentOf?: (story: VaultStory) => string | undefined;
  /** Max rows rendered (search narrows further). */
  limit?: number;
}

/** Searchable list (diacritic-insensitive) with an Add button per story. */
export function StoryPicker({ stories, selected, onAdd, busyId, labels, narratorName, accentOf, limit = 60 }: StoryPickerProps) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => stories.filter((s) => matchesQuery(s, q)), [stories, q]);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Field label={labels.search}>
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      {matches.length === 0 ? (
        <p className="py-4 text-ink-soft" role="status">
          {stories.length === 0 ? labels.none : (labels.noMatch ?? labels.none)}
        </p>
      ) : (
        <ul className="@container flex flex-col divide-y divide-line rounded-2xl bg-paper ring-1 ring-line">
          {matches.slice(0, limit).map((s) => {
            const title = s.title.trim() || labels.untitled;
            const isIn = selected.has(s.id);
            const accent = accentOf?.(s);
            return (
              // Narrow lists (phones, side panels): the status / Add button sits under the title so the title keeps the row width.
              <li key={s.id} className="flex flex-col items-start gap-2 px-4 py-3 @md:flex-row @md:items-center @md:gap-3">
                <div className="flex w-full min-w-0 flex-1 items-stretch gap-3">
                  {accent && <span aria-hidden="true" className="w-1.5 shrink-0 rounded-full" style={{ background: accent }} />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words font-serif font-semibold leading-snug text-ink">{title}</p>
                    {narratorName && <p className="truncate text-[0.85rem] text-ink-soft">{narratorName(s.narrator_id) ?? ''}</p>}
                  </div>
                </div>
                {isIn ? (
                  <span className={cn('inline-flex shrink-0 items-center gap-1 text-[0.85rem] text-heritage', accent && 'pl-[1.125rem] @md:pl-0')}>
                    <Check className="size-4" aria-hidden="true" />
                    {labels.added}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    className={cn('shrink-0', accent && 'ml-[1.125rem] @md:ml-0')}
                    aria-label={labels.addLabel(title)}
                    loading={busyId === s.id}
                    disabled={!!busyId}
                    leftIcon={<Plus className="size-4" />}
                    onClick={() => onAdd(s)}
                  >
                    {labels.add}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
