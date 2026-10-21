import { describe, expect, it } from 'vitest';
import { fillDraft, NARRATIONS, VAULT_SAMPLES, publicItemOf, DEMO_NARRATORS } from './data';
import {
  canEnter,
  clearState,
  initialState,
  loadState,
  parseState,
  previousStep,
  reducer,
  saveState,
  STORAGE_KEY,
  statusOfScope,
  type DemoAction,
  type DemoState,
  type KeyValueStore,
} from './state';

const run = (actions: DemoAction[], from: DemoState = initialState()) => actions.reduce(reducer, from);

const toScope: DemoAction[] = [
  { type: 'chooseTopic', topic: 'mon-an' },
  { type: 'chooseKind', kind: 'memory' },
  { type: 'start' },
  { type: 'heard' },
  { type: 'goto', step: 'transcript' },
  { type: 'fixGuess', value: '  Sáu  ' },
  { type: 'toDraft', locale: 'vi', narratorName: 'Bà Năm' },
  { type: 'toConfirm' },
  { type: 'confirm', ok: true },
];

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('demo reducer', () => {
  it('cannot start without a topic and a kind', () => {
    expect(run([{ type: 'start' }]).step).toBe('topic');
    expect(run([{ type: 'chooseTopic', topic: 'not-a-topic' }, { type: 'start' }]).step).toBe('topic');
  });

  it('suggests a kind from the topic, and "Chưa biết kể gì" is a memory', () => {
    expect(run([{ type: 'chooseTopic', topic: 'lam-vuon' }]).kind).toBe('experience');
    expect(run([{ type: 'chooseTopic', topic: 'unsure' }]).kind).toBe('memory');
    expect(run([{ type: 'chooseKind', kind: 'experience' }, { type: 'chooseTopic', topic: 'tuoi-tho' }]).kind).toBe('experience');
  });

  it('needs the uncertain words checked before the draft', () => {
    const s = run([{ type: 'chooseTopic', topic: 'mon-an' }, { type: 'start' }, { type: 'toDraft', locale: 'vi', narratorName: 'Bà Năm' }]);
    expect(s.step).toBe('listen');
    expect(s.draft).toBeNull();
  });

  it('builds the draft with the corrected words, in the chosen language', () => {
    const s = run(toScope.slice(0, 7));
    expect(s.step).toBe('draft');
    expect(s.check).toEqual({ status: 'fixed', value: 'Sáu' });
    expect(s.draft?.body).toContain('dì Sáu');
    expect(s.draft?.body).not.toContain('{fix}');
    expect(s.draft?.narratorName).toBe('Bà Năm');
  });

  it('"Giữ nguyên" keeps the simulated guess', () => {
    const s = run([{ type: 'chooseTopic', topic: 'lam-vuon' }, { type: 'start' }, { type: 'keepGuess', locale: 'en' }, { type: 'toDraft', locale: 'en', narratorName: 'Mr. Tư' }]);
    expect(s.check.status).toBe('kept');
    expect(s.draft?.body).toContain('a few days earlier');
  });

  it('ignores an empty correction', () => {
    const s = run([{ type: 'chooseTopic', topic: 'mon-an' }, { type: 'fixGuess', value: '   ' }]);
    expect(s.check.status).toBe('pending');
  });

  it('blocks confirmation while the draft has an empty title', () => {
    const s = run([...toScope.slice(0, 7), { type: 'editDraft', patch: { title: '  ' } }, { type: 'toConfirm' }]);
    expect(s.step).toBe('draft');
  });

  it('"Chưa đúng" goes back to the draft; editing un-confirms', () => {
    const no = run([...toScope.slice(0, 8), { type: 'confirm', ok: false }]);
    expect(no.step).toBe('draft');
    expect(no.confirmed).toBe(false);
    const edited = run([...toScope, { type: 'editDraft', patch: { title: 'Khác' } }]);
    expect(edited.confirmed).toBe(false);
    expect(canEnter(edited, 'scope')).toBe(false);
  });

  it('saves only with a confirmed draft and a scope', () => {
    expect(run([...toScope, { type: 'save' }]).saved).toBeNull();
    const s = run([...toScope, { type: 'chooseScope', scope: 'publish' }, { type: 'save' }]);
    expect(s.step).toBe('vault');
    expect(s.saved).toMatchObject({ scope: 'publish', kind: 'memory', topic: 'mon-an', narratorName: 'Bà Năm' });
    expect(statusOfScope('publish')).toBe('requested');
    expect(statusOfScope('private')).toBe('private');
  });

  it('changing the kind drops the downstream work', () => {
    const s = run([...toScope, { type: 'chooseKind', kind: 'experience' }]);
    expect(s.draft).toBeNull();
    expect(s.check.status).toBe('pending');
    expect(s.confirmed).toBe(false);
  });

  it('opens stories, the book and refuses unknown own story', () => {
    expect(run([{ type: 'openStory', id: 'mine' }]).step).toBe('topic');
    expect(run([{ type: 'openStory', id: 'demo-ca-kho' }]).step).toBe('story');
    expect(run([{ type: 'openBook' }]).step).toBe('book');
    expect(previousStep('story')).toBe('vault');
    expect(previousStep('draft')).toBe('transcript');
    expect(previousStep('topic')).toBe('topic');
  });

  it('goto refuses steps that are not reachable yet', () => {
    expect(run([{ type: 'goto', step: 'scope' }]).step).toBe('topic');
    expect(run([{ type: 'goto', step: 'vault' }]).step).toBe('vault');
  });

  it('reset returns to a fresh state', () => {
    expect(run([...toScope, { type: 'reset' }])).toEqual(initialState());
  });
});

describe('demo persistence', () => {
  it('round-trips through storage', () => {
    const store = memoryStore();
    const s = run([...toScope, { type: 'chooseScope', scope: 'invited' }, { type: 'save' }]);
    saveState(s, store);
    expect(loadState(store)).toEqual(s);
    clearState(store);
    expect(store.data.has(STORAGE_KEY)).toBe(false);
  });

  it('falls back to a fresh start on bad data and unreachable steps', () => {
    expect(parseState('{not json')).toEqual(initialState());
    expect(parseState(JSON.stringify({ v: 2, step: 'vault' }))).toEqual(initialState());
    expect(parseState(JSON.stringify({ ...initialState(), step: 'scope' })).step).toBe('topic');
  });

  it('never throws when storage is blocked', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadState(broken)).toEqual(initialState());
    expect(() => saveState(initialState(), broken)).not.toThrow();
    expect(() => clearState(broken)).not.toThrow();
  });
});

describe('demo data', () => {
  it('each narration has exactly one uncertain line with a [?] marker and a {fix} in the draft', () => {
    for (const n of Object.values(NARRATIONS)) {
      const flagged = n.lines.filter((l) => l.uncertain);
      expect(flagged).toHaveLength(1);
      expect(flagged[0]!.text.vi).toContain('[?]');
      expect(flagged[0]!.text.en).toContain('[?]');
      expect(n.draft.body.vi).toContain('{fix}');
      expect(n.draft.body.en).toContain('{fix}');
      expect(n.lines.every((l) => l.t < n.duration)).toBe(true);
    }
    expect(fillDraft('a {fix} b', ' x ')).toBe('a x b');
  });

  it('public cards are the hub samples, with the same narrator', () => {
    const pub = VAULT_SAMPLES.filter((s) => s.status === 'public');
    expect(pub.length).toBeGreaterThan(0);
    for (const s of pub) {
      const item = publicItemOf(s);
      expect(item).not.toBeNull();
      expect(item!.narratorLabel.vi).toBe(DEMO_NARRATORS[s.narrator].name.vi);
      expect(item!.topicSlug).toBe(s.topic);
    }
  });

  it('has 3 family stories and 3 experiences covering food, gardening and crafts', () => {
    expect(VAULT_SAMPLES.filter((s) => s.kind === 'story')).toHaveLength(3);
    const exp = VAULT_SAMPLES.filter((s) => s.kind === 'experience');
    expect(exp.map((s) => s.topic).sort()).toEqual(['lam-vuon', 'mon-an', 'nghe-nghiep']);
    expect(new Set(VAULT_SAMPLES.map((s) => s.status))).toEqual(new Set(['draft', 'private', 'invited', 'public']));
  });
});
