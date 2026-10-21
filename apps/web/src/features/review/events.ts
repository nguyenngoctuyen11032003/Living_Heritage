// B17 pilot events for the review page. 'draft_created' fires once per story per browser session, however often
// the page re-renders, polls or reloads; 'draft_edit' and 'approve' fire after a successful RPC.
import { track } from '@/lib/events';

const SEEN_KEY = 'lh.draftCreatedSeen';
const seen = new Set<string>();

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (raw) for (const id of JSON.parse(raw) as unknown[]) if (typeof id === 'string') seen.add(id);
  } catch {
    /* private mode / blocked storage: the in-memory set still guards this page load */
  }
  return seen;
}

/** The page saw the AI job reach "done" with these drafts: count the first one once. */
export function trackDraftCreated(storyIds: string[]): void {
  const id = storyIds[0];
  if (!id) return;
  const s = readSeen();
  if (s.has(id)) return;
  s.add(id);
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-50)));
  } catch {
    /* ignore */
  }
  track('draft_created');
}

/** Test hook. */
export function resetDraftCreatedSeen(): void {
  seen.clear();
  try {
    sessionStorage.removeItem(SEEN_KEY);
  } catch {
    /* ignore */
  }
}

/** A job that finished within the last 10 minutes: the user is seeing its draft for the first time, not reopening it. */
export function isJustFinished(updatedAt: string, now: number = Date.now()): boolean {
  const at = Date.parse(updatedAt);
  return Number.isFinite(at) && now - at >= 0 && now - at < 10 * 60_000;
}
