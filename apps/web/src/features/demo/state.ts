// State machine of the /trai-nghiem walkthrough. Pure (tested); the page keeps it in sessionStorage only.
import type { Locale } from '@/i18n';
import { fillDraft, NARRATIONS, type DemoKind } from './data';

export const STEPS = ['topic', 'listen', 'transcript', 'draft', 'confirm', 'scope', 'vault', 'story', 'book'] as const;
export type Step = (typeof STEPS)[number];

/** The guided part of the journey, shown as numbered steps. */
export const JOURNEY = ['topic', 'listen', 'transcript', 'draft', 'confirm', 'scope', 'vault'] as const satisfies readonly Step[];

/** Position in the numbered journey (story and book belong to the vault step). */
export function journeyIndex(step: Step): number {
  return step === 'story' || step === 'book' ? JOURNEY.length - 1 : (JOURNEY as readonly Step[]).indexOf(step);
}

/** Narrator-side steps (large text). */
export const NARRATOR_STEPS: ReadonlySet<Step> = new Set<Step>(['topic', 'listen', 'transcript', 'draft', 'confirm']);

export const TOPIC_UNSURE = 'unsure';
export const DEMO_TOPICS = ['tuoi-tho', 'gia-dinh', 'que-huong', 'nghe-nghiep', 'mon-an', 'lam-vuon'] as const;

export type Scope = 'private' | 'invited' | 'publish';
export const SCOPES: readonly Scope[] = ['private', 'invited', 'publish'];

export interface DemoDraft {
  title: string;
  body: string;
  /** Name shown with the story (the narrator may change it, e.g. to a pen name). */
  narratorName: string;
}

export interface SavedStory extends DemoDraft {
  kind: DemoKind;
  topic: string;
  scope: Scope;
}

export interface DemoState {
  v: 1;
  step: Step;
  topic: string | null;
  kind: DemoKind | null;
  /** The simulated narration was played to the end (or skipped). */
  heard: boolean;
  check: { status: 'pending' | 'kept' | 'fixed'; value: string };
  draft: DemoDraft | null;
  confirmed: boolean;
  scope: Scope | null;
  saved: SavedStory | null;
  /** Story open on the 'story' step ('mine' = the visitor's own story). */
  openId: string | null;
}

export const MAX_TITLE = 120;
export const MAX_BODY = 4000;
export const MAX_NAME = 60;
export const MAX_FIX = 40;

export function initialState(): DemoState {
  return {
    v: 1,
    step: 'topic',
    topic: null,
    kind: null,
    heard: false,
    check: { status: 'pending', value: '' },
    draft: null,
    confirmed: false,
    scope: null,
    saved: null,
    openId: null,
  };
}

export type DemoAction =
  | { type: 'chooseTopic'; topic: string }
  | { type: 'chooseKind'; kind: DemoKind }
  | { type: 'start' }
  | { type: 'heard' }
  | { type: 'keepGuess'; locale: Locale }
  | { type: 'fixGuess'; value: string }
  | { type: 'toDraft'; locale: Locale; narratorName: string }
  | { type: 'editDraft'; patch: Partial<DemoDraft> }
  | { type: 'toConfirm' }
  | { type: 'confirm'; ok: boolean }
  | { type: 'chooseScope'; scope: Scope }
  | { type: 'save' }
  | { type: 'openStory'; id: string }
  | { type: 'openBook' }
  | { type: 'goto'; step: Step }
  | { type: 'reset' };

export function isValidTopic(topic: string | null): boolean {
  return topic === TOPIC_UNSURE || (DEMO_TOPICS as readonly string[]).includes(topic ?? '');
}

export function draftErrors(d: DemoDraft | null): { title?: 'required' | 'tooLong'; body?: 'required' | 'tooLong'; narratorName?: 'required' | 'tooLong' } {
  if (!d) return { title: 'required', body: 'required', narratorName: 'required' };
  const e: ReturnType<typeof draftErrors> = {};
  const title = d.title.trim();
  const body = d.body.trim();
  const name = d.narratorName.trim();
  if (!title) e.title = 'required';
  else if (title.length > MAX_TITLE) e.title = 'tooLong';
  if (!body) e.body = 'required';
  else if (body.length > MAX_BODY) e.body = 'tooLong';
  if (!name) e.narratorName = 'required';
  else if (name.length > MAX_NAME) e.narratorName = 'tooLong';
  return e;
}

/** Can the visitor open `step` from here (progress links, restored state)? */
export function canEnter(s: DemoState, step: Step): boolean {
  switch (step) {
    case 'topic':
      return true;
    case 'listen':
    case 'transcript':
      return isValidTopic(s.topic) && s.kind !== null;
    case 'draft':
      return canEnter(s, 'transcript') && s.check.status !== 'pending';
    case 'confirm':
      return canEnter(s, 'draft') && s.draft !== null && Object.keys(draftErrors(s.draft)).length === 0;
    case 'scope':
      return canEnter(s, 'confirm') && s.confirmed;
    case 'vault':
    case 'book':
      return true;
    case 'story':
      return s.openId !== null && (s.openId !== 'mine' || s.saved !== null);
  }
}

/** Downstream work is dropped when the kind of story changes (another narration, another draft). */
function withKind(s: DemoState, kind: DemoKind): DemoState {
  if (s.kind === kind) return s;
  return { ...s, kind, heard: false, check: { status: 'pending', value: '' }, draft: null, confirmed: false, scope: null };
}

export function reducer(s: DemoState, a: DemoAction): DemoState {
  switch (a.type) {
    case 'chooseTopic': {
      if (!isValidTopic(a.topic)) return s;
      const next = { ...s, topic: a.topic };
      // A topic suggests a kind; the visitor can still switch it.
      if (s.kind === null) {
        const kind: DemoKind = a.topic === 'lam-vuon' || a.topic === 'nghe-nghiep' || a.topic === 'mon-an' ? 'experience' : 'memory';
        return withKind(next, kind);
      }
      return next;
    }
    case 'chooseKind':
      return withKind(s, a.kind);
    case 'start':
      return canEnter(s, 'listen') ? { ...s, step: 'listen' } : s;
    case 'heard':
      return { ...s, heard: true };
    case 'keepGuess': {
      if (!s.kind) return s;
      return { ...s, check: { status: 'kept', value: NARRATIONS[s.kind].guess[a.locale] }, draft: null, confirmed: false };
    }
    case 'fixGuess': {
      const value = a.value.replace(/\s+/g, ' ').trim().slice(0, MAX_FIX);
      if (!value || !s.kind) return s;
      return { ...s, check: { status: 'fixed', value }, draft: null, confirmed: false };
    }
    case 'toDraft': {
      if (!canEnter(s, 'draft') || !s.kind) return s;
      if (s.draft) return { ...s, step: 'draft' };
      const n = NARRATIONS[s.kind];
      const draft: DemoDraft = {
        title: n.draft.title[a.locale],
        body: fillDraft(n.draft.body[a.locale], s.check.value),
        narratorName: a.narratorName.slice(0, MAX_NAME),
      };
      return { ...s, step: 'draft', draft };
    }
    case 'editDraft':
      if (!s.draft) return s;
      return { ...s, draft: { ...s.draft, ...a.patch }, confirmed: false };
    case 'toConfirm':
      return canEnter(s, 'confirm') ? { ...s, step: 'confirm' } : s;
    case 'confirm':
      if (s.step !== 'confirm') return s;
      return a.ok ? { ...s, confirmed: true, step: 'scope' } : { ...s, confirmed: false, step: 'draft' };
    case 'chooseScope':
      return SCOPES.includes(a.scope) ? { ...s, scope: a.scope } : s;
    case 'save': {
      if (!canEnter(s, 'scope') || !s.scope || !s.draft || !s.kind || !s.topic) return s;
      const d = s.draft;
      const saved: SavedStory = { title: d.title.trim(), body: d.body.trim(), narratorName: d.narratorName.trim(), kind: s.kind, topic: s.topic, scope: s.scope };
      return { ...s, saved, step: 'vault' };
    }
    case 'openStory': {
      const next = { ...s, openId: a.id };
      return canEnter(next, 'story') ? { ...next, step: 'story' } : s;
    }
    case 'openBook':
      return { ...s, step: 'book' };
    case 'goto':
      return canEnter(s, a.step) ? { ...s, step: a.step } : s;
    case 'reset':
      return initialState();
  }
}

/** The step "Quay lại" goes to. */
export function previousStep(step: Step): Step {
  if (step === 'story' || step === 'book') return 'vault';
  const i = journeyIndex(step);
  return i > 0 ? JOURNEY[i - 1]! : 'topic';
}

// ---------------------------------------------------------------------------
// Persistence (sessionStorage; every access may throw in private mode or when storage is blocked)
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'lh.demo.v1';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function sessionStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length <= max ? v : null);

/** Parses stored state; anything malformed falls back to a fresh start (never throws). */
export function parseState(raw: string | null): DemoState {
  if (!raw) return initialState();
  try {
    const o = JSON.parse(raw) as Partial<DemoState>;
    if (!o || o.v !== 1 || !STEPS.includes(o.step as Step)) return initialState();
    const kind = o.kind === 'memory' || o.kind === 'experience' ? o.kind : null;
    const topic = typeof o.topic === 'string' && isValidTopic(o.topic) ? o.topic : null;
    const checkStatus = o.check && ['pending', 'kept', 'fixed'].includes(o.check.status) ? o.check.status : 'pending';
    const checkValue = str(o.check?.value, MAX_FIX) ?? '';
    const draft = o.draft && str(o.draft.title, MAX_TITLE * 2) !== null && str(o.draft.body, MAX_BODY * 2) !== null && str(o.draft.narratorName, MAX_NAME * 2) !== null
      ? { title: o.draft.title, body: o.draft.body, narratorName: o.draft.narratorName }
      : null;
    const scope = SCOPES.includes(o.scope as Scope) ? (o.scope as Scope) : null;
    const sv = o.saved;
    const saved: SavedStory | null =
      sv && str(sv.title, MAX_TITLE * 2) !== null && str(sv.body, MAX_BODY * 2) !== null && str(sv.narratorName, MAX_NAME * 2) !== null &&
      (sv.kind === 'memory' || sv.kind === 'experience') && isValidTopic(sv.topic) && SCOPES.includes(sv.scope)
        ? { title: sv.title, body: sv.body, narratorName: sv.narratorName, kind: sv.kind, topic: sv.topic, scope: sv.scope }
        : null;
    const s: DemoState = {
      v: 1,
      step: o.step as Step,
      topic,
      kind,
      heard: o.heard === true,
      check: { status: checkValue || checkStatus === 'pending' ? checkStatus : 'pending', value: checkValue },
      draft,
      confirmed: o.confirmed === true,
      scope,
      saved,
      openId: typeof o.openId === 'string' && o.openId.length <= 80 ? o.openId : null,
    };
    // A restored step must still be reachable; otherwise go back to the start of the journey.
    return canEnter(s, s.step) ? s : { ...s, step: 'topic' };
  } catch {
    return initialState();
  }
}

export function loadState(store: KeyValueStore | null = sessionStore()): DemoState {
  try {
    return parseState(store?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return initialState();
  }
}

export function saveState(s: DemoState, store: KeyValueStore | null = sessionStore()): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the walkthrough still works for this visit */
  }
}

export function clearState(store: KeyValueStore | null = sessionStore()): void {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Where the visitor's own story shows up, by scope (approval is never publication). */
export function statusOfScope(scope: Scope): 'private' | 'invited' | 'requested' {
  return scope === 'publish' ? 'requested' : scope;
}
