import { BookOpen, FolderHeart, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, ButtonLink, Dialog, EmptyState, Field, Input, Skeleton, Textarea, useToast } from '@/components/ui';
import { moveItem, positionUpdates, renumber } from '@/features/books/reorder';
import { useCurrentFamily } from '@/features/families/current';
import { useT } from '@/i18n';
import { getSupabase } from '@/lib/supabase';
import {
  addItem,
  createCollection,
  deleteCollection,
  fetchCollection,
  fetchFamilyStories,
  fetchStoriesByIds,
  listCollections,
  listItems,
  removeItem,
  saveItemPositions,
  updateCollection,
  type CollectionSummary,
} from './collectionsApi';
import { OrderedList } from './components/OrderedList';
import { LoadError, Unavailable } from './components/States';
import { StoryPicker } from './components/StoryPicker';
import { VaultPageHeader } from './components/VaultPageHeader';
import { FamilyGate, StoryStatusBadge } from './external';
import type { VaultStory } from './types';
import { useVaultLookups } from './useLookups';

// ------------------------------------------------------------------ list page

export function CollectionsPage() {
  return (
    <FamilyGate>
      <CollectionsInner />
    </FamilyGate>
  );
}

function CollectionsInner() {
  const t = useT('vault');
  const tc = useT('common');
  const { toast } = useToast();
  const { current, canEdit } = useCurrentFamily();
  const familyId = current!.id;
  const [items, setItems] = useState<CollectionSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<CollectionSummary | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CollectionSummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    setError(false);
    listCollections(sb, familyId)
      .then((rows) => alive && setItems(rows))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [familyId, tick]);

  async function confirmDelete() {
    const sb = getSupabase();
    if (!sb || !deleting) return;
    setBusy(true);
    try {
      await deleteCollection(sb, deleting.id);
      setItems((prev) => prev?.filter((c) => c.id !== deleting.id) ?? null);
      toast({ title: t('collections.deleted'), tone: 'success' });
      setDeleting(null);
    } catch {
      toast({ title: t('state.saveError'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <VaultPageHeader
        back={{ to: '/gia-dinh', label: t('detail.back') }}
        eyebrow={t('header.eyebrow')}
        title={t('collections.title')}
        lede={t('collections.intro')}
        actions={
          // An empty list shows the single create action in its empty state instead.
          canEdit && items !== null && items.length > 0 && (
            <Button size="lg" className="w-full md:w-auto" leftIcon={<Plus className="size-5" />} onClick={() => setEditing('new')}>
              {t('collections.create')}
            </Button>
          )
        }
      />

      {error ? (
        <LoadError onRetry={() => setTick((x) => x + 1)} />
      ) : items === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FolderHeart />}
          title={t('collections.emptyTitle')}
          description={canEdit ? t('collections.emptyBody') : t('collections.viewerEmpty')}
          action={
            canEdit ? (
              <Button leftIcon={<Plus className="size-5" />} onClick={() => setEditing('new')}>
                {t('collections.create')}
              </Button>
            ) : (
              <ButtonLink to="/gia-dinh" variant="secondary" leftIcon={<BookOpen className="size-5" />}>
                {t('collections.viewerCta')}
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((c) => (
            <li key={c.id} className="relative flex min-w-0 flex-col gap-3 rounded-[1.5rem] bg-paper p-5 ring-1 ring-line/80 focus-within:ring-2 focus-within:ring-heritage">
              <h2 className="font-serif text-[1.25rem] font-semibold leading-snug break-words text-heritage-deep">
                <Link to={`/gia-dinh/bo-suu-tap/${c.id}`} className="outline-none hover:underline">
                  {c.title}
                </Link>
              </h2>
              {c.description && <p className="line-clamp-2 text-ink-soft">{c.description}</p>}
              <p className="text-[0.9rem] text-ink-soft">{t('collections.count', { n: c.count })}</p>
              {canEdit && (
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button variant="ghost" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(c)}>
                    {t('collections.rename')}
                  </Button>
                  <Button variant="ghost" leftIcon={<Trash2 className="size-4" />} onClick={() => setDeleting(c)}>
                    {t('collections.delete')}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <CollectionFormDialog
        open={editing !== null}
        initial={editing === 'new' ? null : editing}
        familyId={familyId}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setTick((x) => x + 1);
        }}
      />
      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('collections.deleteTitle')}
        description={deleting ? t('collections.deleteBody', { name: deleting.title }) : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {tc('actions.cancel')}
            </Button>
            <Button variant="terracotta" loading={busy} onClick={confirmDelete}>
              {t('collections.delete')}
            </Button>
          </>
        }
      />
    </div>
  );
}

function CollectionFormDialog({
  open,
  initial,
  familyId,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: { id: string; title: string; description: string | null } | null;
  familyId: string;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const t = useT('vault');
  const tc = useT('common');
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setError(null);
  }, [open, initial]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    if (!title.trim()) return setError(t('collections.nameRequired'));
    setSaving(true);
    try {
      const id = initial ? (await updateCollection(sb, initial.id, title, description), initial.id) : await createCollection(sb, familyId, title, description);
      toast({ title: t('collections.saved'), tone: 'success' });
      onSaved(id);
    } catch {
      setError(t('state.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={initial ? t('collections.renameTitle') : t('collections.createTitle')}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={t('collections.nameLabel')} required error={error ?? undefined}>
          <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={t('collections.descLabel')}>
          <Textarea value={description} maxLength={1000} rows={3} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {tc('actions.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ detail page

export function CollectionPage({ collectionId }: { collectionId: string }) {
  return (
    <FamilyGate showSwitcher={false}>
      <CollectionInner collectionId={collectionId} />
    </FamilyGate>
  );
}

interface Row {
  story_id: string;
  position: number;
  story: VaultStory;
}

function CollectionInner({ collectionId }: { collectionId: string }) {
  const t = useT('vault');
  const { toast } = useToast();
  const { families } = useCurrentFamily();
  const [meta, setMeta] = useState<{ id: string; family_id: string; title: string; description: string | null } | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [all, setAll] = useState<VaultStory[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const lookups = useVaultLookups(meta?.family_id);
  const role = families.find((f) => f.id === meta?.family_id)?.role;
  const canEdit = role === 'owner' || role === 'manager' || role === 'editor';

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    setError(false);
    (async () => {
      const c = await fetchCollection(sb, collectionId);
      if (!c) return { c: null, rows: [] as Row[] };
      const items = await listItems(sb, collectionId);
      const stories = await fetchStoriesByIds(sb, items.map((i) => i.story_id));
      const byId = new Map(stories.map((s) => [s.id, s]));
      return { c, rows: items.filter((i) => byId.has(i.story_id)).map((i) => ({ ...i, story: byId.get(i.story_id)! })) };
    })()
      .then(({ c, rows: r }) => {
        if (!alive) return;
        setMeta(c);
        setRows(r);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [collectionId, tick]);

  const openPicker = useCallback(async () => {
    setPicker(true);
    const sb = getSupabase();
    if (!sb || !meta) return;
    try {
      setAll(await fetchFamilyStories(sb, meta.family_id));
    } catch {
      setAll([]);
      toast({ title: t('state.loadError'), tone: 'error' });
    }
  }, [meta, t, toast]);

  async function persist(next: Row[], previous: Row[]) {
    const sb = getSupabase();
    if (!sb) return;
    setRows(renumber(next));
    setSaving(true);
    try {
      await saveItemPositions(sb, collectionId, positionUpdates(next));
      toast({ title: t('collections.items.orderSaved'), tone: 'success', duration: 2000 });
    } catch {
      setRows(previous);
      toast({ title: t('state.saveError'), tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    const sb = getSupabase();
    if (!sb) return;
    const previous = rows;
    setRows(rows.filter((r) => r.story_id !== row.story_id));
    try {
      await removeItem(sb, collectionId, row.story_id);
    } catch {
      setRows(previous);
      toast({ title: t('state.saveError'), tone: 'error' });
    }
  }

  async function add(story: VaultStory) {
    const sb = getSupabase();
    if (!sb || !meta) return;
    setBusyId(story.id);
    try {
      const position = rows.reduce((m, r) => Math.max(m, r.position), -1) + 1;
      await addItem(sb, { collection_id: collectionId, family_id: meta.family_id, story_id: story.id, position });
      setRows((prev) => [...prev, { story_id: story.id, position, story }]);
    } catch {
      toast({ title: t('state.saveError'), tone: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <LoadError onRetry={() => setTick((x) => x + 1)} />;
  if (meta === undefined)
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  if (meta === null) return <Unavailable backTo="/gia-dinh/bo-suu-tap" backLabel={t('collections.back')} />;

  const untitled = t('card.untitled');
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <VaultPageHeader
        back={{ to: '/gia-dinh/bo-suu-tap', label: t('collections.back') }}
        eyebrow={t('collections.title')}
        title={meta.title}
        lede={meta.description || undefined}
        meta={t('collections.count', { n: rows.length })}
        actions={
          canEdit && (
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap lg:justify-end">
              <Button variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                {t('collections.rename')}
              </Button>
              <Button leftIcon={<Plus className="size-5" />} onClick={() => void openPicker()}>
                {t('collections.items.add')}
              </Button>
            </div>
          )
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FolderHeart />}
          title={t('collections.items.emptyTitle')}
          description={t('collections.items.emptyBody')}
          action={
            canEdit ? (
              <Button leftIcon={<Plus className="size-5" />} onClick={() => void openPicker()}>
                {t('collections.items.add')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <OrderedList
          items={rows}
          getKey={(r) => r.story_id}
          getTitle={(r) => r.story.title.trim() || untitled}
          disabled={saving}
          onMove={canEdit ? (from, to) => void persist(moveItem(rows, from, to), rows) : undefined}
          onRemove={canEdit ? (r) => void remove(r) : undefined}
          labels={{
            moveUp: (title) => t('collections.items.moveUp', { title }),
            moveDown: (title) => t('collections.items.moveDown', { title }),
            remove: (title) => t('collections.items.remove', { title }),
          }}
          render={(r) => (
            <div className="flex flex-col gap-1.5">
              <Link to={`/cau-chuyen/${r.story_id}`} className="font-serif text-[1.1rem] font-semibold text-heritage-deep hover:underline">
                {r.story.title.trim() || untitled}
              </Link>
              <span className="text-[0.85rem] text-ink-soft">{lookups.narratorById.get(r.story.narrator_id)?.display_name ?? ''}</span>
              <StoryStatusBadge size="sm" showScope editStatus={r.story.edit_status} visibility={r.story.visibility} />
            </div>
          )}
        />
      )}

      <Dialog open={picker} onClose={() => setPicker(false)} title={t('collections.picker.title')} size="lg">
        {all === null ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-12" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <StoryPicker
            stories={all}
            selected={new Set(rows.map((r) => r.story_id))}
            onAdd={(s) => void add(s)}
            busyId={busyId}
            narratorName={(id) => lookups.narratorById.get(id)?.display_name}
            labels={{
              search: t('collections.picker.searchLabel'),
              add: t('collections.picker.add'),
              addLabel: (title) => `${t('collections.picker.add')}: ${title}`,
              added: t('collections.picker.added'),
              none: t('collections.picker.none'),
              untitled,
            }}
          />
        )}
      </Dialog>
      <CollectionFormDialog
        open={editing}
        initial={meta}
        familyId={meta.family_id}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          setTick((x) => x + 1);
        }}
      />
    </div>
  );
}
