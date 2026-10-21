import { Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Dialog, Field, Input, Skeleton, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { addItem, collectionsOfStory, createCollection, listCollections, nextItemPosition, removeItem, type CollectionSummary } from '../collectionsApi';

export interface AddToCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  storyId: string;
  familyId: string;
}

/** Tick/untick the collections that hold a story; create a new one inline. */
export function AddToCollectionDialog({ open, onClose, storyId, familyId }: AddToCollectionDialogProps) {
  const t = useT('vault');
  const { toast } = useToast();
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null);
  const [member, setMember] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!open) return;
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    setCollections(null);
    setError(null);
    Promise.all([listCollections(sb, familyId), collectionsOfStory(sb, storyId)])
      .then(([cols, ids]) => {
        if (!alive) return;
        setCollections(cols);
        setMember(new Set(ids));
      })
      .catch(() => alive && setError(t('state.loadError')));
    return () => {
      alive = false;
    };
  }, [open, familyId, storyId, t]);

  async function toggle(c: CollectionSummary) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(c.id);
    setError(null);
    try {
      if (member.has(c.id)) {
        await removeItem(sb, c.id, storyId);
        setMember((prev) => new Set([...prev].filter((x) => x !== c.id)));
        toast({ title: t('addToCollection.removed', { name: c.title }) });
      } else {
        await addItem(sb, { collection_id: c.id, family_id: familyId, story_id: storyId, position: await nextItemPosition(sb, c.id) });
        setMember((prev) => new Set([...prev, c.id]));
        toast({ title: t('addToCollection.added', { name: c.title }), tone: 'success' });
      }
    } catch {
      setError(t('state.saveError'));
    } finally {
      setBusy(null);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    const name = newName.trim();
    if (!sb || !name) return;
    setBusy('new');
    setError(null);
    try {
      const id = await createCollection(sb, familyId, name, null);
      await addItem(sb, { collection_id: id, family_id: familyId, story_id: storyId, position: 0 });
      setCollections((prev) => [{ id, title: name, description: null, created_at: new Date().toISOString(), count: 1 }, ...(prev ?? [])]);
      setMember((prev) => new Set([...prev, id]));
      setNewName('');
      toast({ title: t('addToCollection.added', { name }), tone: 'success' });
    } catch {
      setError(t('state.saveError'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('addToCollection.title')}
      description={t('addToCollection.description')}
      footer={<Button onClick={onClose}>{t('addToCollection.done')}</Button>}
    >
      <div className="flex flex-col gap-5">
        {collections === null && !error ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : collections && collections.length === 0 ? (
          <p className="text-ink-soft">{t('addToCollection.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {collections?.map((c) => (
              <li key={c.id}>
                <label
                  className={cn(
                    'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-4 py-2 ring-1 focus-within:ring-2 focus-within:ring-heritage',
                    member.has(c.id) ? 'bg-mint/70 ring-heritage/30' : 'bg-paper ring-line',
                  )}
                >
                  <input type="checkbox" className="size-5 accent-heritage" checked={member.has(c.id)} disabled={busy !== null} onChange={() => void toggle(c)} />
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={create} className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-end">
          <Field label={t('addToCollection.newLabel')} className="flex-1">
            <Input value={newName} maxLength={120} onChange={(e) => setNewName(e.target.value)} placeholder={t('addToCollection.newPlaceholder')} />
          </Field>
          <Button type="submit" variant="secondary" loading={busy === 'new'} disabled={!newName.trim() || busy !== null} leftIcon={<Plus className="size-5" aria-hidden="true" />}>
            {t('addToCollection.create')}
          </Button>
        </form>
        <p role="status" aria-live="polite" className={cn('text-terracotta', !error && 'sr-only')}>
          {error ?? ''}
        </p>
      </div>
    </Dialog>
  );
}
