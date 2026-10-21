import { describe, expect, it } from 'vitest';
import { hasRecordingConsent, markHowToSeen, markRecordingConsent, readAutoRead, shouldShowHowTo, writeAutoRead, type KeyValueStore } from './prefs';
import { keptKey } from './summary';

function memory(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

const broken: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('storytelling prefs', () => {
  it('auto-read is off by default and remembered', () => {
    const s = memory();
    expect(readAutoRead(s)).toBe(false);
    writeAutoRead(true, s);
    expect(readAutoRead(s)).toBe(true);
    writeAutoRead(false, s);
    expect(readAutoRead(s)).toBe(false);
  });

  it('the how-to guide shows until dismissed once', () => {
    const s = memory();
    expect(shouldShowHowTo(s)).toBe(true);
    markHowToSeen(s);
    expect(shouldShowHowTo(s)).toBe(false);
  });

  it('survives blocked storage', () => {
    expect(readAutoRead(broken)).toBe(false);
    expect(shouldShowHowTo(broken)).toBe(true);
    expect(() => writeAutoRead(true, broken)).not.toThrow();
    expect(() => markHowToSeen(broken)).not.toThrow();
    expect(readAutoRead(null)).toBe(false);
  });
});

describe('session summary', () => {
  it('picks the right sentence for the kept count', () => {
    expect(keptKey(0)).toBe('end.keptNone');
    expect(keptKey(1)).toBe('end.keptOne');
    expect(keptKey(4)).toBe('end.keptMany');
  });
});

describe('recording consent', () => {
  it('is asked until accepted once, and never throws on blocked storage', () => {
    const store = memory();
    expect(hasRecordingConsent(store)).toBe(false);
    markRecordingConsent(store);
    expect(hasRecordingConsent(store)).toBe(true);
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(hasRecordingConsent(broken)).toBe(false);
    expect(() => markRecordingConsent(broken)).not.toThrow();
  });
});
