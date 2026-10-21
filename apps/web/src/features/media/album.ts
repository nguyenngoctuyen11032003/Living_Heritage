// Pure grouping for the family album.

export type AlbumGroupMode = 'narrator' | 'story';

export interface GroupablePhoto {
  id: string;
  story_id: string;
  story_title: string;
  narrator_id: string | null;
  created_at: string;
}

export interface NarratorName {
  id: string;
  display_name: string;
  pen_name?: string | null;
}

export interface AlbumGroup<P> {
  /** narrator id, story id, or '' for photos whose narrator is unknown */
  key: string;
  label: string;
  /** For story groups: the story to link to. */
  storyId: string | null;
  photos: P[];
}

/**
 * Group photos by narrator (in the narrator list order, unknown last) or by story (newest photo first).
 * Photos inside a group keep their incoming order. `narratorFilter` keeps only one narrator's photos.
 */
export function groupAlbum<P extends GroupablePhoto>(
  photos: readonly P[],
  mode: AlbumGroupMode,
  narrators: readonly NarratorName[],
  labels: { unknownNarrator: string; untitled: string },
  narratorFilter = '',
): AlbumGroup<P>[] {
  const list = narratorFilter ? photos.filter((p) => p.narrator_id === narratorFilter) : [...photos];
  const groups = new Map<string, AlbumGroup<P>>();
  if (mode === 'narrator') {
    const known = new Map(narrators.map((n, i) => [n.id, { n, i }]));
    for (const p of list) {
      const hit = p.narrator_id ? known.get(p.narrator_id) : undefined;
      const key = hit ? hit.n.id : '';
      let g = groups.get(key);
      if (!g) {
        g = { key, label: hit ? hit.n.display_name : labels.unknownNarrator, storyId: null, photos: [] };
        groups.set(key, g);
      }
      g.photos.push(p);
    }
    const order = (k: string) => (k ? (known.get(k)?.i ?? Number.MAX_SAFE_INTEGER - 1) : Number.MAX_SAFE_INTEGER);
    return [...groups.values()].sort((a, b) => order(a.key) - order(b.key));
  }
  for (const p of list) {
    let g = groups.get(p.story_id);
    if (!g) {
      g = { key: p.story_id, label: p.story_title.trim() || labels.untitled, storyId: p.story_id, photos: [] };
      groups.set(p.story_id, g);
    }
    g.photos.push(p);
  }
  const newest = (g: AlbumGroup<P>) => g.photos.reduce((m, p) => (p.created_at > m ? p.created_at : m), '');
  return [...groups.values()].sort((a, b) => newest(b).localeCompare(newest(a)));
}
